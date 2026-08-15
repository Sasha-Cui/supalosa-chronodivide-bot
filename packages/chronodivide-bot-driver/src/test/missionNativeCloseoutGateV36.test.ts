import { describe, expect, it } from "vitest";
import { validateMissionNativeCloseoutV36ProgressTelemetry } from
    "../training/missionNativeCloseoutGateV36.js";

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

const active = (tick: number, owner = false) => ({
    ...start(400),
    tick,
    phase: "fallback_active",
    suspendedOverlayMissionNames: tick === 400 ? ["buildingEliminationAssaultBuild"] : [],
    activePredecessorMissionNames: owner ? ["attack_480"] : [],
});

describe("mission-native closeout V36 progress telemetry", () => {
    it("accepts the ordinary predecessor-owned fallback path", () => {
        const telemetry = [
            start(400),
            active(400),
            active(520, true),
            { ...start(400), tick: 580, phase: "replan_started", activePredecessorMissionNames: ["attack_480"] },
        ];
        expect(validateMissionNativeCloseoutV36ProgressTelemetry(telemetry as any, 600)).toEqual({
            predecessorOwnedFallbacks: 1,
            noOwnerRecoveries: 0,
            incompleteFallbacks: 0,
        });
    });

    it("accepts exact no-owner recovery at the grace boundary", () => {
        const telemetry = [
            start(400),
            active(400),
            active(520),
            {
                schemaVersion: 30,
                event: "objective_progress_recovery",
                tick: 520,
                phase: "fallback_no_predecessor_replan",
                reason: "building_no_progress",
                targetId: 10,
                blockerId: null,
                fallbackStartedTick: 400,
                predecessorOwnershipGraceTicks: 120,
                predecessorOwnershipGraceUntilTick: 520,
                plannedFallbackUntilTick: 580,
                releasedUnitIds: [1, 2],
                suspendedOverlayMissionNames: [],
                activePredecessorMissionNames: [],
            },
        ];
        expect(validateMissionNativeCloseoutV36ProgressTelemetry(telemetry as any, 600)).toEqual({
            predecessorOwnedFallbacks: 0,
            noOwnerRecoveries: 1,
            incompleteFallbacks: 0,
        });
        (telemetry[3] as any).tick = 521;
        expect(() => validateMissionNativeCloseoutV36ProgressTelemetry(telemetry as any, 600))
            .toThrow(/exact contract/);
    });

    it("allows only a cap-truncated no-owner interval before its grace boundary", () => {
        const telemetry = [start(500), {
            ...active(500),
            fallbackUntilTick: 680,
            suspendedOverlayMissionNames: ["buildingEliminationAssaultBuild"],
        }];
        expect(validateMissionNativeCloseoutV36ProgressTelemetry(telemetry as any, 600)).toEqual({
            predecessorOwnedFallbacks: 0,
            noOwnerRecoveries: 0,
            incompleteFallbacks: 1,
        });
    });
});
