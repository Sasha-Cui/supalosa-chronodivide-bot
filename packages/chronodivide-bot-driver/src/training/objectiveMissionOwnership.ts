export type ObjectiveMissionAssignment = {
    missionName: string;
    locked: boolean;
    priority: number;
};

export type ObjectiveMissionRecord = ObjectiveMissionAssignment & {
    unitIds: number[];
};

export type ObjectiveMissionOwnershipFailure =
    | "controller_unavailable"
    | "get_missions_threw"
    | "missions_not_array"
    | "malformed_mission"
    | "mission_read_threw"
    | "invalid_mission_name"
    | "duplicate_mission_name"
    | "invalid_locked_flag"
    | "invalid_priority"
    | "unit_ids_not_array"
    | "invalid_unit_id"
    | "duplicate_unit_within_mission"
    | "duplicate_unit_ownership";

export type ObjectiveMissionOwnershipSnapshot = {
    ok: true;
    assignments: ReadonlyMap<number, ObjectiveMissionAssignment>;
    missions: readonly ObjectiveMissionRecord[];
};

export type ObjectiveMissionOwnershipResult = ObjectiveMissionOwnershipSnapshot | {
    ok: false;
    reason: ObjectiveMissionOwnershipFailure;
    detail: string;
};

type MissionLike = {
    getUnitIds(): unknown;
    getUniqueName(): unknown;
    isUnitsLocked(): unknown;
    getPriority(): unknown;
};

type MissionControllerLike = {
    getMissions(): unknown;
};

const failure = (
    reason: ObjectiveMissionOwnershipFailure,
    detail: string,
): ObjectiveMissionOwnershipResult => ({ ok: false, reason, detail });

const missionInterfaceIsPresent = (value: unknown): value is MissionLike => {
    if (!value || typeof value !== "object") return false;
    const mission = value as Partial<MissionLike>;
    return typeof mission.getUnitIds === "function" &&
        typeof mission.getUniqueName === "function" &&
        typeof mission.isUnitsLocked === "function" &&
        typeof mission.getPriority === "function";
};

/**
 * Capture the pinned Supalosa mission interface once and fail closed on every
 * structural ambiguity. Returned arrays and assignment records do not alias
 * the controller's live mission arrays.
 */
export const readObjectiveMissionOwnership = (
    missionController: unknown,
): ObjectiveMissionOwnershipResult => {
    if (
        !missionController || typeof missionController !== "object" ||
        typeof (missionController as Partial<MissionControllerLike>).getMissions !== "function"
    ) {
        return failure("controller_unavailable", "getMissions is unavailable");
    }

    let liveMissions: unknown;
    try {
        liveMissions = (missionController as MissionControllerLike).getMissions();
    } catch (error) {
        return failure("get_missions_threw", String(error));
    }
    if (!Array.isArray(liveMissions)) {
        return failure("missions_not_array", "getMissions did not return an array");
    }
    const missions = liveMissions.slice();
    const assignments = new Map<number, ObjectiveMissionAssignment>();
    const missionNames = new Set<string>();
    const records: ObjectiveMissionRecord[] = [];

    for (let index = 0; index < missions.length; index += 1) {
        const mission = missions[index];
        if (!missionInterfaceIsPresent(mission)) {
            return failure("malformed_mission", `mission ${index} lacks the pinned public interface`);
        }
        let missionName: unknown;
        let locked: unknown;
        let priority: unknown;
        let liveUnitIds: unknown;
        try {
            missionName = mission.getUniqueName();
            locked = mission.isUnitsLocked();
            priority = mission.getPriority();
            liveUnitIds = mission.getUnitIds();
        } catch (error) {
            return failure("mission_read_threw", `mission ${index}: ${String(error)}`);
        }
        if (typeof missionName !== "string" || missionName.length === 0) {
            return failure("invalid_mission_name", `mission ${index} has no stable nonempty name`);
        }
        if (missionNames.has(missionName)) {
            return failure("duplicate_mission_name", `mission name ${missionName} is duplicated`);
        }
        if (typeof locked !== "boolean") {
            return failure("invalid_locked_flag", `mission ${missionName} has a non-boolean lock flag`);
        }
        if (typeof priority !== "number" || !Number.isFinite(priority)) {
            return failure("invalid_priority", `mission ${missionName} has a non-finite priority`);
        }
        if (!Array.isArray(liveUnitIds)) {
            return failure("unit_ids_not_array", `mission ${missionName} has no unit-ID array`);
        }
        const unitIds = liveUnitIds.slice();
        const withinMission = new Set<number>();
        for (const unitId of unitIds) {
            if (typeof unitId !== "number" || !Number.isSafeInteger(unitId) || unitId < 0) {
                return failure("invalid_unit_id", `mission ${missionName} has invalid unit ID ${String(unitId)}`);
            }
            if (withinMission.has(unitId)) {
                return failure(
                    "duplicate_unit_within_mission",
                    `mission ${missionName} repeats unit ${unitId}`,
                );
            }
            if (assignments.has(unitId)) {
                return failure("duplicate_unit_ownership", `unit ${unitId} has multiple mission owners`);
            }
            withinMission.add(unitId);
            assignments.set(unitId, { missionName, locked, priority });
        }
        missionNames.add(missionName);
        records.push({ missionName, locked, priority, unitIds });
    }

    return {
        ok: true,
        assignments,
        missions: records,
    };
};

export const isObjectiveOffensiveMissionName = (missionName: string): boolean =>
    missionName.startsWith("attack_") || missionName === "allInAttack" || missionName === "navalAssault";

export const canonicalObjectiveMissionMembership = (
    snapshot: ObjectiveMissionOwnershipSnapshot,
): ObjectiveMissionRecord[] => snapshot.missions
    .map((mission) => ({ ...mission, unitIds: mission.unitIds.slice().sort((left, right) => left - right) }))
    .sort((left, right) => left.missionName.localeCompare(right.missionName));
