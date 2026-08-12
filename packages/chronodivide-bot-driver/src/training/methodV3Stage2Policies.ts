import crypto from "node:crypto";
import {
    MethodV3PolicyConfig,
    MethodV3Stage2PolicyConfig,
    parseResearchPolicy,
    projectMethodV3PolicyToStage2,
    researchPolicySha256,
} from "./researchPolicy.js";

export const METHOD_V3_STAGE2_POLICY_COUNT = 24 as const;

type MethodV3Stage2SearchKey =
    | "buildingEliminationMinTick"
    | "buildingEliminationMinCombatants"
    | "buildingEliminationCombatantAdvantage"
    | "buildingEliminationMaxEnemyCombatants"
    | "buildingEliminationReserveCombatants"
    | "buildingEliminationOrderIntervalTicks"
    | "buildingEliminationMaxTargetGroups"
    | "buildingEliminationTargetPriority"
    | "buildingEliminationPreemptExistingAttacks"
    | "buildingEliminationCapabilityAwareAttackers"
    | "buildingEliminationReachabilityAwareTargets"
    | "buildingEliminationStallTicks"
    | "buildingEliminationReassignStalledTargets"
    | "rushSellEnabled"
    | "finisherArtilleryTargetCount"
    | "finisherArtilleryStartTick"
    | "finisherArtilleryPriority"
    | "finisherArtilleryTechLeadTicks"
    | "buildingEliminationAdaptiveAirTargetCount"
    | "buildingEliminationAdaptiveNavalTargetCount"
    | "allInMinTick"
    | "allInMinCombatants"
    | "allInCombatantAdvantage"
    | "allInDisbandExistingAttacks";

export const METHOD_V3_STAGE2_SEARCH_SPACE: {
    [K in MethodV3Stage2SearchKey]: readonly MethodV3Stage2PolicyConfig[K][];
} = {
    buildingEliminationMinTick: [7_200, 8_400, 9_000, 10_200, 10_800, 12_000],
    buildingEliminationMinCombatants: [6, 8, 10, 12, 16, 20],
    buildingEliminationCombatantAdvantage: [-8, -4, 0, 4, 8],
    buildingEliminationMaxEnemyCombatants: [2, 4, 6, 10, 999],
    buildingEliminationReserveCombatants: [0, 2, 4, 6, 8],
    buildingEliminationOrderIntervalTicks: [6, 12, 15, 24, 36],
    buildingEliminationMaxTargetGroups: [1, 2, 3, 4, 6],
    buildingEliminationTargetPriority: ["production", "defense", "nearest"],
    buildingEliminationPreemptExistingAttacks: [false, true],
    buildingEliminationCapabilityAwareAttackers: [false, true],
    buildingEliminationReachabilityAwareTargets: [false, true],
    buildingEliminationStallTicks: [300, 600, 900, 1_200],
    buildingEliminationReassignStalledTargets: [false, true],
    rushSellEnabled: [false, true],
    finisherArtilleryTargetCount: [0, 2, 4, 6, 8],
    finisherArtilleryStartTick: [8_400, 9_600, 10_800, 12_000, 13_200],
    finisherArtilleryPriority: [110, 125, 140, 155],
    finisherArtilleryTechLeadTicks: [1_800, 2_700, 3_600, 4_500],
    buildingEliminationAdaptiveAirTargetCount: [0, 2, 4, 6],
    buildingEliminationAdaptiveNavalTargetCount: [0, 2, 4],
    allInMinTick: [9_000, 10_800, 12_600, 14_400],
    allInMinCombatants: [6, 8, 10, 12, 16],
    allInCombatantAdvantage: [-8, -4, 0, 4, 8],
    allInDisbandExistingAttacks: [false, true],
};

const FINISHER_MECHANISM_KEYS = new Set<keyof MethodV3Stage2PolicyConfig>([
    "buildingEliminationCapabilityAwareAttackers",
    "buildingEliminationReachabilityAwareTargets",
    "buildingEliminationReassignStalledTargets",
    "finisherArtilleryTargetCount",
    "buildingEliminationAdaptiveAirTargetCount",
    "buildingEliminationAdaptiveNavalTargetCount",
]);

const digest = (...parts: Array<string | number>): Buffer =>
    crypto.createHash("sha256").update(parts.join("\0")).digest();

const deterministicIndex = (upperBound: number, ...parts: Array<string | number>): number => {
    if (!Number.isSafeInteger(upperBound) || upperBound <= 0) throw new Error("upperBound must be positive");
    return digest("chrono-divide-method-v3-stage2-policy-v1", ...parts).readUInt32BE(0) % upperBound;
};

const deterministicRank = (domain: string, runIndex: number, candidateIndex: number, value: string): string =>
    digest("chrono-divide-method-v3-stage2-policy-v1", domain, runIndex, candidateIndex, value).toString("hex");

const setAlternative = (
    record: Record<string, unknown>,
    key: keyof typeof METHOD_V3_STAGE2_SEARCH_SPACE,
    runIndex: number,
    candidateIndex: number,
    nonce: number,
): void => {
    const values = METHOD_V3_STAGE2_SEARCH_SPACE[key] as readonly unknown[];
    const alternatives = values.filter((value) => value !== record[key]);
    record[key] = alternatives[deterministicIndex(alternatives.length, "choice", runIndex, candidateIndex, nonce, key)];
};

const buildAnchor = (
    base: MethodV3Stage2PolicyConfig,
    candidateIndex: number,
): MethodV3Stage2PolicyConfig | null => {
    if (candidateIndex < 1 || candidateIndex > 8) return null;
    const policy: MethodV3Stage2PolicyConfig = { ...base };
    policy.buildingEliminationEnabled = true;
    if (candidateIndex === 1) {
        policy.buildingEliminationMinTick = base.buildingEliminationMinTick === 7_200 ? 8_400 : 7_200;
    }
    if (candidateIndex === 2) {
        policy.buildingEliminationReserveCombatants = base.buildingEliminationReserveCombatants === 0 ? 2 : 0;
    }
    if (candidateIndex === 3) {
        policy.buildingEliminationPreemptExistingAttacks = !base.buildingEliminationPreemptExistingAttacks;
    }
    if (candidateIndex === 4) {
        policy.buildingEliminationTargetPriority =
            base.buildingEliminationTargetPriority === "nearest" ? "production" : "nearest";
    }
    if (candidateIndex === 5) {
        policy.buildingEliminationTargetPriority =
            base.buildingEliminationTargetPriority === "defense" ? "production" : "defense";
    }
    if (candidateIndex === 6) policy.buildingEliminationCapabilityAwareAttackers = true;
    if (candidateIndex === 7) policy.buildingEliminationReachabilityAwareTargets = true;
    if (candidateIndex === 8) policy.buildingEliminationReassignStalledTargets = true;
    return parseResearchPolicy(policy) as MethodV3Stage2PolicyConfig;
};

const mutateCandidate = (
    base: MethodV3Stage2PolicyConfig,
    runIndex: number,
    candidateIndex: number,
    nonce: number,
): MethodV3Stage2PolicyConfig => {
    const record = { ...base } as unknown as Record<string, unknown>;
    const keys = (Object.keys(METHOD_V3_STAGE2_SEARCH_SPACE) as Array<keyof typeof METHOD_V3_STAGE2_SEARCH_SPACE>)
        .sort((left, right) => deterministicRank("field", runIndex, candidateIndex, String(left)).localeCompare(
            deterministicRank("field", runIndex, candidateIndex, String(right)),
        ));
    const mutationCount = 4 + deterministicIndex(6, "mutation-count", runIndex, candidateIndex, nonce);
    const selected = keys.slice(0, mutationCount);
    if (!selected.some((key) => FINISHER_MECHANISM_KEYS.has(key))) {
        const mechanismKeys = keys.filter((key) => FINISHER_MECHANISM_KEYS.has(key));
        selected[selected.length - 1] = mechanismKeys[deterministicIndex(
            mechanismKeys.length,
            "mechanism",
            runIndex,
            candidateIndex,
            nonce,
        )];
    }
    for (const key of new Set(selected)) setAlternative(record, key, runIndex, candidateIndex, nonce);
    record.buildingEliminationEnabled = true;
    return parseResearchPolicy(record) as MethodV3Stage2PolicyConfig;
};

export const generateMethodV3Stage2Policies = (
    optimizerRunIndex: number,
    selectedStage1Policy: MethodV3PolicyConfig,
): Array<{ policyId: string; policy: MethodV3Stage2PolicyConfig }> => {
    if (!Number.isSafeInteger(optimizerRunIndex) || optimizerRunIndex < 0 || optimizerRunIndex > 4) {
        throw new Error("optimizerRunIndex must be an integer in [0, 4]");
    }
    const base = projectMethodV3PolicyToStage2(selectedStage1Policy);
    const result: Array<{ policyId: string; policy: MethodV3Stage2PolicyConfig }> = [];
    const seen = new Set<string>();
    for (let candidateIndex = 0; candidateIndex < METHOD_V3_STAGE2_POLICY_COUNT; candidateIndex++) {
        let nonce = 0;
        while (true) {
            const policy =
                candidateIndex === 0
                    ? base
                    : buildAnchor(base, candidateIndex) ??
                      mutateCandidate(base, optimizerRunIndex, candidateIndex, nonce);
            const policyId = researchPolicySha256(policy);
            if (!seen.has(policyId)) {
                seen.add(policyId);
                result.push({ policyId, policy });
                break;
            }
            if (candidateIndex <= 8 || ++nonce > 10_000) {
                throw new Error(`Could not generate unique Stage-2 policy ${candidateIndex}`);
            }
        }
    }
    return result;
};
