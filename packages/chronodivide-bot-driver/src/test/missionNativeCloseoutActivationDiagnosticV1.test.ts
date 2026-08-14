import { describe, expect, it } from "vitest";
import { SideType } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { BuildingEliminationTelemetryEvent } from
    "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/buildingEliminationMission.js";
import { validateMissionNativeCloseoutActivationDiagnosticV1Telemetry } from
    "../training/missionNativeCloseoutActivationDiagnosticV1.js";

const valid = (): BuildingEliminationTelemetryEvent[] => [
    {
        schemaVersion: 6,
        event: "readiness_reserve",
        tick: 2_700,
        phase: "created",
        stagedCombatants: 0,
        eligibleCombatants: 2,
        vanguardCombatants: 2,
    },
    {
        schemaVersion: 14,
        event: "assault_production",
        tick: 3_000,
        side: SideType.GDI,
        unitName: "MTNK",
        targetCount: 4,
        currentCount: 0,
        requested: true,
        available: true,
        credits: 2_000,
        vehicleQueueStatus: 1,
        vehicleQueueItems: [{ name: "MTNK", quantity: 1 }],
    },
    {
        schemaVersion: 17,
        event: "assault_screen_production",
        tick: 3_000,
        side: SideType.GDI,
        unitName: "E1",
        targetCount: 4,
        currentCount: 2,
        mainTankPresent: false,
        requested: true,
        factoryCount: 1,
        factoryTriggerActive: true,
        readinessOwned: true,
    },
    {
        schemaVersion: 12,
        event: "activation_evaluation",
        tick: 3_000,
        phase: "blocked",
        targetId: 10,
        targetName: "NAWEAP",
        blockerId: 20,
        blockerName: "HTNK",
        compatibleAttackerCount: 3,
        totalCompatibleAttackerCount: 4,
        transferCertifiedAttackerCount: 3,
        stagedCompatibleAttackerCount: 2,
        vanguardCompatibleAttackerCount: 1,
        assaultTankCount: 1,
        routeThreatCount: 2,
        estimatedBuildingCompletionTicks: 300,
        estimatedForceSurvivalTicks: 100,
        estimatedBlockerRemovalTicks: 200,
        estimatedRouteClearanceTicks: 250,
    },
];

describe("mission-native closeout activation diagnostic v1", () => {
    it("accepts a coherent blocked schema-12 certificate", () => {
        expect(() => validateMissionNativeCloseoutActivationDiagnosticV1Telemetry(
            valid(), Countries.USA,
        )).not.toThrow();
    });

    it("rejects inconsistent staged and vanguard counts", () => {
        const telemetry = valid().map((event) => event.event === "activation_evaluation"
            ? { ...event, vanguardCompatibleAttackerCount: 2 }
            : event);
        expect(() => validateMissionNativeCloseoutActivationDiagnosticV1Telemetry(
            telemetry as BuildingEliminationTelemetryEvent[], Countries.USA,
        )).toThrow(/schema-12/);
    });

    it("rejects a blocker-ready certificate that loses the survival race", () => {
        const telemetry = valid().map((event) => event.event === "activation_evaluation"
            ? { ...event, phase: "blocker_ready" as const }
            : event);
        expect(() => validateMissionNativeCloseoutActivationDiagnosticV1Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/blocker-clearance/);
    });

    it("validates a complete post-activation handoff partition", () => {
        const telemetry: BuildingEliminationTelemetryEvent[] = [
            ...valid().map((event) => event.event === "activation_evaluation"
                ? { ...event, phase: "building_ready" as const, blockerId: null, blockerName: null }
                : event),
            {
                schemaVersion: 1,
                event: "activated",
                tick: 3_001,
                observationMode: "publicApi",
                ownCombatants: 3,
                enemyCombatants: 5,
                reservedCombatants: 0,
                preemptedMissions: ["attack_main"],
            },
            {
                schemaVersion: 10,
                event: "launch_handoff",
                tick: 3_002,
                expectedStagedUnitIds: [1, 2, 3],
                assignedExpectedUnitIds: [1],
                destroyedExpectedUnitIds: [2],
                aliveUnassignedExpectedUnitIds: [3],
            },
        ];
        expect(() => validateMissionNativeCloseoutActivationDiagnosticV1Telemetry(
            telemetry, Countries.USA,
        )).not.toThrow();
    });

    it("rejects an incomplete handoff partition", () => {
        const telemetry: BuildingEliminationTelemetryEvent[] = [
            ...valid().map((event) => event.event === "activation_evaluation"
                ? { ...event, phase: "building_ready" as const, blockerId: null, blockerName: null }
                : event),
            {
                schemaVersion: 1,
                event: "activated",
                tick: 3_001,
                observationMode: "publicApi",
                ownCombatants: 3,
                enemyCombatants: 5,
                reservedCombatants: 0,
                preemptedMissions: [],
            },
            {
                schemaVersion: 10,
                event: "launch_handoff",
                tick: 3_002,
                expectedStagedUnitIds: [1, 2],
                assignedExpectedUnitIds: [1],
                destroyedExpectedUnitIds: [],
                aliveUnassignedExpectedUnitIds: [],
            },
        ];
        expect(() => validateMissionNativeCloseoutActivationDiagnosticV1Telemetry(
            telemetry, Countries.USA,
        )).toThrow(/partition/);
    });
});
