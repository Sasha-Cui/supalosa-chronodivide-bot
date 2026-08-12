import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { derivePairedEngineSeed } from "../benchmark/seededOfflineGame.js";
import { buildMethodV3MechanismArms, MethodV3MechanismArm } from "./methodV3MechanismPolicies.js";
import { readGeneratorRole } from "./researchPlanGenerator.js";
import {
    parseResearchRunPlan,
    ResearchPlanEpisode,
    ResearchRunPlan,
    serializeResearchRunPlan,
    sha256File,
    sourceRuntimeCommitmentSha256,
} from "./researchPlanRunner.js";


export const METHOD_V3_STAGE1_ENGINE_SEED_BASE = 3_200_000_000 as const;
export const METHOD_V3_STAGE1_MAX_TICKS = 18_000 as const;
export const METHOD_V3_STAGE1_FAMILY_COUNT = 14 as const;
export const METHOD_V3_COUNTRIES = [
    Countries.USA,
    Countries.KOREA,
    Countries.FRANCE,
    Countries.GERMANY,
    Countries.GREAT_BRITAIN,
    Countries.LIBYA,
    Countries.IRAQ,
    Countries.CUBA,
    Countries.RUSSIA,
] as const;
export const METHOD_V3_STAGE1_SHARD_COUNT = METHOD_V3_STAGE1_FAMILY_COUNT * METHOD_V3_COUNTRIES.length;
export const METHOD_V3_STAGE1_LAUNCH_COUNT = METHOD_V3_STAGE1_SHARD_COUNT * 2 * 9;

export type MethodV3MechanismCampaign = {
    schemaVersion: 1;
    kind: "method-v3-stage1-mechanism-screen";
    status: "FROZEN_OPEN_TRAINING_MECHANISM_SCREEN";
    generatedAt: string;
    sourceGitCommit: string;
    sourceRuntimeSha256: string;
    baselineGitCommit: string;
    baselineRuntimeSha256: string;
    gameApiRuntimeSha256: string;
    packageLockSha256: string;
    roleManifestSha256: string;
    roleCommitmentSha256: string;
    splitCommitmentSha256: string;
    sourcePopulationCommitmentSha256: string;
    outcomeAccess: "open-training-only-no-paper-claim";
    actualWinInvariant: string;
    mapProfilesEnabled: false;
    exactMapTacticsEnabled: false;
    familyCount: number;
    countryCount: number;
    reciprocalSlotCount: number;
    policyCount: number;
    seedBlockCount: number;
    launchedGameCount: number;
    engineSeedBase: number;
    maxTicks: number;
    countries: readonly Countries[];
    rankingRule: string[];
    arms: MethodV3MechanismArm[];
    selectedFamilies: Array<{
        familyId: string;
        representativeSha256: string;
        descriptors: Record<string, unknown>;
    }>;
    shards: Array<{
        shardIndex: number;
        planFile: string;
        planSha256: string;
        runId: string;
        familyId: string;
        country: Countries;
        seedBlockIndex: number;
        requestedEngineSeed: number;
        launchedGameCount: number;
    }>;
};

export const buildMethodV3MechanismEpisodes = (
    familyId: string,
    seedBlockIndex: number,
    requestedEngineSeed: number,
): ResearchPlanEpisode[] =>
    buildMethodV3MechanismArms().flatMap((arm, armIndex) => ([0, 1] as const).map((candidateSlot) => ({
        episodeId: `a${armIndex}-b${seedBlockIndex}-s${candidateSlot}`,
        familyId,
        policyId: arm.policyId,
        methodId: arm.policyId,
        seedBlockIndex,
        requestedEngineSeed,
        candidateSlot,
    })));

const gitRoot = (): string => execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();

const requiredPath = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return path.resolve(value);
};

const main = async (): Promise<void> => {
    const repoRoot = gitRoot();
    const driverRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver");
    if (path.resolve(process.cwd()) !== driverRoot) {
        throw new Error(`Method-v3 mechanism plan generator must start in ${driverRoot}`);
    }
    if (!process.env.BASELINE_PACKAGE_ROOT || process.env.REQUIRE_EXTERNAL_BASELINE !== "true") {
        throw new Error("Set BASELINE_PACKAGE_ROOT and REQUIRE_EXTERNAL_BASELINE=true before plan generation");
    }
    const privateRoleRoot = requiredPath("RESEARCH_PRIVATE_ROLE_ROOT");
    const outRoot = requiredPath("OUT_ROOT");
    if (fs.existsSync(outRoot)) throw new Error(`Refusing to reuse existing OUT_ROOT ${outRoot}`);

    const role = readGeneratorRole(repoRoot, privateRoleRoot);
    if (role.targets.length !== METHOD_V3_STAGE1_FAMILY_COUNT) {
        throw new Error(`Method-v3 Stage 1 requires exactly ${METHOD_V3_STAGE1_FAMILY_COUNT} opened train families`);
    }
    const arms = buildMethodV3MechanismArms();
    const policies = arms.map(({ policyId, policy }) => ({ policyId, policy }));
    const baselineFactory = await loadBaselineFactory(path.join(repoRoot, "packages", "chronodivide-bot"));
    const generationManifest = createExperimentManifest({
        runId: "plan-method-v3-stage1-mechanism",
        mixDir: path.join(driverRoot, "data"),
        maps: [],
        effectiveConfig: {
            purpose: "method-v3-mechanism-screen",
            outcomeAccess: false,
            familyCount: METHOD_V3_STAGE1_FAMILY_COUNT,
            countries: METHOD_V3_COUNTRIES,
            reciprocalSlots: [0, 1],
            policyCount: policies.length,
            maxTicks: METHOD_V3_STAGE1_MAX_TICKS,
        },
        baseline: baselineFactory.descriptor,
        gameSeedBase: METHOD_V3_STAGE1_ENGINE_SEED_BASE,
    });
    if (
        generationManifest.source.gitBranch !== "main" ||
        generationManifest.source.trackedDirty !== false ||
        !generationManifest.source.gitCommit
    ) {
        throw new Error("Method-v3 plan generation requires a clean main-branch checkout");
    }
    if (
        generationManifest.software.baseline.kind !== "external-package" ||
        generationManifest.software.baseline.trackedDirty !== false ||
        !generationManifest.software.baseline.gitCommit ||
        !generationManifest.software.baseline.runtimeTree.sha256 ||
        !generationManifest.software.gameApiRuntimeTree.sha256 ||
        !generationManifest.software.packageLockSha256
    ) {
        throw new Error("Method-v3 plan generation could not bind the clean external baseline");
    }

    fs.mkdirSync(outRoot, { recursive: false, mode: 0o700 });
    const plansRoot = path.join(outRoot, "plans");
    fs.mkdirSync(plansRoot, { mode: 0o700 });
    const sourceShort = generationManifest.source.gitCommit.slice(0, 10);
    const shards: Array<{
        shardIndex: number;
        planFile: string;
        planSha256: string;
        runId: string;
        familyId: string;
        country: Countries;
        seedBlockIndex: number;
        requestedEngineSeed: number;
        launchedGameCount: number;
    }> = [];
    for (let familyIndex = 0; familyIndex < role.targets.length; familyIndex++) {
        const target = role.targets[familyIndex];
        for (let countryIndex = 0; countryIndex < METHOD_V3_COUNTRIES.length; countryIndex++) {
            const country = METHOD_V3_COUNTRIES[countryIndex];
            const shardIndex = familyIndex * METHOD_V3_COUNTRIES.length + countryIndex;
            const seedBlockIndex = shardIndex;
            const requestedEngineSeed = derivePairedEngineSeed(METHOD_V3_STAGE1_ENGINE_SEED_BASE, seedBlockIndex);
            const runId = `method-v3-stage1-f${familyIndex}-c${countryIndex}-${sourceShort}`;
            const episodes = buildMethodV3MechanismEpisodes(target.familyId, seedBlockIndex, requestedEngineSeed);
            const plan: ResearchRunPlan = parseResearchRunPlan({
                schemaVersion: 1,
                runId,
                role: "train",
                purpose: "method-v3-mechanism-screen",
                sourceGitCommit: generationManifest.source.gitCommit,
                sourceRuntimeSha256: sourceRuntimeCommitmentSha256(generationManifest.source.runtimeTrees),
                baselineGitCommit: generationManifest.software.baseline.gitCommit,
                baselineRuntimeSha256: generationManifest.software.baseline.runtimeTree.sha256,
                gameApiRuntimeSha256: generationManifest.software.gameApiRuntimeTree.sha256,
                packageLockSha256: generationManifest.software.packageLockSha256,
                roleManifestSha256: role.fileSha256,
                roleCommitmentSha256: role.roleCommitmentSha256,
                splitCommitmentSha256: role.splitCommitmentSha256,
                sourcePopulationCommitmentSha256: role.sourcePopulationCommitmentSha256,
                engineSeedBase: METHOD_V3_STAGE1_ENGINE_SEED_BASE,
                candidateCountry: country,
                baselineCountry: country,
                maxTicks: METHOD_V3_STAGE1_MAX_TICKS,
                policies,
                episodes,
            });
            const planFile = path.join(plansRoot, `shard-${String(shardIndex).padStart(3, "0")}.json`);
            fs.writeFileSync(planFile, serializeResearchRunPlan(plan), { flag: "wx", mode: 0o600 });
            shards.push({
                shardIndex,
                planFile,
                planSha256: sha256File(planFile),
                runId,
                familyId: target.familyId,
                country,
                seedBlockIndex,
                requestedEngineSeed,
                launchedGameCount: episodes.length,
            });
        }
    }
    const campaign: MethodV3MechanismCampaign = {
        schemaVersion: 1,
        kind: "method-v3-stage1-mechanism-screen",
        status: "FROZEN_OPEN_TRAINING_MECHANISM_SCREEN",
        generatedAt: new Date().toISOString(),
        sourceGitCommit: generationManifest.source.gitCommit,
        sourceRuntimeSha256: sourceRuntimeCommitmentSha256(generationManifest.source.runtimeTrees),
        baselineGitCommit: generationManifest.software.baseline.gitCommit,
        baselineRuntimeSha256: generationManifest.software.baseline.runtimeTree.sha256 as string,
        gameApiRuntimeSha256: generationManifest.software.gameApiRuntimeTree.sha256 as string,
        packageLockSha256: generationManifest.software.packageLockSha256 as string,
        roleManifestSha256: role.fileSha256,
        roleCommitmentSha256: role.roleCommitmentSha256,
        splitCommitmentSha256: role.splitCommitmentSha256,
        sourcePopulationCommitmentSha256: role.sourcePopulationCommitmentSha256,
        outcomeAccess: "open-training-only-no-paper-claim",
        actualWinInvariant: "shortGame engine defeat and zero terminal enemy buildings",
        mapProfilesEnabled: false,
        exactMapTacticsEnabled: false,
        familyCount: role.targets.length,
        countryCount: METHOD_V3_COUNTRIES.length,
        reciprocalSlotCount: 2,
        policyCount: policies.length,
        seedBlockCount: shards.length,
        launchedGameCount: shards.reduce((total, shard) => total + shard.launchedGameCount, 0),
        engineSeedBase: METHOD_V3_STAGE1_ENGINE_SEED_BASE,
        maxTicks: METHOD_V3_STAGE1_MAX_TICKS,
        countries: METHOD_V3_COUNTRIES,
        rankingRule: [
            "equal-family-country actual win probability descending",
            "equal-family-country win-minus-loss margin descending",
            "mean of the worst ten percent family-country win probabilities descending",
            "equal-family-country draw probability ascending",
            "median tick among actual wins ascending",
            "canonical policy SHA-256 ascending",
        ],
        arms,
        selectedFamilies: role.targets.map((target) => ({
            familyId: target.familyId,
            representativeSha256: target.representative.sha256,
            descriptors: target.descriptors,
        })),
        shards,
    };
    const campaignPath = path.join(outRoot, "campaign.json");
    fs.writeFileSync(campaignPath, JSON.stringify(campaign, null, 2), { flag: "wx", mode: 0o600 });
    fs.writeFileSync(path.join(outRoot, "plan-files.txt"), `${shards.map(({ planFile }) => planFile).join("\n")}\n`, {
        flag: "wx",
        mode: 0o600,
    });
    console.log(JSON.stringify({
        campaignPath,
        campaignSha256: sha256File(campaignPath),
        policyCount: policies.length,
        familyCount: role.targets.length,
        countryCount: METHOD_V3_COUNTRIES.length,
        shardCount: shards.length,
        launchedGameCount: campaign.launchedGameCount,
    }));
};

const invokedModuleUrl = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (import.meta.url === invokedModuleUrl) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
