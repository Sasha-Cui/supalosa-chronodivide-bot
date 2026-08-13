import { createHash } from "node:crypto";

export const TERMINAL_RACE_POLICY_SCHEMA_VERSION = 2 as const;

export const TERMINAL_RACE_INFORMATION_INTERFACES = [
    "visible_memory",
    "public_complete_state",
] as const;

export type TerminalRaceInformationInterface =
    typeof TERMINAL_RACE_INFORMATION_INTERFACES[number];

export const TERMINAL_RACE_INFORMATION_BOUNDARY = "declared-per-policy-interface" as const;

export const TERMINAL_RACE_FRIENDLY_CALIBRATION_MODES = [
    "all_specials_fail_closed",
    "ordinary_weapon_role_specific",
] as const;

export type TerminalRaceFriendlyCalibrationMode =
    typeof TERMINAL_RACE_FRIENDLY_CALIBRATION_MODES[number];

export const TERMINAL_RACE_ACTIVATION_MODES = [
    "fixed_tick",
    "fixed_tick_or_guarded_building_count",
] as const;

export type TerminalRaceActivationMode = typeof TERMINAL_RACE_ACTIVATION_MODES[number];

export const TERMINAL_RACE_ARM_ORDER = [
    "baseline_control",
    "visible_conservative",
    "visible_role_calibrated",
    "public_terminal_race_late",
    "public_terminal_race_trigger",
    "public_terminal_race_rapid",
] as const;

export type TerminalRaceArmId = typeof TERMINAL_RACE_ARM_ORDER[number];

export type TerminalRacePolicy = {
    schemaVersion: typeof TERMINAL_RACE_POLICY_SCHEMA_VERSION;
    enabled: boolean;
    mechanism: "terminal_race";
    informationInterface: TerminalRaceInformationInterface;
    friendlyCalibrationMode: TerminalRaceFriendlyCalibrationMode;
    activationMode: TerminalRaceActivationMode;
    activationBuildingCount: number;
    activationMinTick: number;
    requireObservedCountAboveThreshold: boolean;
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

export type TerminalRaceArm = {
    armId: TerminalRaceArmId;
    policyId: string;
    policy: TerminalRacePolicy;
};

const exactKeys = [
    "schemaVersion", "enabled", "mechanism", "informationInterface",
    "friendlyCalibrationMode", "activationMode", "activationBuildingCount",
    "activationMinTick", "requireObservedCountAboveThreshold", "minTick",
    "orderIntervalTicks", "searchCellSize", "searchRevisitTicks", "maxSearchGroups",
    "routeCorridorRadius", "interceptHorizonTicks", "baseDefenseHorizonTicks",
    "blockerLethalDamageFraction", "directCompletionSafetyMarginTicks",
    "missionLivenessTicks", "requiredSearchCoverageFraction", "blockerReassessmentTicks",
].sort();

const integer = (name: string, value: number, minimum: number, maximum: number): void => {
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
        throw new Error(`${name} must be an integer in [${minimum}, ${maximum}], got ${value}`);
    }
};

export const validateTerminalRacePolicy = (policy: TerminalRacePolicy): TerminalRacePolicy => {
    const actual = Object.keys(policy).sort();
    if (actual.length !== exactKeys.length || actual.some((key, index) => key !== exactKeys[index])) {
        throw new Error("Terminal-race policy has an invalid exact schema");
    }
    if (policy.schemaVersion !== TERMINAL_RACE_POLICY_SCHEMA_VERSION) {
        throw new Error(`Terminal-race schemaVersion must be ${TERMINAL_RACE_POLICY_SCHEMA_VERSION}`);
    }
    if (typeof policy.enabled !== "boolean") throw new Error("enabled must be boolean");
    if (policy.mechanism !== "terminal_race") throw new Error("mechanism must be terminal_race");
    if (!TERMINAL_RACE_INFORMATION_INTERFACES.includes(policy.informationInterface)) {
        throw new Error(`Invalid terminal-race information interface: ${policy.informationInterface}`);
    }
    if (!TERMINAL_RACE_FRIENDLY_CALIBRATION_MODES.includes(policy.friendlyCalibrationMode)) {
        throw new Error(`Invalid terminal-race friendly calibration: ${policy.friendlyCalibrationMode}`);
    }
    if (!TERMINAL_RACE_ACTIVATION_MODES.includes(policy.activationMode)) {
        throw new Error(`Invalid terminal-race activation mode: ${policy.activationMode}`);
    }
    if (typeof policy.requireObservedCountAboveThreshold !== "boolean") {
        throw new Error("requireObservedCountAboveThreshold must be boolean");
    }
    integer("activationBuildingCount", policy.activationBuildingCount, 1, 100);
    integer("activationMinTick", policy.activationMinTick, 0, 100_000);
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
    if (
        policy.informationInterface !== "public_complete_state" &&
        policy.activationMode !== "fixed_tick"
    ) throw new Error("A count trigger requires public_complete_state");
    if (
        policy.activationMode === "fixed_tick_or_guarded_building_count" &&
        (!policy.requireObservedCountAboveThreshold || policy.activationMinTick >= policy.minTick)
    ) throw new Error("The count trigger must be transition-guarded and earlier than minTick");
    return { ...policy };
};

const canonical = (value: unknown): string => JSON.stringify(
    Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
        left.localeCompare(right),
    )),
);

export const terminalRacePolicySha256 = (policy: TerminalRacePolicy): string =>
    createHash("sha256").update(canonical(validateTerminalRacePolicy(policy))).digest("hex");

const full: TerminalRacePolicy = {
    schemaVersion: 2,
    enabled: true,
    mechanism: "terminal_race",
    informationInterface: "visible_memory",
    friendlyCalibrationMode: "all_specials_fail_closed",
    activationMode: "fixed_tick",
    activationBuildingCount: 3,
    activationMinTick: 3_600,
    requireObservedCountAboveThreshold: true,
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

export const buildTerminalRaceArms = (): TerminalRaceArm[] => {
    const build = (armId: TerminalRaceArmId, changes: Partial<TerminalRacePolicy>): TerminalRaceArm => {
        const policy = validateTerminalRacePolicy({ ...full, ...changes });
        return { armId, policy, policyId: terminalRacePolicySha256(policy) };
    };
    const arms = [
        build("baseline_control", { enabled: false }),
        build("visible_conservative", {}),
        build("visible_role_calibrated", {
            friendlyCalibrationMode: "ordinary_weapon_role_specific",
        }),
        build("public_terminal_race_late", {
            informationInterface: "public_complete_state",
            friendlyCalibrationMode: "ordinary_weapon_role_specific",
        }),
        build("public_terminal_race_trigger", {
            informationInterface: "public_complete_state",
            friendlyCalibrationMode: "ordinary_weapon_role_specific",
            activationMode: "fixed_tick_or_guarded_building_count",
        }),
        build("public_terminal_race_rapid", {
            informationInterface: "public_complete_state",
            friendlyCalibrationMode: "ordinary_weapon_role_specific",
            activationMode: "fixed_tick_or_guarded_building_count",
            orderIntervalTicks: 3,
            missionLivenessTicks: 180,
        }),
    ];
    if (
        arms.map(({ armId }) => armId).join(",") !== TERMINAL_RACE_ARM_ORDER.join(",") ||
        new Set(arms.map(({ policyId }) => policyId)).size !== arms.length
    ) throw new Error("Terminal-race arm order or policy identities drifted");
    return arms;
};
