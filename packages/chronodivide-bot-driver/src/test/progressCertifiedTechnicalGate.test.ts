import { describe, expect, it } from "vitest";
import {
    parseProgressCertifiedSacct,
    validateProgressCertifiedTelemetry,
} from "../training/progressCertifiedTechnicalGate.js";
import {
    PROGRESS_CERTIFIED_COMPATIBILITY_SHA256,
    PROGRESS_CERTIFIED_ENGINE_SEED_BASE,
    PROGRESS_CERTIFIED_INVALIDATED_V1_RECORD_SHA256,
    PROGRESS_CERTIFIED_PROTOCOL_SHA256,
    PROGRESS_CERTIFIED_SHARD_COUNT,
} from "../training/progressCertifiedCampaign.js";

describe("progress-certified technical gate", () => {
    it("freezes the fresh v2 evidence boundary", () => {
        expect(PROGRESS_CERTIFIED_ENGINE_SEED_BASE).toBe(4_230_000_000);
        expect(PROGRESS_CERTIFIED_PROTOCOL_SHA256).toBe(
            "8eaa60b69becae5bf4afc6399bdad81fa0c81e8b6e7897a738fec4ea83081f96",
        );
        expect(PROGRESS_CERTIFIED_COMPATIBILITY_SHA256).toBe(
            "218d3d92790ecbbf432af3f9a6d9be7d5816b8d1675dfe798937433a085162c6",
        );
        expect(PROGRESS_CERTIFIED_INVALIDATED_V1_RECORD_SHA256).toBe(
            "c9fb77520d58a1a2f1b1dc7ed7980a0cb5e34721817a2f0c63b587dbdd6860b2",
        );
    });

    it("accepts exactly 90 clean pi_jss233 scheduler tasks", () => {
        const rows = Array.from({ length: PROGRESS_CERTIFIED_SHARD_COUNT }, (_, index) =>
            `123_${index}|${9000 + index}|COMPLETED|0:0|pi_jss233`,
        ).join("\n");
        expect(parseProgressCertifiedSacct(rows, "123").size).toBe(PROGRESS_CERTIFIED_SHARD_COUNT);
        expect(() => parseProgressCertifiedSacct(rows.replace("pi_jss233", "other"), "123")).toThrow();
        expect(() => parseProgressCertifiedSacct(rows.split("\n").slice(1).join("\n"), "123")).toThrow();
    });

    it("accepts physical-progress evidence and final-building reserve release", () => {
        const event = validateProgressCertifiedTelemetry({
            schemaVersion: 3,
            event: "decision",
            informationBoundary: "public_complete_state",
            tick: 12_600,
            mechanism: "progress_certified_terminal_conversion",
            decisionKind: "blocker_clear",
            decisionReason: "route_blockers_delay_terminal_building",
            selectedBuildingId: 10,
            selectedBuildingVisible: true,
            selectedBuildingObservedBy: "public_complete_state",
            selectedAttackerIds: [3, 4],
            blockerIds: [20],
            activationReason: "guarded_building_count",
            exactEnemyBuildingCount: 1,
            eligibleAttackerCount: 4,
            reservedCombatantCount: 0,
            reservedCombatantIds: [],
            reservedActionCounts: { idle: 0, moving: 0, attacking: 0, other: 0 },
            certifiedAttackerCount: 4,
            selectedAttackerRulesNames: ["HTNK", "HTNK", "HTNK", "HTNK"],
            delegatedActionCounts: { idle: 0, moving: 2, attacking: 2, other: 0 },
            assignedCombatantFraction: 1,
            lastPhysicalProgressTick: 12_500,
            physicalNoProgressTicks: 100,
            missionStartedTick: 12_300,
            progressDeadlineExpired: "blocker",
            terminalReserveReleased: true,
            completeMissionCostTicks: 420,
        });
        expect(event.mechanism).toBe("progress_certified_terminal_conversion");
        expect(event.terminalReserveReleased).toBe(true);
    });

    it("rejects outcome fields, future clocks, and premature reserve release", () => {
        const base = {
            schemaVersion: 3,
            event: "decision",
            informationBoundary: "public_complete_state",
            tick: 7_200,
            mechanism: "progress_certified_terminal_conversion",
        } as const;
        expect(() => validateProgressCertifiedTelemetry({ ...base, endpointWinner: "candidate" }))
            .toThrow("non-allowlisted");
        expect(() => validateProgressCertifiedTelemetry({ ...base, lastPhysicalProgressTick: 7_201 }))
            .toThrow("future");
        expect(() => validateProgressCertifiedTelemetry({
            ...base,
            exactEnemyBuildingCount: 2,
            terminalReserveReleased: true,
        })).toThrow("outside the final-building state");
    });

    it("validates visibility-aware unseen approach and visible handoff telemetry", () => {
        const base = {
            schemaVersion: 4,
            event: "decision",
            informationBoundary: "public_complete_state",
            tick: 8_000,
            mechanism: "progress_certified_terminal_conversion",
            decisionKind: "building_strike",
            selectedBuildingId: 42,
            selectedBuildingObservedBy: "public_complete_state",
            selectedBuildingCoordinates: { x: 31, y: 47 },
            selectedAttackerIds: [10, 11],
        } as const;
        expect(validateProgressCertifiedTelemetry({
            ...base,
            selectedBuildingVisible: false,
            selectedBuildingOrderMode: "attack_move_exact_unseen_coordinates",
        }, 4).selectedBuildingOrderMode).toBe("attack_move_exact_unseen_coordinates");
        expect(validateProgressCertifiedTelemetry({
            ...base,
            selectedBuildingVisible: true,
            selectedBuildingOrderMode: "attack_visible_building",
        }, 4).selectedBuildingOrderMode).toBe("attack_visible_building");
        expect(validateProgressCertifiedTelemetry({
            ...base,
            decisionKind: "blocker_clear",
            selectedBuildingVisible: false,
            blockerIds: [99],
        }, 4).selectedBuildingCoordinates).toEqual({ x: 31, y: 47 });
        expect(() => validateProgressCertifiedTelemetry({
            ...base,
            selectedBuildingVisible: false,
            selectedBuildingOrderMode: "attack_visible_building",
        }, 4)).toThrow("coordinate-approach");
        expect(() => validateProgressCertifiedTelemetry({
            ...base,
            decisionKind: "blocker_clear",
            selectedBuildingVisible: false,
            selectedBuildingOrderMode: "attack_move_exact_unseen_coordinates",
        }, 4)).toThrow("declares a building order mode");
        expect(() => validateProgressCertifiedTelemetry({
            ...base,
            schemaVersion: 3,
            selectedBuildingVisible: false,
            selectedBuildingOrderMode: "attack_move_exact_unseen_coordinates",
        })).toThrow("visibility-aware");
    });
});
