import { MethodV5CloseoutPolicy, methodV5CloseoutPolicySha256 } from "./methodV5Closeout.js";

export const METHOD_V5_CLOSEOUT_ARM_ORDER = [
    "baseline_control",
    "memory_search",
    "memory_search_air4",
    "early_air4",
    "rapid_air4",
    "reserve2_air4",
    "production_priority_high",
    "aggressive_air4",
] as const;

export type MethodV5CloseoutArmId = typeof METHOD_V5_CLOSEOUT_ARM_ORDER[number];

export type MethodV5CloseoutArm = {
    armId: MethodV5CloseoutArmId;
    policyId: string;
    policy: MethodV5CloseoutPolicy;
};

const fullSearch: MethodV5CloseoutPolicy = {
    schemaVersion: 1,
    enabled: true,
    minTick: 7_200,
    minCombatants: 8,
    homeDefenseRadius: 48,
    maxVisibleEnemyCombatants: 999,
    visibleCombatantAdvantage: 0,
    reserveCombatants: 3,
    orderIntervalTicks: 12,
    maxTargetGroups: 4,
    targetPriority: "production",
    memoryEnabled: true,
    searchEnabled: true,
    searchCellSize: 12,
    searchRevisitTicks: 600,
    directVisibleAttack: true,
    preemptBaselineOrders: true,
    capabilityAware: true,
    reachabilityAware: true,
    stallTicks: 600,
    adaptiveProductionEnabled: false,
    adaptiveAirTargetCount: 0,
    adaptiveProductionPriority: 180,
    adaptiveTechPriority: 170,
};

const arm = (
    armId: MethodV5CloseoutArmId,
    overrides: Partial<MethodV5CloseoutPolicy>,
): MethodV5CloseoutArm => {
    const policy: MethodV5CloseoutPolicy = { ...fullSearch, ...overrides };
    return { armId, policyId: methodV5CloseoutPolicySha256(policy), policy };
};

export const buildMethodV5CloseoutArms = (): MethodV5CloseoutArm[] => {
    const arms: MethodV5CloseoutArm[] = [
        arm("baseline_control", { enabled: false }),
        arm("memory_search", {}),
        arm("memory_search_air4", {
            adaptiveProductionEnabled: true,
            adaptiveAirTargetCount: 4,
        }),
        arm("early_air4", {
            minTick: 5_400,
            minCombatants: 6,
            adaptiveProductionEnabled: true,
            adaptiveAirTargetCount: 4,
        }),
        arm("rapid_air4", {
            orderIntervalTicks: 3,
            adaptiveProductionEnabled: true,
            adaptiveAirTargetCount: 4,
        }),
        arm("reserve2_air4", {
            reserveCombatants: 2,
            adaptiveProductionEnabled: true,
            adaptiveAirTargetCount: 4,
        }),
        arm("production_priority_high", {
            adaptiveProductionEnabled: true,
            adaptiveAirTargetCount: 4,
            adaptiveProductionPriority: 240,
            adaptiveTechPriority: 220,
        }),
        arm("aggressive_air4", {
            minTick: 5_400,
            minCombatants: 6,
            reserveCombatants: 2,
            orderIntervalTicks: 3,
            adaptiveProductionEnabled: true,
            adaptiveAirTargetCount: 4,
            adaptiveProductionPriority: 240,
            adaptiveTechPriority: 220,
        }),
    ];
    if (
        arms.map(({ armId }) => armId).join(",") !== METHOD_V5_CLOSEOUT_ARM_ORDER.join(",") ||
        new Set(arms.map(({ policyId }) => policyId)).size !== arms.length
    ) throw new Error("Method-v5 arm order or canonical policy identities drifted");
    return arms;
};
