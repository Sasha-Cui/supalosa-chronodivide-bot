import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import {
    LoadedResearchRole,
    loadResearchRole,
    materializeEpisodeSpecs,
    parseResearchRunPlan,
    ResearchRunPlan,
    sha256File,
} from "../training/researchPlanRunner.js";
import {
    DEFAULT_RESEARCH_POLICY,
    ResearchPolicyConfig,
    researchPolicySha256,
} from "../training/researchPolicy.js";
import { validateResearchEpisodeSpec } from "../training/researchEpisode.js";

const ZERO_SHA = "0".repeat(64);
const ZERO_COMMIT = "0".repeat(40);
const ENGINE_SEED_BASE = 1000;
const firstPolicy = DEFAULT_RESEARCH_POLICY;
const secondPolicy: ResearchPolicyConfig = { ...DEFAULT_RESEARCH_POLICY, attackGateMinTick: 5400 };
const firstPolicyId = researchPolicySha256(firstPolicy);
const secondPolicyId = researchPolicySha256(secondPolicy);

const episodesFor = (policyId: string) => [0, 1].map((candidateSlot) => ({
    episodeId: `${policyId.slice(0, 8)}-slot-${candidateSlot}`,
    familyId: "mf_alpha",
    policyId,
    seedBlockIndex: 7,
    requestedEngineSeed: ENGINE_SEED_BASE + 7,
    candidateSlot,
}));

const validPlan = (): Record<string, unknown> => ({
    schemaVersion: 1,
    runId: "unit-test-plan",
    role: "train",
    purpose: "optimizer-search",
    sourceGitCommit: ZERO_COMMIT,
    baselineGitCommit: ZERO_COMMIT,
    baselineRuntimeSha256: ZERO_SHA,
    gameApiRuntimeSha256: ZERO_SHA,
    packageLockSha256: ZERO_SHA,
    roleManifestSha256: ZERO_SHA,
    roleCommitmentSha256: ZERO_SHA,
    splitCommitmentSha256: ZERO_SHA,
    sourcePopulationCommitmentSha256: ZERO_SHA,
    engineSeedBase: ENGINE_SEED_BASE,
    candidateCountry: Countries.IRAQ,
    baselineCountry: Countries.IRAQ,
    maxTicks: 18000,
    policies: [
        { policyId: firstPolicyId, policy: firstPolicy },
        { policyId: secondPolicyId, policy: secondPolicy },
    ],
    episodes: [...episodesFor(firstPolicyId), ...episodesFor(secondPolicyId)],
});

const temporaryDirectories: string[] = [];

afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

describe("strict research run plan", () => {
    test("accepts a shared equal-budget reciprocal schedule", () => {
        const plan = parseResearchRunPlan(validPlan());
        expect(plan.role).toBe("train");
        expect(plan.episodes).toHaveLength(4);
        expect(new Set(plan.episodes.map(({ requestedEngineSeed }) => requestedEngineSeed))).toEqual(new Set([1007]));
    });

    test("rejects sealed roles, map overrides, country changes, and seed drift", () => {
        expect(() => parseResearchRunPlan({ ...validPlan(), role: "test" })).toThrow(/test and reserve are inaccessible/);
        expect(() => parseResearchRunPlan({ ...validPlan(), candidateCountry: Countries.FRANCE })).toThrow(/Arabs mirror/);
        expect(() => parseResearchRunPlan({ ...validPlan(), mapName: "secret.map" })).toThrow(/unexpected=\[mapName\]/);
        const drifted = validPlan();
        const episodes = drifted.episodes as Array<Record<string, unknown>>;
        episodes[0] = { ...episodes[0], requestedEngineSeed: 9999 };
        expect(() => parseResearchRunPlan(drifted)).toThrow(/drifts from engineSeedBase/);
    });

    test("rejects incomplete reciprocal pairs and policy-budget asymmetry", () => {
        const missingSlot = validPlan();
        missingSlot.episodes = (missingSlot.episodes as unknown[]).slice(1);
        expect(() => parseResearchRunPlan(missingSlot)).toThrow(/identical launched-game schedule|reciprocal slots/);

        const asymmetric = validPlan();
        const extra = {
            ...(asymmetric.episodes as Array<Record<string, unknown>>)[0],
            episodeId: "extra-slot-0",
            seedBlockIndex: 8,
            requestedEngineSeed: 1008,
        };
        const extraPair = { ...extra, episodeId: "extra-slot-1", candidateSlot: 1 };
        asymmetric.episodes = [...(asymmetric.episodes as unknown[]), extra, extraPair];
        expect(() => parseResearchRunPlan(asymmetric)).toThrow(/identical launched-game schedule/);
    });

    test("derives maps only from a hash-bound private role artifact", () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), "research-role-test-"));
        temporaryDirectories.push(root);
        const repoRoot = path.join(root, "repo");
        const privateRoleRoot = path.join(root, "private");
        const publicDir = path.join(repoRoot, "research", "artifacts");
        const mapRelativePath = "packages/chronodivide-bot-driver/data/alpha.map";
        fs.mkdirSync(path.join(repoRoot, path.dirname(mapRelativePath)), { recursive: true });
        fs.mkdirSync(privateRoleRoot, { recursive: true });
        fs.mkdirSync(publicDir, { recursive: true });
        const mapPath = path.join(repoRoot, mapRelativePath);
        fs.writeFileSync(mapPath, "committed map bytes");
        const mapSha256 = sha256File(mapPath);
        const roleCommitmentSha256 = "1".repeat(64);
        const splitCommitmentSha256 = "2".repeat(64);
        const sourcePopulationCommitmentSha256 = "3".repeat(64);
        const privateManifest = {
            schemaVersion: 1,
            status: "PRIVATE_FAMILY_ROLE_MANIFEST_NO_POLICY_OUTCOMES",
            role: "train",
            outcomeBlind: true,
            roleCommitmentSha256,
            splitCommitmentSha256,
            sourcePopulationCommitmentSha256,
            targetCount: 1,
            targets: [{
                familyId: "mf_alpha",
                representative: { path: mapRelativePath, sha256: mapSha256 },
                descriptors: { theater: "TEMPERATE", startCount: 2 },
            }],
        };
        const privatePath = path.join(privateRoleRoot, "train-families.json");
        fs.writeFileSync(privatePath, JSON.stringify(privateManifest));
        const roleManifestSha256 = sha256File(privatePath);
        const publicPath = path.join(publicDir, "family_role_commitments_v1.json");
        fs.writeFileSync(publicPath, JSON.stringify({
            status: "FROZEN_FAMILY_ROLE_COMMITMENTS_IDENTITIES_PRIVATE",
            privateArtifacts: { train: { file: "train-families.json", sha256: roleManifestSha256 } },
            roleCommitments: { train: roleCommitmentSha256 },
            splitCommitmentSha256,
            sourcePopulationCommitmentSha256,
        }));
        const rawPlan = validPlan();
        rawPlan.policies = [{ policyId: firstPolicyId, policy: firstPolicy }];
        rawPlan.episodes = episodesFor(firstPolicyId);
        rawPlan.roleManifestSha256 = roleManifestSha256;
        rawPlan.roleCommitmentSha256 = roleCommitmentSha256;
        rawPlan.splitCommitmentSha256 = splitCommitmentSha256;
        rawPlan.sourcePopulationCommitmentSha256 = sourcePopulationCommitmentSha256;
        const plan = parseResearchRunPlan(rawPlan);
        const role = loadResearchRole(plan, { publicCommitmentsPath: publicPath, privateRoleRoot, repoRoot });
        const specs = materializeEpisodeSpecs(plan, role);
        expect(specs.map(({ mapName }) => mapName)).toEqual(["alpha.map", "alpha.map"]);
        expect(specs.every(({ mapSha256: digest }) => digest === mapSha256)).toBe(true);

        const forgedRole: LoadedResearchRole = { ...role, targets: [] };
        expect(() => materializeEpisodeSpecs(plan, forgedRole)).toThrow(/not in the private train manifest/);
    });

    test("episode validation rejects path-bearing map inputs and mismatched policy IDs", () => {
        const plan = parseResearchRunPlan({
            ...validPlan(),
            policies: [{ policyId: firstPolicyId, policy: firstPolicy }],
            episodes: episodesFor(firstPolicyId),
        });
        const role: LoadedResearchRole = {
            role: "train",
            fileSha256: plan.roleManifestSha256,
            roleCommitmentSha256: plan.roleCommitmentSha256,
            splitCommitmentSha256: plan.splitCommitmentSha256,
            sourcePopulationCommitmentSha256: plan.sourcePopulationCommitmentSha256,
            targets: [{
                familyId: "mf_alpha",
                representative: { path: "private/path/alpha.map", sha256: "4".repeat(64) },
                descriptors: {},
            }],
        };
        const spec = materializeEpisodeSpecs(plan, role)[0];
        expect(validateResearchEpisodeSpec(spec).mapName).toBe("alpha.map");
        expect(() => validateResearchEpisodeSpec({ ...spec, mapName: "private/alpha.map" })).toThrow(/basename/);
        expect(() => validateResearchEpisodeSpec({ ...spec, policyId: ZERO_SHA })).toThrow(/canonical policy/);
    });
});
