import { describe, expect, it } from "vitest";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { BuildingEliminationTelemetryEvent } from
    "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/buildingEliminationMission.js";
import {
    summarizeMissionNativeCloseoutTelemetry,
    validateMissionNativeCloseoutExposure,
} from "../training/missionNativeCloseoutCompatibilityGate.js";

const trace = (): BuildingEliminationTelemetryEvent[] => [
    {
        schemaVersion: 1,
        event: "activated",
        tick: 2_700,
        observationMode: "publicApi",
        ownCombatants: 4,
        enemyCombatants: 100,
        reservedCombatants: 0,
        preemptedMissions: ["attack_1"],
    },
    {
        schemaVersion: 1,
        event: "target_orders",
        tick: 2_703,
        attackerCount: 4,
        targets: [{ id: 100, name: "GAPOWR", x: 20, y: 20, visible: true }],
    },
    {
        schemaVersion: 2,
        event: "assignment_summary",
        tick: 2_703,
        eligibleAttackers: 4,
        assignedAttackers: 4,
        incompatiblePairs: 0,
        unreachablePairs: 0,
        targetCount: 1,
    },
    {
        schemaVersion: 2,
        event: "target_progress",
        tick: 2_706,
        targetId: 100,
        targetName: "GAPOWR",
        hitPoints: 900,
        previousHitPoints: 1_000,
        damage: 100,
    },
];

describe("mission-native closeout outcome-blind gate", () => {
    it("accepts persistent mission ownership and physical building damage", () => {
        expect(() => validateMissionNativeCloseoutExposure(trace(), Countries.USA, 0)).not.toThrow();
        expect(summarizeMissionNativeCloseoutTelemetry(trace())).toMatchObject({
            buildingDamageEvents: 1,
            buildingDamage: 100,
            targetIds: [100],
            targetNames: ["GAPOWR"],
            attackerCountRange: [4, 4],
            assignedAttackerCountRange: [4, 4],
            preemptedMissions: ["attack_1"],
        });
    });

    it("rejects command exposure without physical damage", () => {
        expect(() => validateMissionNativeCloseoutExposure(
            trace().filter(({ event }) => event !== "target_progress"),
            Countries.USA,
            0,
        )).toThrow(/physical building damage/);
    });

    it("rejects parallel targets and unfrozen sweep behavior", () => {
        const events = trace();
        const order = events.find((event) => event.event === "target_orders") as Extract<
            BuildingEliminationTelemetryEvent,
            { event: "target_orders" }
        >;
        order.targets.push({ id: 101, name: "GAREFN", x: 30, y: 30, visible: true });
        expect(() => validateMissionNativeCloseoutExposure(events, Countries.USA, 0)).toThrow(/single-target/);
    });
});
