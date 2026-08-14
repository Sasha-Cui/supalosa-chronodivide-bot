import { describe, expect, it } from "vitest";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import {
    summarizePersistentObjectiveCompatibilityTelemetry,
    validatePersistentObjectiveCompatibilityExposure,
} from "../training/persistentObjectiveCompatibilityGate.js";
import { PersistentObjectiveCompletionTelemetry } from "../training/persistentObjectiveCompletionStrategy.js";

const decision = (
    changes: Partial<PersistentObjectiveCompletionTelemetry> = {},
): PersistentObjectiveCompletionTelemetry => ({
    schemaVersion: 4,
    event: "objective_completion_decision",
    informationInterface: "public_complete_state",
    tick: 3,
    phase: "building_strike",
    reason: "persistent_additive_building_pressure",
    exactEnemyBuildingCount: 3,
    ownBuildingCount: 4,
    terminal: false,
    targetId: 100,
    targetRulesName: "GACNST",
    targetArmor: "8",
    targetHitPoints: 1_000,
    blockerId: null,
    blockerRulesName: null,
    selectedAttackerIds: [1],
    selectedAttackerRulesNames: ["MTNK"],
    buildingDamageSincePreviousDecision: 100,
    blockerDamageSincePreviousDecision: 0,
    routeProgressSincePreviousDecision: 1,
    estimatedBuildingCompletionTicks: 100,
    estimatedDetachmentSurvivalTicks: 200,
    routeThreatCount: 1,
    earliestRouteThreatInterceptTicks: 10,
    homeThreatened: false,
    issuedOrder: "attack_building",
    unitDiagnostics: [{
        id: 1,
        rulesName: "MTNK",
        compatible: true,
        rejectionReason: null,
        currentAction: "moving",
        missionName: null,
        missionLocked: null,
        hasOrdinaryCompatibleWeapon: true,
        hasSpecialSecondaryMechanic: false,
        reachable: true,
        selected: true,
    }],
    ...changes,
});

describe("persistent objective outcome-blind compatibility gate", () => {
    it("accepts an actionable compatible multi-building trace", () => {
        expect(() => validatePersistentObjectiveCompatibilityExposure(
            [decision()], Countries.USA, 0,
        )).not.toThrow();
    });

    it("rejects commandeering a locked mission above the terminal state", () => {
        const row = decision({
            unitDiagnostics: [{
                ...decision().unitDiagnostics[0],
                missionName: "globalDefence.1.1",
                missionLocked: true,
            }],
        });
        expect(() => validatePersistentObjectiveCompatibilityExposure(
            [row], Countries.USA, 0,
        )).toThrow(/locked mission/);
    });

    it("accepts the three-unit minimum from three compatible locked offensive combatants", () => {
        const base = decision().unitDiagnostics[0];
        const row = decision({
            selectedAttackerIds: [1, 2, 3],
            selectedAttackerRulesNames: ["MTNK", "MTNK", "MTNK"],
            unitDiagnostics: [1, 2, 3].map((id) => ({
                ...base,
                id,
                missionName: "attack_1.1",
                missionLocked: true,
                selected: true,
            })),
        });
        expect(() => validatePersistentObjectiveCompatibilityExposure(
            [row], Countries.USA, 0,
        )).not.toThrow();
    });

    it("rejects failing to preserve the three-unit minimum objective detachment", () => {
        const base = decision().unitDiagnostics[0];
        const row = decision({
            selectedAttackerIds: [1, 2],
            selectedAttackerRulesNames: ["MTNK", "MTNK"],
            unitDiagnostics: [1, 2, 3].map((id) => ({
                ...base,
                id,
                missionName: "attack_1.1",
                missionLocked: true,
                selected: id !== 3,
            })),
        });
        expect(() => validatePersistentObjectiveCompatibilityExposure(
            [row], Countries.USA, 0,
        )).toThrow(/Minimum viable detachment/);
    });

    it("accepts a completion-race blocker clear followed by physical building damage", () => {
        const blocker = decision({
            phase: "blocker_clear",
            reason: "time_aware_completion_race_route_blocker",
            blockerId: 200,
            blockerRulesName: "E1",
            buildingDamageSincePreviousDecision: 0,
            estimatedBuildingCompletionTicks: 300,
            estimatedDetachmentSurvivalTicks: 100,
            issuedOrder: "attack_blocker",
        });
        expect(() => validatePersistentObjectiveCompatibilityExposure(
            [blocker, decision({ tick: 6 })], Countries.USA, 0,
        )).not.toThrow();
    });

    it("rejects taking more than half of a larger locked offensive mission", () => {
        const base = decision().unitDiagnostics[0];
        const row = decision({
            selectedAttackerIds: [1, 2, 3, 4, 5],
            selectedAttackerRulesNames: Array(5).fill("MTNK"),
            unitDiagnostics: Array.from({ length: 8 }, (_, index) => ({
                ...base,
                id: index + 1,
                missionName: "attack_1.1",
                missionLocked: true,
                selected: index < 5,
            })),
        });
        expect(() => validatePersistentObjectiveCompatibilityExposure(
            [row], Countries.USA, 0,
        )).toThrow(/fraction exceeded/);
    });

    it("rejects a policy label without a next-cycle movement or attack response", () => {
        const row = decision({
            unitDiagnostics: [{ ...decision().unitDiagnostics[0], currentAction: "idle" }],
        });
        expect(() => validatePersistentObjectiveCompatibilityExposure(
            [row], Countries.USA, 0,
        )).toThrow(/command response/);
    });

    it("rejects command exposure that never produces physical building damage", () => {
        expect(() => validatePersistentObjectiveCompatibilityExposure(
            [decision({ buildingDamageSincePreviousDecision: 0 })], Countries.USA, 0,
        )).toThrow(/building damage/);
    });

    it("retains per-type selection, action, rejection, and physical-progress counts", () => {
        expect(summarizePersistentObjectiveCompatibilityTelemetry([decision()])).toMatchObject({
            telemetryCount: 1,
            compatibleObservations: 1,
            selectedObservations: 1,
            selectedFractionOfCompatibleObservations: 1,
            selectedActionCounts: { moving: 1 },
            targetRulesNameCounts: { GACNST: 1 },
            blockerRulesNameCounts: {},
            selectedUnitDisappearanceTransitions: 0,
            selectedUnitDeselectionTransitions: 0,
            estimatedBuildingCompletionTicksRange: [100, 100],
            estimatedDetachmentSurvivalTicksRange: [200, 200],
            earliestRouteThreatInterceptTicksRange: [10, 10],
            routeThreatCountRange: [1, 1],
            buildingDamageEvents: 1,
            buildingDamage: 100,
            rules: {
                MTNK: {
                    observations: 1,
                    compatibleObservations: 1,
                    selectedObservations: 1,
                    selectedActionCounts: { moving: 1 },
                    missionNameCounts: {},
                    selectedMissionNameCounts: {},
                    lockedMissionNameCounts: {},
                },
            },
        });
    });
});
