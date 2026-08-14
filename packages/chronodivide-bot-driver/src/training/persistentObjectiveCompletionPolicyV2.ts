import { createHash } from "node:crypto";
import {
    PersistentObjectiveCompletionPolicy,
    buildPersistentObjectiveCompletionPolicy,
} from "./persistentObjectiveCompletionPolicy.js";

export const PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V2_SCHEMA_VERSION = 6 as const;

export type PersistentObjectiveCompletionPolicyV2 = Omit<
    PersistentObjectiveCompletionPolicy,
    "schemaVersion" | "leaseSource"
> & {
    schemaVersion: typeof PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V2_SCHEMA_VERSION;
    leaseSource: "unassigned_or_bounded_offensive_mission_surplus";
    maximumLockedOffensiveCombatants: number;
    maximumLockedOffensiveFraction: number;
};

const exactKeys: Array<keyof PersistentObjectiveCompletionPolicyV2> = [
    "schemaVersion", "enabled", "mechanism", "informationInterface",
    "terminalMinTick", "assaultMinTick", "assaultBuildingCount",
    "orderIntervalTicks", "leaseSource", "maximumAssaultCombatants",
    "maximumAssaultFraction", "ordinaryReserveCombatants",
    "minimumOwnBuildingsForAssault", "homeThreatRadius", "homeReserveRadius",
    "buildingNoProgressDeadlineTicks", "blockerNoProgressDeadlineTicks",
    "fallbackCooldownTicks", "maximumLeaseTicks", "routeProgressDistanceTiles",
    "routeCorridorRadius", "blockerMode", "maximumLockedOffensiveCombatants",
    "maximumLockedOffensiveFraction",
];

const integer = (name: string, value: number, minimum: number, maximum: number): void => {
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
        throw new Error(`${name} must be an integer in [${minimum}, ${maximum}], got ${value}`);
    }
};

const finiteRange = (name: string, value: number, minimum: number, maximum: number): void => {
    if (!Number.isFinite(value) || value < minimum || value > maximum) {
        throw new Error(`${name} must be finite in [${minimum}, ${maximum}], got ${value}`);
    }
};

export const validatePersistentObjectiveCompletionPolicyV2 = (
    policy: PersistentObjectiveCompletionPolicyV2,
): PersistentObjectiveCompletionPolicyV2 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Persistent objective-completion policy v2 has an invalid exact schema");
    }
    if (policy.schemaVersion !== PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V2_SCHEMA_VERSION) {
        throw new Error(
            `Persistent objective-completion policy v2 schemaVersion must be ${PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V2_SCHEMA_VERSION}`,
        );
    }
    if (typeof policy.enabled !== "boolean") throw new Error("enabled must be boolean");
    if (policy.mechanism !== "persistent_additive_objective_completion") {
        throw new Error("Persistent objective-completion policy v2 mechanism is invalid");
    }
    if (policy.informationInterface !== "public_complete_state") {
        throw new Error("Persistent objective-completion policy v2 requires public_complete_state");
    }
    if (policy.leaseSource !== "unassigned_or_bounded_offensive_mission_surplus") {
        throw new Error("Persistent objective-completion policy v2 lease source is invalid");
    }
    if (policy.blockerMode !== "predecessor_fallback" && policy.blockerMode !== "route_blocker_clear") {
        throw new Error("Persistent objective-completion policy v2 blocker mode is invalid");
    }
    integer("terminalMinTick", policy.terminalMinTick, 0, 100_000);
    integer("assaultMinTick", policy.assaultMinTick, 0, 100_000);
    integer("assaultBuildingCount", policy.assaultBuildingCount, 2, 100);
    integer("orderIntervalTicks", policy.orderIntervalTicks, 1, 60);
    integer("maximumAssaultCombatants", policy.maximumAssaultCombatants, 1, 100);
    finiteRange("maximumAssaultFraction", policy.maximumAssaultFraction, 0.01, 1);
    integer("ordinaryReserveCombatants", policy.ordinaryReserveCombatants, 0, 100);
    integer("minimumOwnBuildingsForAssault", policy.minimumOwnBuildingsForAssault, 1, 100);
    finiteRange("homeThreatRadius", policy.homeThreatRadius, 0, 100);
    finiteRange("homeReserveRadius", policy.homeReserveRadius, 0, 100);
    integer("buildingNoProgressDeadlineTicks", policy.buildingNoProgressDeadlineTicks, 3, 20_000);
    integer("blockerNoProgressDeadlineTicks", policy.blockerNoProgressDeadlineTicks, 3, 20_000);
    integer("fallbackCooldownTicks", policy.fallbackCooldownTicks, 3, 20_000);
    integer("maximumLeaseTicks", policy.maximumLeaseTicks, 3, 100_000);
    finiteRange("routeProgressDistanceTiles", policy.routeProgressDistanceTiles, 0.1, 32);
    finiteRange("routeCorridorRadius", policy.routeCorridorRadius, 0, 32);
    integer("maximumLockedOffensiveCombatants", policy.maximumLockedOffensiveCombatants, 1, 100);
    finiteRange("maximumLockedOffensiveFraction", policy.maximumLockedOffensiveFraction, 0.01, 1);
    if (policy.terminalMinTick > policy.assaultMinTick) {
        throw new Error("terminalMinTick cannot exceed assaultMinTick");
    }
    if (policy.orderIntervalTicks % 3 !== 0) {
        throw new Error("orderIntervalTicks must align with Supalosa's three-tick mission cycle");
    }
    if (policy.maximumLeaseTicks < policy.buildingNoProgressDeadlineTicks) {
        throw new Error("maximumLeaseTicks cannot be shorter than the building progress deadline");
    }
    if (policy.maximumLockedOffensiveCombatants > policy.maximumAssaultCombatants) {
        throw new Error("Locked offensive sub-cap cannot exceed the overall assault cap");
    }
    if (policy.maximumLockedOffensiveFraction > policy.maximumAssaultFraction) {
        throw new Error("Locked offensive fraction cannot exceed the overall assault fraction");
    }
    return { ...policy };
};

const canonical = (value: unknown): string => JSON.stringify(
    Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
        left.localeCompare(right),
    )),
);

export const persistentObjectiveCompletionPolicyV2Sha256 = (
    policy: PersistentObjectiveCompletionPolicyV2,
): string => createHash("sha256")
    .update(canonical(validatePersistentObjectiveCompletionPolicyV2(policy)))
    .digest("hex");

export const buildPersistentObjectiveCompletionPolicyV2 = (
    overrides: Partial<PersistentObjectiveCompletionPolicyV2> = {},
): PersistentObjectiveCompletionPolicyV2 => {
    const {
        schemaVersion: _schemaVersion,
        leaseSource: _leaseSource,
        ...base
    } = buildPersistentObjectiveCompletionPolicy();
    return validatePersistentObjectiveCompletionPolicyV2({
        ...base,
        schemaVersion: PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V2_SCHEMA_VERSION,
        leaseSource: "unassigned_or_bounded_offensive_mission_surplus",
        maximumAssaultFraction: 1 / 3,
        maximumLockedOffensiveCombatants: 4,
        maximumLockedOffensiveFraction: 1 / 3,
        ...overrides,
    });
};
