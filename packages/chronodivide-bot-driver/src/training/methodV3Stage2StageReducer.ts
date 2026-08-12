import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { MethodV3Stage2Campaign } from "./methodV3Stage2PlanGenerator.js";
import { loadMethodV3Stage2Results } from "./methodV3Stage2ResultLoader.js";
import { rankMethodV3Stage2Policies, METHOD_V3_STAGE2_SELECTION_RULE } from "./methodV3Stage2Reducer.js";
import { METHOD_V3_STAGE2_POLICY_COUNTS } from "./methodV3Stage2Schedule.js";
import { validateMethodV3Stage2Campaign } from "./methodV3Stage2TechnicalGate.js";
import { sha256File } from "./researchPlanRunner.js";

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};

const requiredArrayJobId = (): string => {
    const value = process.env.ARRAY_JOB_ID;
    if (!value || !/^\d+$/.test(value)) throw new Error("ARRAY_JOB_ID must be numeric");
    return value;
};

const main = (): void => {
    const campaignPath = requiredPath("CAMPAIGN");
    const gatePath = requiredPath("TECHNICAL_GATE");
    const resultsRoot = requiredPath("RESULTS_ROOT");
    const outputPath = requiredPath("OUT_FILE");
    const arrayJobId = requiredArrayJobId();
    if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite Stage-2 reduction ${outputPath}`);
    const campaign = validateMethodV3Stage2Campaign(JSON.parse(fs.readFileSync(campaignPath, "utf8")));
    if (campaign.stage === 2) throw new Error("Stage 2 is finalized rather than reduced");
    const results = loadMethodV3Stage2Results(
        campaign,
        campaignPath,
        gatePath,
        resultsRoot,
        arrayJobId,
        "method-v3-stage2-complete-stage-reduction",
    );
    const policies = campaign.policies.map(({ policyId, policy }) => ({ policyId, policy }));
    const ranking = rankMethodV3Stage2Policies(policies, results);
    const selectedCount = METHOD_V3_STAGE2_POLICY_COUNTS[(campaign.stage + 1) as 1 | 2];
    const byPolicyId = new Map(policies.map((policy) => [policy.policyId, policy]));
    const selectedPolicies = ranking.slice(0, selectedCount).map(({ policyId }) => {
        const policy = byPolicyId.get(policyId);
        if (!policy) throw new Error(`Ranked policy ${policyId} is absent from the campaign`);
        return policy;
    });
    const normalizedResults = results.map((result) => ({
        episodeId: result.episodeId,
        familyId: result.familyId,
        candidateCountry: result.candidateCountry,
        policyId: result.policyId,
        candidateSlot: result.candidateSlot,
        winner: result.winner,
        ticks: result.ticks,
        candidateBuildings: result.candidate.buildings,
        baselineBuildings: result.baseline.buildings,
    })).sort((left, right) => left.episodeId.localeCompare(right.episodeId));
    const output = {
        schemaVersion: 1,
        status: "PASSED_METHOD_V3_STAGE2_COMPLETE_STAGE_REDUCTION",
        generatedAt: new Date().toISOString(),
        optimizerRunIndex: campaign.optimizerRunIndex,
        completedStage: campaign.stage,
        sourceCampaignPath: campaignPath,
        sourceCampaignSha256: sha256File(campaignPath),
        technicalGatePath: gatePath,
        technicalGateSha256: sha256File(gatePath),
        sourceResultsRoot: resultsRoot,
        arrayJobId,
        resultsCommitmentSha256: crypto.createHash("sha256").update(JSON.stringify(normalizedResults)).digest("hex"),
        selectionRule: METHOD_V3_STAGE2_SELECTION_RULE,
        selectedCount,
        selectedPolicies,
        ranking,
        launchedGameCount: campaign.launchedGameCount,
        completedGameCount: results.length,
        technicalFailureCount: 0,
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({
        outputPath,
        outputSha256: sha256File(outputPath),
        optimizerRunIndex: output.optimizerRunIndex,
        completedStage: output.completedStage,
        selectedCount,
        launchedGameCount: output.launchedGameCount,
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
