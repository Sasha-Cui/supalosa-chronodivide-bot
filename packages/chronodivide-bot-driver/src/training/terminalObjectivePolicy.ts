import { createHash } from "node:crypto";

export const TERMINAL_OBJECTIVE_POLICY_SCHEMA_VERSION = 1 as const;
export const TERMINAL_OBJECTIVE_INFORMATION_BOUNDARY =
    "self-visible-enemy-memory-public-map-and-starts-only" as const;

export const TERMINAL_OBJECTIVE_ARM_ORDER = [
    "selected_prior",
    "persistent_liveness",
    "blocker_scheduler",
    "terminal_candidate",
    "full_sufficient_strike",
] as const;

export type TerminalObjectiveArmId = typeof TERMINAL_OBJECTIVE_ARM_ORDER[number];
export type TerminalObjectiveMechanism = Exclude<TerminalObjectiveArmId, "selected_prior">;

export type TerminalObjectivePolicy = {
    schemaVersion: typeof TERMINAL_OBJECTIVE_POLICY_SCHEMA_VERSION;
    enabled: boolean;
    mechanism: TerminalObjectiveMechanism;
    minTick: number;
    orderIntervalTicks: number;
    searchCellSize: number;
    searchRevisitTicks: number;
    maxSearchGroups: number;
    routeCorridorRadius: number;
    interceptHorizonTicks: number;
    baseDefenseHorizonTicks: number;
    blockerLethalDamageFraction: number;
    directCompletionSafetyMarginTicks: number;
    missionLivenessTicks: number;
    requiredSearchCoverageFraction: number;
    blockerReassessmentTicks: number;
};

export type TerminalObjectiveArm = {
    armId: TerminalObjectiveArmId;
    policyId: string;
    policy: TerminalObjectivePolicy;
};

const exactKeys = [
    "schemaVersion", "enabled", "mechanism", "minTick", "orderIntervalTicks",
    "searchCellSize", "searchRevisitTicks", "maxSearchGroups", "routeCorridorRadius",
    "interceptHorizonTicks", "baseDefenseHorizonTicks", "blockerLethalDamageFraction",
    "directCompletionSafetyMarginTicks", "missionLivenessTicks",
    "requiredSearchCoverageFraction", "blockerReassessmentTicks",
].sort();

const integer = (name: string, value: number, minimum: number, maximum: number): void => {
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
        throw new Error(`${name} must be an integer in [${minimum}, ${maximum}], got ${value}`);
    }
};

export const validateTerminalObjectivePolicy = (
    policy: TerminalObjectivePolicy,
): TerminalObjectivePolicy => {
    const actual = Object.keys(policy).sort();
    if (actual.length !== exactKeys.length || actual.some((key, index) => key !== exactKeys[index])) {
        throw new Error("Terminal-objective policy has an invalid exact schema");
    }
    if (policy.schemaVersion !== TERMINAL_OBJECTIVE_POLICY_SCHEMA_VERSION) {
        throw new Error(`Terminal-objective schemaVersion must be ${TERMINAL_OBJECTIVE_POLICY_SCHEMA_VERSION}`);
    }
    if (typeof policy.enabled !== "boolean") throw new Error("enabled must be boolean");
    if (!new Set<TerminalObjectiveMechanism>([
        "persistent_liveness", "blocker_scheduler", "terminal_candidate", "full_sufficient_strike",
    ]).has(policy.mechanism)) throw new Error(`Invalid terminal-objective mechanism: ${policy.mechanism}`);
    integer("minTick", policy.minTick, 0, 100_000);
    integer("orderIntervalTicks", policy.orderIntervalTicks, 1, 10_000);
    integer("searchCellSize", policy.searchCellSize, 4, 64);
    integer("searchRevisitTicks", policy.searchRevisitTicks, 0, 100_000);
    integer("maxSearchGroups", policy.maxSearchGroups, 1, 32);
    integer("routeCorridorRadius", policy.routeCorridorRadius, 0, 64);
    integer("interceptHorizonTicks", policy.interceptHorizonTicks, 1, 100_000);
    integer("baseDefenseHorizonTicks", policy.baseDefenseHorizonTicks, 1, 100_000);
    integer("directCompletionSafetyMarginTicks", policy.directCompletionSafetyMarginTicks, 0, 10_000);
    integer("missionLivenessTicks", policy.missionLivenessTicks, 1, 100_000);
    integer("blockerReassessmentTicks", policy.blockerReassessmentTicks, 0, 10_000);
    if (
        !Number.isFinite(policy.blockerLethalDamageFraction) ||
        policy.blockerLethalDamageFraction <= 0 || policy.blockerLethalDamageFraction > 1
    ) throw new Error("blockerLethalDamageFraction must be in (0, 1]");
    if (
        !Number.isFinite(policy.requiredSearchCoverageFraction) ||
        policy.requiredSearchCoverageFraction < 0 || policy.requiredSearchCoverageFraction > 1
    ) throw new Error("requiredSearchCoverageFraction must be in [0, 1]");
    return { ...policy };
};

const canonical = (value: unknown): string => JSON.stringify(
    Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
        left.localeCompare(right),
    )),
);

export const terminalObjectivePolicySha256 = (policy: TerminalObjectivePolicy): string =>
    createHash("sha256").update(canonical(validateTerminalObjectivePolicy(policy))).digest("hex");

const full: TerminalObjectivePolicy = {
    schemaVersion: 1,
    enabled: true,
    mechanism: "full_sufficient_strike",
    minTick: 7_200,
    orderIntervalTicks: 12,
    searchCellSize: 12,
    searchRevisitTicks: 600,
    maxSearchGroups: 4,
    routeCorridorRadius: 2,
    interceptHorizonTicks: 2_400,
    baseDefenseHorizonTicks: 2_400,
    blockerLethalDamageFraction: 0.5,
    directCompletionSafetyMarginTicks: 12,
    missionLivenessTicks: 600,
    requiredSearchCoverageFraction: 0.9,
    blockerReassessmentTicks: 12,
};

export const buildTerminalObjectiveArms = (): TerminalObjectiveArm[] => {
    const build = (
        armId: TerminalObjectiveArmId,
        mechanism: TerminalObjectiveMechanism,
        enabled = true,
    ): TerminalObjectiveArm => {
        const policy = validateTerminalObjectivePolicy({ ...full, enabled, mechanism });
        return { armId, policy, policyId: terminalObjectivePolicySha256(policy) };
    };
    const arms = [
        build("selected_prior", "full_sufficient_strike", false),
        build("persistent_liveness", "persistent_liveness"),
        build("blocker_scheduler", "blocker_scheduler"),
        build("terminal_candidate", "terminal_candidate"),
        build("full_sufficient_strike", "full_sufficient_strike"),
    ];
    if (
        arms.map(({ armId }) => armId).join(",") !== TERMINAL_OBJECTIVE_ARM_ORDER.join(",") ||
        new Set(arms.map(({ policyId }) => policyId)).size !== arms.length
    ) throw new Error("Terminal-objective arm order or policy identities drifted");
    return arms;
};
