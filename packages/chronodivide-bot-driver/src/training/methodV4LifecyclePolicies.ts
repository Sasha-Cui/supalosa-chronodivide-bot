import {
    METHOD_V3_STARTING_POLICY,
    MethodV4PolicyConfig,
    parseResearchPolicy,
    projectMethodV3PolicyToStage2,
    projectMethodV3Stage2PolicyToV4,
    researchPolicySha256,
} from "./researchPolicy.js";

export const METHOD_V4_REFERENCE_V3_POLICY_ID =
    "8dd5d2163b9440fb4803f984539eb66b138694d6a577230d5f4a3b2d467d07af" as const;

export const METHOD_V4_LIFECYCLE_ARM_ORDER = [
    "v3_reference",
    "baseline_control",
    "baseline_balanced",
    "baseline_early",
    "baseline_late",
    "baseline_homeguard",
    "baseline_minimal_reserve",
    "baseline_rapid_orders",
    "baseline_nearest",
    "baseline_defense",
    "baseline_focus",
    "baseline_parallel",
] as const;

export type MethodV4LifecycleArmId = typeof METHOD_V4_LIFECYCLE_ARM_ORDER[number];

export type MethodV4LifecycleArm = {
    armId: MethodV4LifecycleArmId;
    policyId: string;
    policy: MethodV4PolicyConfig;
};

const methodV3Reference = () => {
    const policy = {
        ...projectMethodV3PolicyToStage2(METHOD_V3_STARTING_POLICY),
        allInCombatantAdvantage: 4,
        finisherArtilleryStartTick: 10_800,
        finisherArtilleryTechLeadTicks: 1_800,
        buildingEliminationEnabled: true,
        buildingEliminationMinCombatants: 10,
        buildingEliminationReserveCombatants: 2,
        buildingEliminationTargetPriority: "nearest" as const,
        buildingEliminationPreemptExistingAttacks: false,
        buildingEliminationSweepWhenNoTargets: false,
        buildingEliminationReachabilityAwareTargets: true,
        buildingEliminationAdaptiveNavalTargetCount: 2,
    };
    if (researchPolicySha256(policy) !== METHOD_V4_REFERENCE_V3_POLICY_ID) {
        throw new Error("Method-v4 reference no longer reconstructs the frozen best Method-v3 policy");
    }
    return policy;
};

const baselinePolicy = (overrides: Partial<MethodV4PolicyConfig> = {}): MethodV4PolicyConfig =>
    parseResearchPolicy({
        ...projectMethodV3Stage2PolicyToV4(methodV3Reference(), true),
        strategicPlan: "off",
        allInEnabled: false,
        forceAttackEnabled: false,
        staticDefenseEnabled: false,
        rushSellEnabled: false,
        finisherArtilleryTargetCount: 0,
        buildingEliminationEnabled: true,
        buildingEliminationMinTick: 7_200,
        buildingEliminationMinCombatants: 8,
        buildingEliminationCombatantAdvantage: 0,
        buildingEliminationMaxEnemyCombatants: 999,
        buildingEliminationReserveCombatants: 4,
        buildingEliminationOrderIntervalTicks: 12,
        buildingEliminationMaxTargetGroups: 4,
        buildingEliminationTargetPriority: "production",
        buildingEliminationObservationMode: "publicApi",
        buildingEliminationDirectVisibleAttack: true,
        buildingEliminationPreemptExistingAttacks: true,
        buildingEliminationSweepWhenNoTargets: true,
        buildingEliminationSweepRevisitTicks: 600,
        buildingEliminationCapabilityAwareAttackers: true,
        buildingEliminationReachabilityAwareTargets: true,
        buildingEliminationStallTicks: 600,
        buildingEliminationReassignStalledTargets: true,
        buildingEliminationAdaptiveAirTargetCount: 0,
        buildingEliminationAdaptiveNavalTargetCount: 0,
        ...overrides,
    }) as MethodV4PolicyConfig;

export const buildMethodV4LifecycleArms = (): MethodV4LifecycleArm[] => {
    const candidates: Array<{ armId: MethodV4LifecycleArmId; policy: MethodV4PolicyConfig }> = [
        {
            armId: "v3_reference",
            policy: projectMethodV3Stage2PolicyToV4(methodV3Reference(), false),
        },
        {
            armId: "baseline_control",
            policy: baselinePolicy({ buildingEliminationEnabled: false }),
        },
        { armId: "baseline_balanced", policy: baselinePolicy() },
        {
            armId: "baseline_early",
            policy: baselinePolicy({
                buildingEliminationMinTick: 5_400,
                buildingEliminationMinCombatants: 6,
                buildingEliminationCombatantAdvantage: -4,
                buildingEliminationReserveCombatants: 6,
            }),
        },
        {
            armId: "baseline_late",
            policy: baselinePolicy({
                buildingEliminationMinTick: 10_800,
                buildingEliminationMinCombatants: 10,
                buildingEliminationCombatantAdvantage: 4,
            }),
        },
        {
            armId: "baseline_homeguard",
            policy: baselinePolicy({ buildingEliminationReserveCombatants: 8 }),
        },
        {
            armId: "baseline_minimal_reserve",
            policy: baselinePolicy({ buildingEliminationReserveCombatants: 2 }),
        },
        {
            armId: "baseline_rapid_orders",
            policy: baselinePolicy({ buildingEliminationOrderIntervalTicks: 3 }),
        },
        {
            armId: "baseline_nearest",
            policy: baselinePolicy({ buildingEliminationTargetPriority: "nearest" }),
        },
        {
            armId: "baseline_defense",
            policy: baselinePolicy({ buildingEliminationTargetPriority: "defense" }),
        },
        {
            armId: "baseline_focus",
            policy: baselinePolicy({ buildingEliminationMaxTargetGroups: 1 }),
        },
        {
            armId: "baseline_parallel",
            policy: baselinePolicy({ buildingEliminationMaxTargetGroups: 8 }),
        },
    ];
    if (candidates.map(({ armId }) => armId).join(",") !== METHOD_V4_LIFECYCLE_ARM_ORDER.join(",")) {
        throw new Error("Method-v4 lifecycle arm order drifted");
    }
    const arms = candidates.map(({ armId, policy }) => ({
        armId,
        policyId: researchPolicySha256(policy),
        policy,
    }));
    if (new Set(arms.map(({ policyId }) => policyId)).size !== arms.length) {
        throw new Error("Method-v4 lifecycle arms must have unique canonical policies");
    }
    return arms;
};
