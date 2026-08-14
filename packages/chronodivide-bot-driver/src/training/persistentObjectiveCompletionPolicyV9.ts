import { createHash } from "node:crypto";
import {
    PersistentObjectiveCompletionPolicyV8,
    buildPersistentObjectiveCompletionPolicyV8,
    validatePersistentObjectiveCompletionPolicyV8,
} from "./persistentObjectiveCompletionPolicyV8.js";

export const PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V9_SCHEMA_VERSION = 13 as const;

export type PersistentObjectiveCompletionPolicyV9 = Omit<
    PersistentObjectiveCompletionPolicyV8,
    "schemaVersion"
> & {
    schemaVersion: typeof PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V9_SCHEMA_VERSION;
    forceCommitmentMode: "full_compatible_offensive_force";
};

const exactKeys: Array<keyof PersistentObjectiveCompletionPolicyV9> = [
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
    "forceCommitmentMode",
];

export const validatePersistentObjectiveCompletionPolicyV9 = (
    policy: PersistentObjectiveCompletionPolicyV9,
): PersistentObjectiveCompletionPolicyV9 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Persistent objective-completion policy v9 has an invalid exact schema");
    }
    if (policy.schemaVersion !== PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V9_SCHEMA_VERSION) {
        throw new Error(
            `Persistent objective-completion policy v9 schemaVersion must be ${PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V9_SCHEMA_VERSION}`,
        );
    }
    if (policy.forceCommitmentMode !== "full_compatible_offensive_force") {
        throw new Error("Persistent objective-completion policy v9 force commitment mode is invalid");
    }
    if (
        policy.assaultBuildingCount !== 5 || policy.maximumAssaultCombatants !== 100 ||
        policy.maximumAssaultFraction !== 1 || policy.minimumAssaultCombatants !== 1 ||
        policy.ordinaryReserveCombatants !== 0 || policy.maximumLockedOffensiveCombatants !== 100 ||
        policy.maximumLockedOffensiveFraction !== 1 || policy.minimumLockedOffensiveDetachment !== 1
    ) throw new Error("Persistent objective-completion policy v9 full-force representation drifted");
    const { schemaVersion: _schemaVersion, forceCommitmentMode: _forceCommitmentMode, ...v8Fields } = policy;
    validatePersistentObjectiveCompletionPolicyV8({ ...v8Fields, schemaVersion: 12 });
    return { ...policy };
};

const canonical = (value: unknown): string => JSON.stringify(
    Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
        left.localeCompare(right),
    )),
);

export const persistentObjectiveCompletionPolicyV9Sha256 = (
    policy: PersistentObjectiveCompletionPolicyV9,
): string => createHash("sha256")
    .update(canonical(validatePersistentObjectiveCompletionPolicyV9(policy)))
    .digest("hex");

export const buildPersistentObjectiveCompletionPolicyV9 = (
    overrides: Partial<PersistentObjectiveCompletionPolicyV9> = {},
): PersistentObjectiveCompletionPolicyV9 => {
    const { schemaVersion: _schemaVersion, ...base } = buildPersistentObjectiveCompletionPolicyV8();
    return validatePersistentObjectiveCompletionPolicyV9({
        ...base,
        schemaVersion: PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V9_SCHEMA_VERSION,
        assaultBuildingCount: 5,
        maximumAssaultCombatants: 100,
        maximumAssaultFraction: 1,
        minimumAssaultCombatants: 1,
        ordinaryReserveCombatants: 0,
        maximumLockedOffensiveCombatants: 100,
        maximumLockedOffensiveFraction: 1,
        minimumLockedOffensiveDetachment: 1,
        forceCommitmentMode: "full_compatible_offensive_force",
        ...overrides,
    });
};
