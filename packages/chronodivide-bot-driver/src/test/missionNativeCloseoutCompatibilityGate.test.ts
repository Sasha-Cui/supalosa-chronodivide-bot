import { describe, expect, it, vi } from "vitest";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { BuildingEliminationTelemetryEvent } from
    "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/buildingEliminationMission.js";
import {
    installSuppressedMissionNativeCloseoutQuitAudit,
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
        schemaVersion: 3,
        event: "engagement_decision",
        tick: 2_703,
        phase: "building_strike",
        reason: "building_completion_race",
        targetId: 100,
        targetName: "GAPOWR",
        targetHitPoints: 1_000,
        blockerId: null,
        blockerName: null,
        ownedAttackerCount: 4,
        assignedAttackerCount: 4,
        routeThreatCount: 2,
        estimatedBuildingCompletionTicks: 120,
        estimatedForceSurvivalTicks: 180,
        earliestRouteThreatInterceptTicks: 30,
    },
    {
        schemaVersion: 4,
        event: "engagement_allocation",
        tick: 2_703,
        targetId: 100,
        targetName: "GAPOWR",
        blockerId: null,
        blockerName: null,
        assignedAttackerCount: 4,
        buildingAttackerCount: 4,
        blockerAttackerCount: 0,
        inRangeBuildingAttackerCount: 0,
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
    it("counts but cannot execute Supalosa's nonliteral resignation action", () => {
        const originalQuitGame = vi.fn();
        const actions = { quitGame: originalQuitGame } as any;
        const audit = { attempts: 0 };
        installSuppressedMissionNativeCloseoutQuitAudit(actions, audit);

        actions.quitGame();
        actions.quitGame();

        expect(audit.attempts).toBe(2);
        expect(originalQuitGame).not.toHaveBeenCalled();
    });

    it("accepts persistent mission ownership and physical building damage", () => {
        expect(() => validateMissionNativeCloseoutExposure(trace(), Countries.USA, 0)).not.toThrow();
        expect(summarizeMissionNativeCloseoutTelemetry(trace())).toMatchObject({
            buildingDamageEvents: 1,
            buildingDamage: 100,
            targetIds: [100],
            targetNames: ["GAPOWR"],
            attackerCountRange: [4, 4],
            assignedAttackerCountRange: [4, 4],
            engagementPhases: { building_strike: 1 },
            engagementReasons: { building_completion_race: 1 },
            estimatedBuildingCompletionTickRange: [120, 120],
            estimatedForceSurvivalTickRange: [180, 180],
            buildingAttackerCountRange: [4, 4],
            blockerAttackerCountRange: [0, 0],
            pureBuildingAllocationCount: 1,
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

    it("rejects a building-race decision whose timing certificate contradicts it", () => {
        const events = trace();
        const decision = events.find((event) => event.event === "engagement_decision") as Extract<
            BuildingEliminationTelemetryEvent,
            { event: "engagement_decision" }
        >;
        decision.estimatedBuildingCompletionTicks = 181;
        expect(() => validateMissionNativeCloseoutExposure(events, Countries.USA, 0)).toThrow(
            /building-completion certificate/,
        );
    });

    it("accepts a blocker only with a route-interception certificate", () => {
        const events = trace();
        const decision = events.find((event) => event.event === "engagement_decision") as Extract<
            BuildingEliminationTelemetryEvent,
            { event: "engagement_decision" }
        >;
        Object.assign(decision, {
            phase: "blocker_clear",
            reason: "route_interception_wins",
            blockerId: 400,
            blockerName: "HTNK",
            estimatedBuildingCompletionTicks: 181,
            estimatedForceSurvivalTicks: 180,
        });
        const allocation = events.find((event) => event.event === "engagement_allocation") as Extract<
            BuildingEliminationTelemetryEvent,
            { event: "engagement_allocation" }
        >;
        Object.assign(allocation, {
            blockerId: 400,
            blockerName: "HTNK",
            buildingAttackerCount: 3,
            blockerAttackerCount: 1,
        });
        events.push({
            ...decision,
            phase: "building_strike",
            reason: "building_in_range",
            blockerId: null,
            blockerName: null,
        });
        expect(() => validateMissionNativeCloseoutExposure(events, Countries.USA, 0)).not.toThrow();
    });

    it("rejects an allocation that diverts more than one attacker", () => {
        const events = trace();
        const allocation = events.find((event) => event.event === "engagement_allocation") as Extract<
            BuildingEliminationTelemetryEvent,
            { event: "engagement_allocation" }
        >;
        Object.assign(allocation, {
            blockerId: 400,
            blockerName: "E1",
            buildingAttackerCount: 1,
            blockerAttackerCount: 3,
        });
        expect(() => validateMissionNativeCloseoutExposure(events, Countries.USA, 0)).toThrow(
            /single-screen allocation/,
        );
    });
});
