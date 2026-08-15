import { describe, expect, it } from "vitest";
import { validateMissionNativeCloseoutV37ProgressTelemetry } from
    "../training/missionNativeCloseoutGateV37.js";

const start = (tick: number) => ({
    schemaVersion: 29,
    event: "objective_progress_deadline",
    tick,
    phase: "fallback_started",
    reason: "building_no_progress",
    targetId: 10,
    blockerId: null,
    lastCertifiedProgressTick: tick - 300,
    deadlineTicks: 300,
    fallbackUntilTick: tick + 180,
    releasedUnitIds: [1, 2],
    suspendedOverlayMissionNames: [],
    activePredecessorMissionNames: [],
});

const active = (tick: number, owner = false, startTick = 400) => ({
    ...start(startTick),
    tick,
    phase: "fallback_active",
    suspendedOverlayMissionNames: tick === startTick ? ["buildingEliminationAssaultBuild"] : [],
    activePredecessorMissionNames: owner ? ["attack_480"] : [],
});

const ownership = (tick: number, startTick = 400) => ({
    schemaVersion: 31,
    event: "objective_predecessor_ownership",
    tick,
    phase: "fallback_predecessor_ownership_observed",
    reason: "building_no_progress",
    targetId: 10,
    blockerId: null,
    fallbackStartedTick: startTick,
    plannedFallbackUntilTick: startTick + 180,
    releasedUnitIds: [1, 2],
    activePredecessorMissionNames: ["attack_480"],
});

const recovery = (tick: number, startTick = 400) => ({
    schemaVersion: 30,
    event: "objective_progress_recovery",
    tick,
    phase: "fallback_no_predecessor_replan",
    reason: "building_no_progress",
    targetId: 10,
    blockerId: null,
    fallbackStartedTick: startTick,
    predecessorOwnershipGraceTicks: 120,
    predecessorOwnershipGraceUntilTick: startTick + 120,
    plannedFallbackUntilTick: startTick + 180,
    releasedUnitIds: [1, 2],
    suspendedOverlayMissionNames: [],
    activePredecessorMissionNames: [],
});

const summary = (overrides: Partial<ReturnType<typeof validateMissionNativeCloseoutV37ProgressTelemetry>> = {}) => ({
    predecessorOwnedFallbacks: 0,
    noOwnerRecoveries: 0,
    ownershipLossRecoveries: 0,
    incompleteFallbacks: 0,
    ownershipObservations: 0,
    ...overrides,
});

describe("mission-native closeout V37 progress telemetry", () => {
    it("accepts a predecessor that remains active through the fallback", () => {
        const telemetry = [
            start(400),
            active(400),
            ownership(430),
            active(430, true),
            active(520, true),
            { ...start(400), tick: 580, phase: "replan_started", activePredecessorMissionNames: ["attack_480"] },
        ];
        expect(validateMissionNativeCloseoutV37ProgressTelemetry(telemetry as any, 600)).toEqual(summary({
            predecessorOwnedFallbacks: 1,
            ownershipObservations: 1,
        }));
    });

    it("accepts a never-owned fallback recovered at the grace boundary", () => {
        const telemetry = [start(400), active(400), active(520), recovery(520)];
        expect(validateMissionNativeCloseoutV37ProgressTelemetry(telemetry as any, 600)).toEqual(summary({
            noOwnerRecoveries: 1,
        }));
    });

    it("accepts recovery after a transient predecessor loses ownership", () => {
        const telemetry = [
            start(400),
            active(400),
            ownership(430),
            active(430, true),
            active(520),
            recovery(520),
        ];
        expect(validateMissionNativeCloseoutV37ProgressTelemetry(telemetry as any, 600)).toEqual(summary({
            ownershipLossRecoveries: 1,
            ownershipObservations: 1,
        }));
    });

    it("allows only a trace-boundary-truncated fallback before its grace boundary", () => {
        const telemetry = [start(500), active(500, false, 500)];
        expect(validateMissionNativeCloseoutV37ProgressTelemetry(telemetry as any, 600)).toEqual(summary({
            incompleteFallbacks: 1,
        }));
    });

    it("rejects a historical-owner latch after current ownership disappears", () => {
        const telemetry = [start(400), active(400), ownership(430), active(430, true), active(520)];
        expect(() => validateMissionNativeCloseoutV37ProgressTelemetry(telemetry as any, 600))
            .toThrow(/ownerless post-grace/);
    });
});
