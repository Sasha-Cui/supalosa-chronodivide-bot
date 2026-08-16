import { describe, expect, it } from "vitest";
import {
    canonicalObjectiveMissionMembership,
    isObjectiveOffensiveMissionName,
    readObjectiveMissionOwnership,
} from "../training/objectiveMissionOwnership.js";

const mission = (
    name: unknown = "attack_1.1",
    ids: unknown = [1, 2],
    locked: unknown = true,
    priority: unknown = 100,
) => ({
    getUniqueName: () => name,
    getUnitIds: () => ids,
    isUnitsLocked: () => locked,
    getPriority: () => priority,
});

describe("strict objective mission ownership", () => {
    it("copies the pinned mission interface into a stable snapshot", () => {
        const ids = [2, 1];
        const liveMissions = [mission("attack_1.1", ids)];
        const result = readObjectiveMissionOwnership({ getMissions: () => liveMissions });
        expect(result.ok).toBe(true);
        if (!result.ok) throw new Error(result.detail);
        ids.push(3);
        liveMissions.length = 0;
        expect(result.assignments.has(3)).toBe(false);
        expect(canonicalObjectiveMissionMembership(result)).toEqual([{
            missionName: "attack_1.1",
            locked: true,
            priority: 100,
            unitIds: [1, 2],
        }]);
    });

    it("recognizes exactly the frozen offensive mission classes", () => {
        expect(isObjectiveOffensiveMissionName("attack_7.2")).toBe(true);
        expect(isObjectiveOffensiveMissionName("allInAttack")).toBe(true);
        expect(isObjectiveOffensiveMissionName("navalAssault")).toBe(true);
        expect(isObjectiveOffensiveMissionName("attack")).toBe(false);
        expect(isObjectiveOffensiveMissionName("retreat-from-attack_7.2")).toBe(false);
        expect(isObjectiveOffensiveMissionName("globalDefence.1.1")).toBe(false);
    });

    it.each([
        [null, "controller_unavailable"],
        [{}, "controller_unavailable"],
        [{ getMissions: () => ({}) }, "missions_not_array"],
        [{ getMissions: () => [null] }, "malformed_mission"],
        [{ getMissions: () => [mission(3)] }, "invalid_mission_name"],
        [{ getMissions: () => [mission("attack_1.1", [1], "yes")] }, "invalid_locked_flag"],
        [{ getMissions: () => [mission("attack_1.1", [1], true, Number.NaN)] }, "invalid_priority"],
        [{ getMissions: () => [mission("attack_1.1", "1")] }, "unit_ids_not_array"],
        [{ getMissions: () => [mission("attack_1.1", [1.5])] }, "invalid_unit_id"],
        [{ getMissions: () => [mission("attack_1.1", [1, 1])] }, "duplicate_unit_within_mission"],
        [{ getMissions: () => [mission("a", [1]), mission("b", [1])] }, "duplicate_unit_ownership"],
        [{ getMissions: () => [mission("a", [1]), mission("a", [2])] }, "duplicate_mission_name"],
    ])("fails closed for malformed or ambiguous ownership %#", (controller, reason) => {
        const result = readObjectiveMissionOwnership(controller);
        expect(result).toMatchObject({ ok: false, reason });
    });

    it("converts thrown getters into a closed failure", () => {
        const result = readObjectiveMissionOwnership({
            getMissions: () => [{
                ...mission(),
                getUnitIds: () => { throw new Error("changed while reading"); },
            }],
        });
        expect(result).toMatchObject({ ok: false, reason: "mission_read_threw" });
    });
});
