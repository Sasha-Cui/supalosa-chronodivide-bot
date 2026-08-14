import { createHash } from "node:crypto";
import {
    PersistentObjectiveCompletionPolicyV2,
    buildPersistentObjectiveCompletionPolicyV2,
    validatePersistentObjectiveCompletionPolicyV2,
} from "./persistentObjectiveCompletionPolicyV2.js";

export const PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V3_SCHEMA_VERSION = 7 as const;

export type PersistentObjectiveCompletionPolicyV3 = Omit<
    PersistentObjectiveCompletionPolicyV2,
    "schemaVersion"
> & {
    schemaVersion: typeof PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V3_SCHEMA_VERSION;
    minimumAssaultCombatants: number;
    minimumLockedOffensiveDetachment: number;
};

const exactKeys: Array<keyof PersistentObjectiveCompletionPolicyV3> = [
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
];

const integer = (name: string, value: number, minimum: number, maximum: number): void => {
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
        throw new Error(`${name} must be an integer in [${minimum}, ${maximum}], got ${value}`);
    }
};

export const validatePersistentObjectiveCompletionPolicyV3 = (
    policy: PersistentObjectiveCompletionPolicyV3,
): PersistentObjectiveCompletionPolicyV3 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Persistent objective-completion policy v3 has an invalid exact schema");
    }
    if (policy.schemaVersion !== PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V3_SCHEMA_VERSION) {
        throw new Error(
            `Persistent objective-completion policy v3 schemaVersion must be ${PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V3_SCHEMA_VERSION}`,
        );
    }
    const {
        minimumAssaultCombatants,
        minimumLockedOffensiveDetachment,
        schemaVersion: _schemaVersion,
        ...v2Fields
    } = policy;
    validatePersistentObjectiveCompletionPolicyV2({
        ...v2Fields,
        schemaVersion: 6,
    });
    integer("minimumAssaultCombatants", minimumAssaultCombatants, 1, 100);
    integer("minimumLockedOffensiveDetachment", minimumLockedOffensiveDetachment, 1, 100);
    if (minimumAssaultCombatants > policy.maximumAssaultCombatants) {
        throw new Error("Minimum objective detachment cannot exceed the overall assault cap");
    }
    if (minimumLockedOffensiveDetachment > policy.maximumLockedOffensiveCombatants) {
        throw new Error("Minimum locked offensive detachment cannot exceed its locked sub-cap");
    }
    return { ...policy };
};

const canonical = (value: unknown): string => JSON.stringify(
    Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
        left.localeCompare(right),
    )),
);

export const persistentObjectiveCompletionPolicyV3Sha256 = (
    policy: PersistentObjectiveCompletionPolicyV3,
): string => createHash("sha256")
    .update(canonical(validatePersistentObjectiveCompletionPolicyV3(policy)))
    .digest("hex");

export const buildPersistentObjectiveCompletionPolicyV3 = (
    overrides: Partial<PersistentObjectiveCompletionPolicyV3> = {},
): PersistentObjectiveCompletionPolicyV3 => {
    const { schemaVersion: _schemaVersion, ...base } = buildPersistentObjectiveCompletionPolicyV2();
    return validatePersistentObjectiveCompletionPolicyV3({
        ...base,
        schemaVersion: PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V3_SCHEMA_VERSION,
        maximumAssaultFraction: 0.5,
        minimumAssaultCombatants: 3,
        maximumLockedOffensiveCombatants: 6,
        maximumLockedOffensiveFraction: 0.5,
        minimumLockedOffensiveDetachment: 3,
        ...overrides,
    });
};
