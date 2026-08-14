import { createHash } from "node:crypto";
import {
    PersistentObjectiveCompletionPolicyV7,
    buildPersistentObjectiveCompletionPolicyV7,
    validatePersistentObjectiveCompletionPolicyV7,
} from "./persistentObjectiveCompletionPolicyV7.js";

export const PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V8_SCHEMA_VERSION = 12 as const;

export type PersistentObjectiveCompletionPolicyV8 = Omit<
    PersistentObjectiveCompletionPolicyV7,
    "schemaVersion"
> & {
    schemaVersion: typeof PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V8_SCHEMA_VERSION;
    targetRetryMode: "rotate_after_bounded_no_building_damage";
};

const exactKeys: Array<keyof PersistentObjectiveCompletionPolicyV8> = [
    "schemaVersion", "enabled", "mechanism", "informationInterface",
    "terminalMinTick", "assaultMinTick", "assaultBuildingCount",
    "orderIntervalTicks", "leaseSource", "maximumAssaultCombatants",
    "maximumAssaultFraction", "minimumAssaultCombatants",
    "ordinaryReserveCombatants", "minimumOwnBuildingsForAssault",
    "homeThreatRadius", "homeReserveRadius", "buildingNoProgressDeadlineTicks",
    "blockerNoProgressDeadlineTicks", "fallbackCooldownTicks",
    "maximumLeaseTicks", "routeProgressDistanceTiles", "routeCorridorRadius",
    "blockerMode", "maximumLockedOffensiveCombatants",
    "maximumLockedOffensiveFraction", "minimumLockedOffensiveDetachment",
    "routeInterceptionMode", "targetRankingMode", "targetRetryMode",
];

export const validatePersistentObjectiveCompletionPolicyV8 = (
    policy: PersistentObjectiveCompletionPolicyV8,
): PersistentObjectiveCompletionPolicyV8 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Persistent objective-completion policy v8 has an invalid exact schema");
    }
    if (policy.schemaVersion !== PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V8_SCHEMA_VERSION) {
        throw new Error(
            `Persistent objective-completion policy v8 schemaVersion must be ${PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V8_SCHEMA_VERSION}`,
        );
    }
    if (policy.targetRetryMode !== "rotate_after_bounded_no_building_damage") {
        throw new Error("Persistent objective-completion policy v8 target retry mode is invalid");
    }
    const { schemaVersion: _schemaVersion, targetRetryMode: _targetRetryMode, ...v7Fields } = policy;
    validatePersistentObjectiveCompletionPolicyV7({ ...v7Fields, schemaVersion: 11 });
    return { ...policy };
};

const canonical = (value: unknown): string => JSON.stringify(
    Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
        left.localeCompare(right),
    )),
);

export const persistentObjectiveCompletionPolicyV8Sha256 = (
    policy: PersistentObjectiveCompletionPolicyV8,
): string => createHash("sha256")
    .update(canonical(validatePersistentObjectiveCompletionPolicyV8(policy)))
    .digest("hex");

export const buildPersistentObjectiveCompletionPolicyV8 = (
    overrides: Partial<PersistentObjectiveCompletionPolicyV8> = {},
): PersistentObjectiveCompletionPolicyV8 => {
    const { schemaVersion: _schemaVersion, ...base } = buildPersistentObjectiveCompletionPolicyV7();
    return validatePersistentObjectiveCompletionPolicyV8({
        ...base,
        schemaVersion: PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V8_SCHEMA_VERSION,
        targetRetryMode: "rotate_after_bounded_no_building_damage",
        ...overrides,
    });
};
