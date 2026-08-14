import { describe, expect, test } from "vitest";
import { Mission, MissionAction, noop } from "@supalosa/chronodivide-bot/dist/bot/logic/mission/mission.js";
import {
    canTransferSpecificUnit,
    releaseTransferDisbandedUnits,
} from "@supalosa/chronodivide-bot/dist/bot/logic/mission/missionController.js";

class TestMission extends Mission {
    constructor(
        name: string,
        private priority: number,
        private locked: boolean,
        private acceptedRecipient: string | null = null,
    ) {
        super(name, () => undefined);
    }

    _onAiUpdate(): MissionAction {
        return noop();
    }

    getGlobalDebugText(): string | undefined {
        return undefined;
    }

    getPriority(): number {
        return this.priority;
    }

    isUnitsLocked(): boolean {
        return this.locked;
    }

    canDonateLockedUnitsTo(requestingMission: Mission<any>): boolean {
        return requestingMission.getUniqueName() === this.acceptedRecipient;
    }
}

describe("specific mission transfers", () => {
    const closeout = new TestMission("buildingElimination", 300, true);

    test("allows a higher-priority closeout to take an explicitly donated defender", () => {
        const defence = new TestMission("globalDefence.1.2", 100, true, "buildingElimination");
        expect(canTransferSpecificUnit(defence, closeout, 300)).toBe(true);
    });

    test("preserves locked units without consent and never lets lower priority steal", () => {
        const locked = new TestMission("scout", 10, true);
        const higher = new TestMission("critical", 400, false);
        expect(canTransferSpecificUnit(locked, closeout, 300)).toBe(false);
        expect(canTransferSpecificUnit(higher, closeout, 300)).toBe(false);
        expect(canTransferSpecificUnit(undefined, closeout, 300)).toBe(true);
        expect(canTransferSpecificUnit(closeout, closeout, 300)).toBe(false);
    });

    test("allows the frozen readiness reserve to yield to the closeout handoff", () => {
        const readinessReserve = new TestMission(
            "buildingEliminationReadinessReserve",
            290,
            true,
            "buildingElimination",
        );
        expect(canTransferSpecificUnit(readinessReserve, closeout, 300)).toBe(true);
    });

    test("empties a transfer-disbanded locked donor before same-update transfer", () => {
        let completionUnitIds: number[] | null = null;
        const donor = new TestMission("attack_12", 100, true).withOnFinish((unitIds) => {
            completionUnitIds = [...unitIds];
        });
        donor.addUnit(71);
        donor.addUnit(72);
        const ownerMap = new Map<number, Mission<any>>([[71, donor], [72, donor]]);
        expect(canTransferSpecificUnit(ownerMap.get(71), closeout, 300)).toBe(false);
        expect(releaseTransferDisbandedUnits(
            [donor, closeout],
            new Set([donor.getUniqueName()]),
            ownerMap,
        )).toEqual([71, 72]);
        expect(donor.getUnitIds()).toEqual([]);
        donor.endMission(undefined);
        expect(completionUnitIds).toEqual([]);
        expect(canTransferSpecificUnit(ownerMap.get(71), closeout, 300)).toBe(true);
        expect(ownerMap.size).toBe(0);
    });
});
