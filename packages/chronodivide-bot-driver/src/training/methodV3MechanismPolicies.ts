import {
    METHOD_V3_STARTING_POLICY,
    MethodV3PolicyConfig,
    parseResearchPolicy,
    researchPolicySha256,
} from "./researchPolicy.js";


export const METHOD_V3_MECHANISM_ARM_ORDER = [
    "v2_start",
    "all_in_preempt",
    "closeout_production",
    "closeout_preempt",
    "closeout_defense",
    "closeout_nearest",
    "closeout_sweep",
    "retain_yard",
    "siege_finisher",
] as const;

export type MethodV3MechanismArmId = typeof METHOD_V3_MECHANISM_ARM_ORDER[number];

export type MethodV3MechanismArm = {
    armId: MethodV3MechanismArmId;
    policyId: string;
    policy: MethodV3PolicyConfig;
};

const closeoutPolicy = (overrides: Partial<MethodV3PolicyConfig> = {}): MethodV3PolicyConfig =>
    parseResearchPolicy({
        ...METHOD_V3_STARTING_POLICY,
        buildingEliminationEnabled: true,
        buildingEliminationPreemptExistingAttacks: false,
        buildingEliminationSweepWhenNoTargets: false,
        ...overrides,
    }) as MethodV3PolicyConfig;

export const buildMethodV3MechanismArms = (): MethodV3MechanismArm[] => {
    const policies: Array<{ armId: MethodV3MechanismArmId; policy: MethodV3PolicyConfig }> = [
        { armId: "v2_start", policy: parseResearchPolicy(METHOD_V3_STARTING_POLICY) as MethodV3PolicyConfig },
        {
            armId: "all_in_preempt",
            policy: parseResearchPolicy({
                ...METHOD_V3_STARTING_POLICY,
                allInDisbandExistingAttacks: true,
            }) as MethodV3PolicyConfig,
        },
        { armId: "closeout_production", policy: closeoutPolicy() },
        {
            armId: "closeout_preempt",
            policy: closeoutPolicy({ buildingEliminationPreemptExistingAttacks: true }),
        },
        {
            armId: "closeout_defense",
            policy: closeoutPolicy({
                buildingEliminationPreemptExistingAttacks: true,
                buildingEliminationTargetPriority: "defense",
            }),
        },
        {
            armId: "closeout_nearest",
            policy: closeoutPolicy({
                buildingEliminationPreemptExistingAttacks: true,
                buildingEliminationTargetPriority: "nearest",
            }),
        },
        {
            armId: "closeout_sweep",
            policy: closeoutPolicy({
                buildingEliminationPreemptExistingAttacks: true,
                buildingEliminationSweepWhenNoTargets: true,
            }),
        },
        {
            armId: "retain_yard",
            policy: closeoutPolicy({
                buildingEliminationPreemptExistingAttacks: true,
                buildingEliminationSweepWhenNoTargets: true,
                rushSellEnabled: false,
            }),
        },
        {
            armId: "siege_finisher",
            policy: closeoutPolicy({
                buildingEliminationPreemptExistingAttacks: true,
                buildingEliminationSweepWhenNoTargets: true,
                rushSellEnabled: false,
                finisherArtilleryTargetCount: 6,
                finisherArtilleryStartTick: 10_800,
                finisherArtilleryPriority: 140,
                finisherArtilleryTechLeadTicks: 3_600,
                finisherArtilleryTechPriority: 130,
            }),
        },
    ];
    if (policies.map(({ armId }) => armId).join(",") !== METHOD_V3_MECHANISM_ARM_ORDER.join(",")) {
        throw new Error("Method-v3 mechanism arm order drifted");
    }
    const arms = policies.map(({ armId, policy }) => ({
        armId,
        policyId: researchPolicySha256(policy),
        policy,
    }));
    if (new Set(arms.map(({ policyId }) => policyId)).size !== arms.length) {
        throw new Error("Method-v3 mechanism arms must have unique canonical policies");
    }
    return arms;
};
