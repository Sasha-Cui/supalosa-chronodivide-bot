import { createHash } from "node:crypto";
import {
    PersistentObjectiveCompletionPolicyV3,
    buildPersistentObjectiveCompletionPolicyV3,
    validatePersistentObjectiveCompletionPolicyV3,
} from "./persistentObjectiveCompletionPolicyV3.js";

export const PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V4_SCHEMA_VERSION = 8 as const;

export type PersistentObjectiveCompletionPolicyV4 = Omit<
    PersistentObjectiveCompletionPolicyV3,
    "schemaVersion"
> & {
    schemaVersion: typeof PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V4_SCHEMA_VERSION;
    routeInterceptionMode: "preemptive_damage_capable_threats";
};

const exactKeys: Array<keyof PersistentObjectiveCompletionPolicyV4> = [
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

export const validatePersistentObjectiveCompletionPolicyV4 = (
    policy: PersistentObjectiveCompletionPolicyV4,
): PersistentObjectiveCompletionPolicyV4 => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Persistent objective-completion policy v4 has an invalid exact schema");
    }
    if (policy.schemaVersion !== PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V4_SCHEMA_VERSION) {
        throw new Error(
            `Persistent objective-completion policy v4 schemaVersion must be ${PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V4_SCHEMA_VERSION}`,
        );
    }
    if (policy.routeInterceptionMode !== "preemptive_damage_capable_threats") {
        throw new Error("Persistent objective-completion policy v4 route interception mode is invalid");
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

export const persistentObjectiveCompletionPolicyV4Sha256 = (
    policy: PersistentObjectiveCompletionPolicyV4,
): string => createHash("sha256")
    .update(canonical(validatePersistentObjectiveCompletionPolicyV4(policy)))
    .digest("hex");

export const buildPersistentObjectiveCompletionPolicyV4 = (
    overrides: Partial<PersistentObjectiveCompletionPolicyV4> = {},
): PersistentObjectiveCompletionPolicyV4 => {
    const { schemaVersion: _schemaVersion, ...base } = buildPersistentObjectiveCompletionPolicyV3();
    return validatePersistentObjectiveCompletionPolicyV4({
        ...base,
        schemaVersion: PERSISTENT_OBJECTIVE_COMPLETION_POLICY_V4_SCHEMA_VERSION,
        routeInterceptionMode: "preemptive_damage_capable_threats",
        ...overrides,
    });
};
