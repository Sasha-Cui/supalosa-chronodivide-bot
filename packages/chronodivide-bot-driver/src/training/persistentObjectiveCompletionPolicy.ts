import { createHash } from "node:crypto";

export const PERSISTENT_OBJECTIVE_COMPLETION_POLICY_SCHEMA_VERSION = 5 as const;

export const OBJECTIVE_ASSAULT_LEASE_SOURCES = [
    "unassigned_idle",
    "unassigned_available",
    "unassigned_or_unlocked_surplus",
] as const;

export const OBJECTIVE_BLOCKER_MODES = [
    "predecessor_fallback",
    "route_blocker_clear",
] as const;

export type ObjectiveAssaultLeaseSource = typeof OBJECTIVE_ASSAULT_LEASE_SOURCES[number];
export type ObjectiveBlockerMode = typeof OBJECTIVE_BLOCKER_MODES[number];

/**
 * A narrow objective-completion layer over the exact external Supalosa bot.
 *
 * The schema deliberately separates terminal commitment from earlier additive
 * pressure.  At one enemy building the reserve is zero and every compatible
 * reachable combatant may attack.  Above one building, only a bounded leased
 * surplus detachment may be overwritten; Supalosa retains economy, production,
 * scouting, defence, and ordinary attacks for every other unit.
 */
export type PersistentObjectiveCompletionPolicy = {
    schemaVersion: typeof PERSISTENT_OBJECTIVE_COMPLETION_POLICY_SCHEMA_VERSION;
    enabled: boolean;
    mechanism: "persistent_additive_objective_completion";
    informationInterface: "public_complete_state";
    terminalMinTick: number;
    assaultMinTick: number;
    assaultBuildingCount: number;
    orderIntervalTicks: number;
    leaseSource: ObjectiveAssaultLeaseSource;
    maximumAssaultCombatants: number;
    maximumAssaultFraction: number;
    ordinaryReserveCombatants: number;
    minimumOwnBuildingsForAssault: number;
    homeThreatRadius: number;
    homeReserveRadius: number;
    buildingNoProgressDeadlineTicks: number;
    blockerNoProgressDeadlineTicks: number;
    fallbackCooldownTicks: number;
    maximumLeaseTicks: number;
    routeProgressDistanceTiles: number;
    routeCorridorRadius: number;
    blockerMode: ObjectiveBlockerMode;
};

const exactKeys: Array<keyof PersistentObjectiveCompletionPolicy> = [
    "schemaVersion", "enabled", "mechanism", "informationInterface",
    "terminalMinTick", "assaultMinTick", "assaultBuildingCount",
    "orderIntervalTicks", "leaseSource", "maximumAssaultCombatants",
    "maximumAssaultFraction", "ordinaryReserveCombatants",
    "minimumOwnBuildingsForAssault", "homeThreatRadius", "homeReserveRadius",
    "buildingNoProgressDeadlineTicks", "blockerNoProgressDeadlineTicks",
    "fallbackCooldownTicks", "maximumLeaseTicks", "routeProgressDistanceTiles",
    "routeCorridorRadius", "blockerMode",
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

export const validatePersistentObjectiveCompletionPolicy = (
    policy: PersistentObjectiveCompletionPolicy,
): PersistentObjectiveCompletionPolicy => {
    const actual = Object.keys(policy).sort();
    const expected = exactKeys.slice().sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error("Persistent objective-completion policy has an invalid exact schema");
    }
    if (policy.schemaVersion !== PERSISTENT_OBJECTIVE_COMPLETION_POLICY_SCHEMA_VERSION) {
        throw new Error(
            `Persistent objective-completion schemaVersion must be ${PERSISTENT_OBJECTIVE_COMPLETION_POLICY_SCHEMA_VERSION}`,
        );
    }
    if (typeof policy.enabled !== "boolean") throw new Error("enabled must be boolean");
    if (policy.mechanism !== "persistent_additive_objective_completion") {
        throw new Error("Persistent objective-completion mechanism is invalid");
    }
    if (policy.informationInterface !== "public_complete_state") {
        throw new Error("Persistent objective completion requires public_complete_state");
    }
    if (!OBJECTIVE_ASSAULT_LEASE_SOURCES.includes(policy.leaseSource)) {
        throw new Error("Persistent objective-completion lease source is invalid");
    }
    if (!OBJECTIVE_BLOCKER_MODES.includes(policy.blockerMode)) {
        throw new Error("Persistent objective-completion blocker mode is invalid");
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
    if (policy.terminalMinTick > policy.assaultMinTick) {
        throw new Error("terminalMinTick cannot exceed assaultMinTick");
    }
    if (policy.orderIntervalTicks % 3 !== 0) {
        throw new Error("orderIntervalTicks must align with Supalosa's three-tick mission cycle");
    }
    if (policy.maximumLeaseTicks < policy.buildingNoProgressDeadlineTicks) {
        throw new Error("maximumLeaseTicks cannot be shorter than the building progress deadline");
    }
    return { ...policy };
};

const canonical = (value: unknown): string => JSON.stringify(
    Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
        left.localeCompare(right),
    )),
);

export const persistentObjectiveCompletionPolicySha256 = (
    policy: PersistentObjectiveCompletionPolicy,
): string => createHash("sha256")
    .update(canonical(validatePersistentObjectiveCompletionPolicy(policy)))
    .digest("hex");

export const buildPersistentObjectiveCompletionPolicy = (
    overrides: Partial<PersistentObjectiveCompletionPolicy> = {},
): PersistentObjectiveCompletionPolicy => validatePersistentObjectiveCompletionPolicy({
    schemaVersion: PERSISTENT_OBJECTIVE_COMPLETION_POLICY_SCHEMA_VERSION,
    enabled: true,
    mechanism: "persistent_additive_objective_completion",
    informationInterface: "public_complete_state",
    terminalMinTick: 900,
    assaultMinTick: 3_600,
    assaultBuildingCount: 16,
    orderIntervalTicks: 3,
    leaseSource: "unassigned_or_unlocked_surplus",
    maximumAssaultCombatants: 8,
    maximumAssaultFraction: 0.33,
    ordinaryReserveCombatants: 4,
    minimumOwnBuildingsForAssault: 2,
    homeThreatRadius: 12,
    homeReserveRadius: 10,
    buildingNoProgressDeadlineTicks: 300,
    blockerNoProgressDeadlineTicks: 240,
    fallbackCooldownTicks: 180,
    maximumLeaseTicks: 1_800,
    routeProgressDistanceTiles: 1,
    routeCorridorRadius: 3,
    blockerMode: "route_blocker_clear",
    ...overrides,
});
