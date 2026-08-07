import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ResearchEpisodeResult } from "./researchEpisode.js";
import { ResearchCampaignManifest } from "./researchPlanGenerator.js";
import { ResearchPlanPolicy, sha256File } from "./researchPlanRunner.js";
import {
    fitResearchSelector,
    ResearchSelectorTrainingRow,
    ResearchStructuralDescriptors,
    selectConditionedPolicy,
} from "./researchSelector.js";
import {
    loadCompleteCampaignResults,
    loadOptimizerCampaign,
    terminalMaterialAdvantage,
    trainingSelectionUtility,
} from "./researchStageReducer.js";
import { parseResearchPolicy, researchPolicySha256 } from "./researchPolicy.js";

export const RESEARCH_OPTIMIZER_ARTIFACT_SCHEMA_VERSION = 1 as const;

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is required`);
    }
    return path.resolve(value);
};

const mean = (values: number[]): number => values.reduce((total, value) => total + value, 0) / values.length;

const validateCampaignChain = (
    stage0Path: string,
    stage0: ResearchCampaignManifest,
    stage1Path: string,
    stage1: ResearchCampaignManifest,
    stage2Path: string,
    stage2: ResearchCampaignManifest,
): void => {
    if (stage0.stage !== 0 || stage1.stage !== 1 || stage2.stage !== 2) {
        throw new Error("Optimizer finalization requires stage 0, stage 1, and stage 2 campaigns in order");
    }
    if (
        stage0.optimizerRunIndex !== stage1.optimizerRunIndex ||
        stage0.optimizerRunIndex !== stage2.optimizerRunIndex ||
        stage0.sourceGitCommit !== stage1.sourceGitCommit ||
        stage0.sourceGitCommit !== stage2.sourceGitCommit
    ) {
        throw new Error("Optimizer campaign stages disagree on run index or source commit");
    }
    if (
        stage1.parentCampaignSha256 !== sha256File(stage0Path) ||
        stage2.parentCampaignSha256 !== sha256File(stage1Path) ||
        !stage1.survivorFileSha256 ||
        !stage2.survivorFileSha256
    ) {
        throw new Error("Optimizer parent/survivor commitment chain is incomplete or inconsistent");
    }
    const stage0Families = stage0.selectedFamilies.map(({ familyId }) => familyId);
    const stage1Families = stage1.selectedFamilies.map(({ familyId }) => familyId);
    const stage2Families = stage2.selectedFamilies.map(({ familyId }) => familyId);
    if (
        stage1Families.slice(0, stage0Families.length).join("|") !== stage0Families.join("|") ||
        stage2Families.slice(0, stage1Families.length).join("|") !== stage1Families.join("|") ||
        stage2Families.length !== 22
    ) {
        throw new Error("Optimizer family schedules are not the frozen nested 6/12/22 sequence");
    }
    const isSubset = (children: ResearchPlanPolicy[], parents: ResearchPlanPolicy[]): boolean => {
        const parentIds = new Set(parents.map(({ policyId }) => policyId));
        return children.every(({ policyId }) => parentIds.has(policyId));
    };
    if (stage0.policies.length !== 32 || stage1.policies.length !== 12 || stage2.policies.length !== 6) {
        throw new Error("Optimizer policy schedules are not the frozen 32/12/6 sequence");
    }
    if (!isSubset(stage1.policies, stage0.policies) || !isSubset(stage2.policies, stage1.policies)) {
        throw new Error("Optimizer survivor policies are not nested parent subsets");
    }
    if ([stage0Path, stage1Path, stage2Path].some((value) => !path.isAbsolute(value))) {
        throw new Error("Optimizer campaign paths must be absolute");
    }
};

const parseDescriptors = (familyId: string, value: Record<string, unknown>): ResearchStructuralDescriptors => {
    const area = value.area;
    const width = value.width;
    const height = value.height;
    const startCount = value.startCount;
    if (
        typeof area !== "number" ||
        typeof width !== "number" ||
        typeof height !== "number" ||
        typeof startCount !== "number"
    ) {
        throw new Error(`Training family ${familyId} lacks the frozen structural selector descriptors`);
    }
    return { area, width, height, startCount };
};

const buildTrainingRows = (
    stage2: ResearchCampaignManifest,
    finalists: ResearchPlanPolicy[],
    allResults: ResearchEpisodeResult[],
): ResearchSelectorTrainingRow[] => stage2.selectedFamilies.map((family) => {
    const policyUtilities: Record<string, number> = {};
    for (const { policyId } of finalists) {
        const games = allResults.filter((result) => result.familyId === family.familyId && result.policyId === policyId);
        if (games.length < 2 || games.length % 2 !== 0) {
            throw new Error(`Finalist ${policyId} family ${family.familyId} lacks complete accumulated reciprocal blocks`);
        }
        const slotsBySeed = new Map<number, Set<number>>();
        for (const game of games) {
            const slots = slotsBySeed.get(game.requestedEngineSeed) ?? new Set<number>();
            slots.add(game.candidateSlot);
            slotsBySeed.set(game.requestedEngineSeed, slots);
        }
        if ([...slotsBySeed.values()].some((slots) => slots.size !== 2)) {
            throw new Error(`Finalist ${policyId} family ${family.familyId} has an incomplete reciprocal seed block`);
        }
        policyUtilities[policyId] = mean(games.map(trainingSelectionUtility));
    }
    return {
        familyId: family.familyId,
        descriptors: parseDescriptors(family.familyId, family.descriptors),
        policyUtilities,
    };
});

const resultsCommitment = (results: ResearchEpisodeResult[]): string => {
    const normalized = results.map((result) => ({
        episodeId: result.episodeId,
        familyId: result.familyId,
        policyId: result.policyId,
        requestedEngineSeed: result.requestedEngineSeed,
        candidateSlot: result.candidateSlot,
        candidateScore: result.candidateScore,
        materialAdvantage: terminalMaterialAdvantage(result),
    })).sort((left, right) =>
        left.familyId.localeCompare(right.familyId) ||
        left.policyId.localeCompare(right.policyId) ||
        left.requestedEngineSeed - right.requestedEngineSeed ||
        left.candidateSlot - right.candidateSlot,
    );
    return crypto.createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
};

const main = (): void => {
    const stagePaths = [
        requiredPath("STAGE0_CAMPAIGN"),
        requiredPath("STAGE1_CAMPAIGN"),
        requiredPath("STAGE2_CAMPAIGN"),
    ] as const;
    const resultRoots = [
        requiredPath("STAGE0_RESULTS"),
        requiredPath("STAGE1_RESULTS"),
        requiredPath("STAGE2_RESULTS"),
    ] as const;
    const outputPath = requiredPath("OUT_FILE");
    if (fs.existsSync(outputPath)) {
        throw new Error(`Refusing to overwrite optimizer artifact ${outputPath}`);
    }
    const campaigns = stagePaths.map(loadOptimizerCampaign) as [
        ResearchCampaignManifest,
        ResearchCampaignManifest,
        ResearchCampaignManifest,
    ];
    validateCampaignChain(stagePaths[0], campaigns[0], stagePaths[1], campaigns[1], stagePaths[2], campaigns[2]);
    const stageResults = campaigns.map((campaign, index) =>
        loadCompleteCampaignResults(campaign, resultRoots[index]),
    );
    const finalists = campaigns[2].policies.map((raw, index) => {
        const policy = parseResearchPolicy(raw.policy);
        if (researchPolicySha256(policy) !== raw.policyId) {
            throw new Error(`Finalist policy ${index} fails its canonical hash`);
        }
        return { policyId: raw.policyId, policy };
    });
    const finalistIds = new Set(finalists.map(({ policyId }) => policyId));
    const accumulatedFinalistResults = stageResults.flat().filter(({ policyId }) => finalistIds.has(policyId));
    const trainingRows = buildTrainingRows(campaigns[2], finalists, accumulatedFinalistResults);
    const selector = fitResearchSelector(finalists, trainingRows);
    const conditionedTrainingAssignments = trainingRows.map((row) => ({
        familyId: row.familyId,
        ...selectConditionedPolicy(selector, row.descriptors),
    }));
    const output = {
        schemaVersion: RESEARCH_OPTIMIZER_ARTIFACT_SCHEMA_VERSION,
        optimizerRunIndex: campaigns[0].optimizerRunIndex,
        sourceGitCommit: campaigns[0].sourceGitCommit,
        createdAt: new Date().toISOString(),
        campaignCommitments: stagePaths.map((campaignPath, stage) => ({
            stage,
            campaignPath,
            campaignSha256: sha256File(campaignPath),
            resultsRoot: resultRoots[stage],
        })),
        accumulatedFinalistResultsSha256: resultsCommitment(accumulatedFinalistResults),
        finalists,
        globalPolicyId: selector.globalPolicyId,
        selector,
        trainingRows,
        conditionedTrainingAssignments,
        interpretation:
            "Training-only fitted method artifact. Training fit is not held-out evidence and is not a paper result.",
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outputPath,
        outputSha256: sha256File(outputPath),
        optimizerRunIndex: output.optimizerRunIndex,
        finalistCount: finalists.length,
        globalPolicyId: output.globalPolicyId,
        conditionedTrainingSwitchCount: conditionedTrainingAssignments.filter(({ switchedFromGlobal }) => switchedFromGlobal).length,
    }));
};

const invokedModuleUrl = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invokedModuleUrl) {
    try {
        main();
    } catch (error) {
        console.error(error);
        process.exitCode = 1;
    }
}
