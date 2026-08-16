import {
    FINISH_ADVANTAGE_BASE_RESERVE,
    FINISH_ADVANTAGE_MARGINS,
    FinishAdvantageMargin,
} from "./finishAdvantageControl.js";

export const FINISH_ADVANTAGE_POLICY_SCHEMA_VERSION = 1 as const;
export const FINISH_ADVANTAGE_MECHANISM = "mission_preserving_finish_advantage" as const;
export const FINISH_ADVANTAGE_INFORMATION_INTERFACE = "public_complete_state" as const;
export const FINISH_ADVANTAGE_UNSEEN_ORDER_MODE = "attack_move_then_visible_attack" as const;

export type FinishAdvantagePolicy = {
    schemaVersion: typeof FINISH_ADVANTAGE_POLICY_SCHEMA_VERSION;
    mechanism: typeof FINISH_ADVANTAGE_MECHANISM;
    enabled: boolean;
    multiBuildingMode: "irreversible_only" | "surplus_cover";
    informationInterface: typeof FINISH_ADVANTAGE_INFORMATION_INTERFACE;
    ordinaryBaseReserve: typeof FINISH_ADVANTAGE_BASE_RESERVE;
    surplusMargin: FinishAdvantageMargin;
    orderIntervalTicks: number;
    safetyMarginTicks: number;
    routeCorridorRadiusTiles: number;
    physicalProgressDeadlineTicks: number;
    retargetCooldownTicks: number;
    exactUnseenBuildingOrderMode: typeof FINISH_ADVANTAGE_UNSEEN_ORDER_MODE;
};

const DEFAULT_POLICY: FinishAdvantagePolicy = {
    schemaVersion: FINISH_ADVANTAGE_POLICY_SCHEMA_VERSION,
    mechanism: FINISH_ADVANTAGE_MECHANISM,
    enabled: true,
    multiBuildingMode: "irreversible_only",
    informationInterface: FINISH_ADVANTAGE_INFORMATION_INTERFACE,
    ordinaryBaseReserve: FINISH_ADVANTAGE_BASE_RESERVE,
    surplusMargin: 0,
    orderIntervalTicks: 15,
    safetyMarginTicks: 12,
    routeCorridorRadiusTiles: 8,
    physicalProgressDeadlineTicks: 1_200,
    retargetCooldownTicks: 300,
    exactUnseenBuildingOrderMode: FINISH_ADVANTAGE_UNSEEN_ORDER_MODE,
};

const exactPolicyKeys = Object.keys(DEFAULT_POLICY).sort();

const boundedInteger = (value: unknown, minimum: number, maximum: number): value is number =>
    typeof value === "number" && Number.isSafeInteger(value) && value >= minimum && value <= maximum;

export const validateFinishAdvantagePolicy = (value: unknown): FinishAdvantagePolicy => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("Finish-advantage policy must be an object");
    }
    const raw = value as Record<string, unknown>;
    const keys = Object.keys(raw).sort();
    if (keys.length !== exactPolicyKeys.length || keys.some((key, index) => key !== exactPolicyKeys[index])) {
        throw new Error("Finish-advantage policy has an invalid exact schema");
    }
    if (
        raw.schemaVersion !== FINISH_ADVANTAGE_POLICY_SCHEMA_VERSION ||
        raw.mechanism !== FINISH_ADVANTAGE_MECHANISM ||
        typeof raw.enabled !== "boolean" ||
        (raw.multiBuildingMode !== "irreversible_only" && raw.multiBuildingMode !== "surplus_cover") ||
        raw.informationInterface !== FINISH_ADVANTAGE_INFORMATION_INTERFACE ||
        raw.ordinaryBaseReserve !== FINISH_ADVANTAGE_BASE_RESERVE ||
        !FINISH_ADVANTAGE_MARGINS.includes(raw.surplusMargin as FinishAdvantageMargin) ||
        !boundedInteger(raw.orderIntervalTicks, 1, 120) ||
        !boundedInteger(raw.safetyMarginTicks, 0, 600) ||
        !boundedInteger(raw.routeCorridorRadiusTiles, 1, 32) ||
        !boundedInteger(raw.physicalProgressDeadlineTicks, 120, 4_800) ||
        !boundedInteger(raw.retargetCooldownTicks, 1, 1_200) ||
        raw.exactUnseenBuildingOrderMode !== FINISH_ADVANTAGE_UNSEEN_ORDER_MODE
    ) throw new Error("Finish-advantage policy value is invalid");
    if (raw.multiBuildingMode === "irreversible_only" && raw.surplusMargin !== 0) {
        throw new Error("Irreversible-only finish advantage cannot carry an unused surplus margin");
    }
    return { ...(raw as FinishAdvantagePolicy) };
};

export const buildFinishAdvantagePolicy = (
    overrides: Partial<FinishAdvantagePolicy> = {},
): FinishAdvantagePolicy => validateFinishAdvantagePolicy({ ...DEFAULT_POLICY, ...overrides });

export const buildFinishAdvantageIrreversiblePolicy = (
    overrides: Partial<FinishAdvantagePolicy> = {},
): FinishAdvantagePolicy => buildFinishAdvantagePolicy({
    ...overrides,
    multiBuildingMode: "irreversible_only",
    surplusMargin: 0,
});

export const buildFinishAdvantageSurplusPolicy = (
    surplusMargin: FinishAdvantageMargin,
    overrides: Partial<FinishAdvantagePolicy> = {},
): FinishAdvantagePolicy => buildFinishAdvantagePolicy({
    ...overrides,
    multiBuildingMode: "surplus_cover",
    surplusMargin,
});
