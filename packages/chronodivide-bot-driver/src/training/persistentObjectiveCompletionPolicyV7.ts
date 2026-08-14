import { createHash } from "node:crypto";
import {
    PersistentObjectiveCompletionPolicyV6,
    buildPersistentObjectiveCompletionPolicyV6,
    validatePersistentObjectiveCompletionPolicyV6,
} from "./persistentObjectiveCompletionPolicyV6.js";

export const PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V7_SCHEMA_VERSION = 11 as const;

export type PersistentObjectiveCompletionPolicyV7 = Omit<
    PersistentObjectiveCompletionPolicyV6,
    "schemaVersion"
> & {
    schemaVersion: typeof PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V7_SCHEMA_VERSION;
    targetRankingMode: "minimum_complete_mission_cost";
};

const exactKeys: Array<keyof PersistentObjectiveCompletionPolicyV7> = [
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
    "routeInterceptionMode", "targetRankingMode",
];

export const validatePersistentObjectiveCompletionPolicyV7 = (
    policy: PersistentObjectiveCompletionPolicyV7,
): PersistentObjectiveCompletionPolicyV7 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Persistent objective-completion policy v7 has an invalid exact schema");
    }
    if (policy.schemaVersion !== PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V7_SCHEMA_VERSION) {
        throw new Error(
            `Persistent objective-completion policy v7 schemaVersion must be ${PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V7_SCHEMA_VERSION}`,
        );
    }
    if (policy.targetRankingMode !== "minimum_complete_mission_cost") {
        throw new Error("Persistent objective-completion policy v7 target ranking mode is invalid");
    }
    const { schemaVersion: _schemaVersion, targetRankingMode: _targetRankingMode, ...v6Fields } = policy;
    validatePersistentObjectiveCompletionPolicyV6({ ...v6Fields, schemaVersion: 10 });
    return { ...policy };
};

const canonical = (value: unknown): string => JSON.stringify(
    Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
        left.localeCompare(right),
    )),
);

export const persistentObjectiveCompletionPolicyV7Sha256 = (
    policy: PersistentObjectiveCompletionPolicyV7,
): string => createHash("sha256")
    .update(canonical(validatePersistentObjectiveCompletionPolicyV7(policy)))
    .digest("hex");

export const buildPersistentObjectiveCompletionPolicyV7 = (
    overrides: Partial<PersistentObjectiveCompletionPolicyV7> = {},
): PersistentObjectiveCompletionPolicyV7 => {
    const { schemaVersion: _schemaVersion, ...base } = buildPersistentObjectiveCompletionPolicyV6();
    return validatePersistentObjectiveCompletionPolicyV7({
        ...base,
        schemaVersion: PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V7_SCHEMA_VERSION,
        targetRankingMode: "minimum_complete_mission_cost",
        ...overrides,
    });
};
