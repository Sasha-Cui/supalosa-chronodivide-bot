import { MethodV5CloseoutPolicy, methodV5CloseoutPolicySha256 } from "./methodV5Closeout.js";

export const METHOD_V5_CLOSEOUT_ARM_ORDER = [
    "baseline_control",
    "distributed_global_pause",
    "focused_global_pause",
    "distributed_bounded_reserve",
    "focused_bounded_reserve",
    "focused_bounded_air4",
    "focused_bounded_early_air4",
    "focused_bounded_aggressive_air4",
] as const;

export type MethodV5CloseoutArmId = typeof METHOD_V5_CLOSEOUT_ARM_ORDER[number];

export type MethodV5CloseoutArm = {
    armId: MethodV5CloseoutArmId;
    policyId: string;
    policy: MethodV5CloseoutPolicy;
};

const fullSearch: MethodV5CloseoutPolicy = {
    schemaVersion: 2,
    enabled: true,
    minTick: 7_200,
    minCombatants: 8,
    homeDefenseRadius: 48,
    maxVisibleEnemyCombatants: 999,
    visibleCombatantAdvantage: 0,
    reserveCombatants: 3,
    orderIntervalTicks: 12,
    maxTargetGroups: 4,
    targetAssignmentMode: "distributed",
    threatResponseMode: "global_pause",
    maxThreatReserveCombatants: 4,
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
        arm("distributed_global_pause", {}),
        arm("focused_global_pause", {
            targetAssignmentMode: "focused",
        }),
        arm("distributed_bounded_reserve", {
            threatResponseMode: "bounded_reserve",
        }),
        arm("focused_bounded_reserve", {
            targetAssignmentMode: "focused",
            threatResponseMode: "bounded_reserve",
        }),
        arm("focused_bounded_air4", {
            targetAssignmentMode: "focused",
            threatResponseMode: "bounded_reserve",
            adaptiveProductionEnabled: true,
            adaptiveAirTargetCount: 4,
        }),
        arm("focused_bounded_early_air4", {
            minTick: 5_400,
            minCombatants: 6,
            targetAssignmentMode: "focused",
            threatResponseMode: "bounded_reserve",
            adaptiveProductionEnabled: true,
            adaptiveAirTargetCount: 4,
        }),
        arm("focused_bounded_aggressive_air4", {
            minTick: 5_400,
            minCombatants: 6,
            reserveCombatants: 2,
            targetAssignmentMode: "focused",
            threatResponseMode: "bounded_reserve",
            maxThreatReserveCombatants: 3,
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
