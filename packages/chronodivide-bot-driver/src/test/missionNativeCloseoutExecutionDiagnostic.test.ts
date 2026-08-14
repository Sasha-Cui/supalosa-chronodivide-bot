import { describe, expect, it } from "vitest";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { BuildingEliminationTelemetryEvent } from
    "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/buildingEliminationMission.js";
import {
    classifyMissionNativeCloseoutExecution,
    summarizeMissionNativeCloseoutExecution,
    validateMissionNativeCloseoutExecutionTelemetry,
} from "../training/missionNativeCloseoutExecutionDiagnostic.js";

type Heartbeat = Extract<BuildingEliminationTelemetryEvent, { event: "execution_heartbeat" }>;

const heartbeat = (overrides: Partial<Heartbeat> = {}): Heartbeat => ({
    schemaVersion: 5,
    event: "execution_heartbeat",
    tick: 2_700,
    targetId: 100,
    targetName: "GAPOWR",
    targetHitPoints: 750,
    targetHitPointDelta: null,
    targetVisible: true,
    blockerId: null,
    blockerName: null,
    routeThreatCount: 0,
    assignedAttackerIds: [1],
    buildingAttackerIds: [1],
    blockerAttackerIds: [],
    assignedAttackerTypes: { MTNK: 1 },
    attackStateCounts: { unknown: 1 },
    assignedAttackerCount: 1,
    buildingAttackerCount: 1,
    blockerAttackerCount: 0,
    inRangeBuildingAttackerCount: 0,
    totalAssignedHitPoints: 400,
    totalBuildingAttackerHitPoints: 400,
    totalBlockerAttackerHitPoints: 0,
    idleAttackerCount: 0,
    movingAttackerCount: 1,
    minimumDistanceToFiringPerimeter: 5,
    medianDistanceToFiringPerimeter: 5,
    maximumDistanceToFiringPerimeter: 5,
    minimumDistanceDelta: null,
    medianDistanceDelta: null,
    noLongerAssignedUnitIds: [],
    destroyedAssignedUnitIds: [],
    directBuildingAttackCommandCount: 1,
    moveTowardBuildingCommandCount: 0,
    blockerAttackCommandCount: 0,
    ...overrides,
});

describe("mission-native closeout execution diagnostic", () => {
    it("validates a complete first heartbeat and classifies absent approach completion", () => {
        const events = [heartbeat()];
        expect(() => validateMissionNativeCloseoutExecutionTelemetry(events, Countries.USA, 0)).not.toThrow();
        expect(classifyMissionNativeCloseoutExecution(events)).toEqual(["no_approach_progress"]);
        expect(summarizeMissionNativeCloseoutExecution(events)).toMatchObject({
            heartbeatCount: 1,
            targetIds: [100],
            minimumDistanceRange: [5, 5],
            buildingDamage: 0,
        });
    });

    it("classifies near-range approach with a destroyed assigned attacker", () => {
        const events: BuildingEliminationTelemetryEvent[] = [
            heartbeat(),
            heartbeat({
                tick: 2_820,
                assignedAttackerIds: [2],
                buildingAttackerIds: [2],
                assignedAttackerTypes: { MTNK: 1 },
                minimumDistanceToFiringPerimeter: 1,
                medianDistanceToFiringPerimeter: 1,
                maximumDistanceToFiringPerimeter: 1,
                minimumDistanceDelta: -4,
                medianDistanceDelta: -4,
                targetHitPointDelta: 0,
                noLongerAssignedUnitIds: [1],
                destroyedAssignedUnitIds: [1],
            }),
        ];
        expect(() => validateMissionNativeCloseoutExecutionTelemetry(events, Countries.USA, 0)).not.toThrow();
        expect(classifyMissionNativeCloseoutExecution(events)).toEqual([
            "approach_followed_by_attacker_loss",
            "arrival_without_firing_range",
        ]);
    });

    it("distinguishes range entry without damage from successful physical damage", () => {
        const inRange = heartbeat({
            inRangeBuildingAttackerCount: 1,
            minimumDistanceToFiringPerimeter: 0,
            medianDistanceToFiringPerimeter: 0,
            maximumDistanceToFiringPerimeter: 0,
        });
        expect(classifyMissionNativeCloseoutExecution([inRange])).toEqual([
            "firing_range_without_physical_damage",
        ]);
        const damaged: BuildingEliminationTelemetryEvent[] = [
            inRange,
            {
                schemaVersion: 2,
                event: "target_progress",
                tick: 2_703,
                targetId: 100,
                targetName: "GAPOWR",
                hitPoints: 700,
                previousHitPoints: 750,
                damage: 50,
            },
        ];
        expect(classifyMissionNativeCloseoutExecution(damaged)).toEqual(["successful_physical_damage"]);
    });

    it("classifies direct-command distance reversal as execution oscillation", () => {
        const events = [
            heartbeat(),
            heartbeat({
                tick: 2_820,
                minimumDistanceToFiringPerimeter: 1,
                medianDistanceToFiringPerimeter: 1,
                maximumDistanceToFiringPerimeter: 1,
                minimumDistanceDelta: -4,
                medianDistanceDelta: -4,
                targetHitPointDelta: 0,
            }),
            heartbeat({
                tick: 2_940,
                minimumDistanceToFiringPerimeter: 3,
                medianDistanceToFiringPerimeter: 3,
                maximumDistanceToFiringPerimeter: 3,
                minimumDistanceDelta: 2,
                medianDistanceDelta: 2,
                targetHitPointDelta: 0,
            }),
        ];
        expect(classifyMissionNativeCloseoutExecution(events)).toEqual([
            "arrival_without_firing_range",
            "direct_order_replacement_or_oscillation",
        ]);
    });

    it("rejects a heartbeat whose unit allocation does not reconcile", () => {
        const invalid = heartbeat({ blockerAttackerCount: 1, blockerAttackCommandCount: 1 });
        expect(() => validateMissionNativeCloseoutExecutionTelemetry(
            [invalid],
            Countries.USA,
            0,
        )).toThrow(/allocation drifted/);
    });
});
