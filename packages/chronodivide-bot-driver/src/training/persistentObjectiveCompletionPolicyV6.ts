import { createHash } from "node:crypto";
import {
    PersistentObjectiveCompletionPolicyV3,
    buildPersistentObjectiveCompletionPolicyV3,
    validatePersistentObjectiveCompletionPolicyV3,
} from "./persistentObjectiveCompletionPolicyV3.js";

export const PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V6_SCHEMA_VERSION = 10 as const;

export type PersistentObjectiveCompletionPolicyV6 = Omit<
    PersistentObjectiveCompletionPolicyV3,
    "schemaVersion"
> & {
    schemaVersion: typeof PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V6_SCHEMA_VERSION;
    routeInterceptionMode: "time_to_interception_completion_race";
};

const exactKeys: Array<keyof PersistentObjectiveCompletionPolicyV6> = [
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
    "routeInterceptionMode",
];

export const validatePersistentObjectiveCompletionPolicyV6 = (
    policy: PersistentObjectiveCompletionPolicyV6,
): PersistentObjectiveCompletionPolicyV6 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Persistent objective-completion policy v6 has an invalid exact schema");
    }
    if (policy.schemaVersion !== PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V6_SCHEMA_VERSION) {
        throw new Error(
            `Persistent objective-completion policy v6 schemaVersion must be ${PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V6_SCHEMA_VERSION}`,
        );
    }
    if (policy.routeInterceptionMode !== "time_to_interception_completion_race") {
        throw new Error("Persistent objective-completion policy v6 route interception mode is invalid");
    }
    const { schemaVersion: _schemaVersion, routeInterceptionMode: _routeInterceptionMode, ...v3Fields } = policy;
    validatePersistentObjectiveCompletionPolicyV3({ ...v3Fields, schemaVersion: 7 });
    return { ...policy };
};

const canonical = (value: unknown): string => JSON.stringify(
    Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
        left.localeCompare(right),
    )),
);

export const persistentObjectiveCompletionPolicyV6Sha256 = (
    policy: PersistentObjectiveCompletionPolicyV6,
): string => createHash("sha256")
    .update(canonical(validatePersistentObjectiveCompletionPolicyV6(policy)))
    .digest("hex");

export const buildPersistentObjectiveCompletionPolicyV6 = (
    overrides: Partial<PersistentObjectiveCompletionPolicyV6> = {},
): PersistentObjectiveCompletionPolicyV6 => {
    const { schemaVersion: _schemaVersion, ...base } = buildPersistentObjectiveCompletionPolicyV3();
    return validatePersistentObjectiveCompletionPolicyV6({
        ...base,
        schemaVersion: PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V6_SCHEMA_VERSION,
        routeInterceptionMode: "time_to_interception_completion_race",
        ...overrides,
    });
};
