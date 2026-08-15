import { OrderType } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { describe, expect, it } from "vitest";
import {
    PROGRESS_CERTIFIED_V5_COMPATIBILITY_CELL_COUNT,
    PROGRESS_CERTIFIED_V5_COMPATIBILITY_COUNTRIES,
    PROGRESS_CERTIFIED_V5_COMPATIBILITY_GATE_REVISION,
    PROGRESS_CERTIFIED_V5_COMPATIBILITY_MAX_TICKS,
    PROGRESS_CERTIFIED_V5_COMPATIBILITY_RUNS_PER_CELL,
    PROGRESS_CERTIFIED_V5_COMPATIBILITY_SEED_BASE,
    buildProgressCertifiedV5CompatibilitySmokePolicy,
    summarizeProgressCertifiedV5PopulationCoverage,
    summarizeProgressCertifiedV5CompatibilityDiagnostic,
    validateProgressCertifiedV5CompatibilityExposure,
} from "../training/progressCertifiedV5CompatibilityGate.js";
import { TerminalObjectiveTelemetry } from "../training/terminalObjectiveStrategy.js";

const event = (
    tick: number,
    visible: boolean,
): TerminalObjectiveTelemetry => ({
    schemaVersion: 4,
    event: "decision",
    informationBoundary: "public_complete_state",
    tick,
    mechanism: "progress_certified_terminal_conversion",
    decisionKind: "building_strike",
    decisionReason: "direct_building_is_fastest_survivable_mission",
    selectedBuildingId: 99,
    selectedBuildingVisible: visible,
    selectedBuildingObservedBy: visible ? "vision" : "public_complete_state",
    selectedBuildingCoordinates: { x: 40, y: 50 },
    selectedBuildingOrderMode: visible
        ? "attack_visible_building"
        : "attack_move_exact_unseen_coordinates",
    selectedAttackerIds: [3, 4],
    exactEnemyBuildingCount: 4,
    eligibleAttackerCount: 4,
    reservedCombatantCount: 2,
    reservedCombatantIds: [1, 2],
    lastPhysicalProgressTick: tick - 10,
    physicalNoProgressTicks: 10,
    progressDeadlineExpired: null,
    terminalReserveReleased: false,
});

describe("progress-certified V5 outcome-free compatibility gate", () => {
    it("freezes all countries, reciprocal slots, four traces, and a fresh uint32 seed interval", () => {
        expect(PROGRESS_CERTIFIED_V5_COMPATIBILITY_COUNTRIES).toHaveLength(9);
        expect(new Set(PROGRESS_CERTIFIED_V5_COMPATIBILITY_COUNTRIES).size).toBe(9);
        expect(PROGRESS_CERTIFIED_V5_COMPATIBILITY_CELL_COUNT).toBe(18);
        expect(PROGRESS_CERTIFIED_V5_COMPATIBILITY_RUNS_PER_CELL).toBe(4);
        expect(PROGRESS_CERTIFIED_V5_COMPATIBILITY_MAX_TICKS).toBe(5_400);
        expect(PROGRESS_CERTIFIED_V5_COMPATIBILITY_GATE_REVISION).toBe("V5-C3");
        expect(PROGRESS_CERTIFIED_V5_COMPATIBILITY_SEED_BASE).toBe(4_294_962_000);
        expect(PROGRESS_CERTIFIED_V5_COMPATIBILITY_SEED_BASE + 17).toBeLessThanOrEqual(0xffff_ffff);
        const smoke = buildProgressCertifiedV5CompatibilitySmokePolicy();
        expect(smoke.terminalForceMode).toBe("direct_building");
        expect(smoke.activationBuildingCount).toBe(100);
        expect(smoke.activationMinTick).toBe(0);
    });

    it("accepts a matched visible-only cell while reserving unseen exposure for the population gate", () => {
        const telemetry = [event(200, true)];
        const actions = [{ tick: 200, args: [[3, 4], OrderType.Attack, 99] }];
        const summary = validateProgressCertifiedV5CompatibilityExposure(
            telemetry, actions, Countries.FRANCE, 0,
        );
        expect(summary.buildingDecisionCount).toBe(1);
        expect(summary.exactUnseenApproachCount).toBe(0);
        expect(summary.visibleHandoffCount).toBe(0);
    });

    it("requires exact-unseen population exposure across factions and slots plus a live handoff", () => {
        const empty = {
            telemetryCount: 1,
            buildingDecisionCount: 1,
            exactUnseenApproachCount: 0,
            visibleHandoffCount: 0,
            maximumLastPhysicalProgressTick: 0,
            approachWitnesses: [],
            visibleHandoffWitnesses: [],
        };
        const countries = PROGRESS_CERTIFIED_V5_COMPATIBILITY_COUNTRIES;
        const rows = countries.flatMap((country) => ([0, 1] as const).map((candidateSlot) => ({
            country,
            candidateSlot,
            firstCoverage: { ...empty },
            repeatCoverage: { ...empty },
        })));
        for (const [country, slot, handoff] of [
            [Countries.USA, 0, 0],
            [Countries.GERMANY, 0, 0],
            [Countries.IRAQ, 1, 1],
            [Countries.RUSSIA, 1, 0],
        ] as const) {
            const row = rows.find((item) => item.country === country && item.candidateSlot === slot)!;
            row.firstCoverage.exactUnseenApproachCount = 1;
            row.repeatCoverage.exactUnseenApproachCount = 1;
            row.firstCoverage.visibleHandoffCount = handoff;
            row.repeatCoverage.visibleHandoffCount = handoff;
        }
        const summary = summarizeProgressCertifiedV5PopulationCoverage(rows);
        expect(summary.validationErrors).toEqual([]);
        expect(summary.exactUnseenApproachFactions).toEqual(["Allied", "Soviet"]);
        expect(summary.exactUnseenApproachSlots).toEqual([0, 1]);
        expect(summary.visibleHandoffCellCount).toBe(1);
    });

    it("requires coordinate approach followed by direct attack on the same visible building", () => {
        const telemetry = [event(100, false), event(200, true)];
        const actions = [
            { tick: 100, args: [[4, 3], OrderType.AttackMove, 40, 50] },
            { tick: 200, args: [[3, 4], OrderType.Attack, 99] },
        ];
        const summary = validateProgressCertifiedV5CompatibilityExposure(
            telemetry, actions, Countries.USA, 0,
        );
        expect(summary.exactUnseenApproachCount).toBe(1);
        expect(summary.visibleHandoffCount).toBe(1);
        expect(summary.approachWitnesses[0].coordinates).toEqual({ x: 40, y: 50 });
        expect(summarizeProgressCertifiedV5CompatibilityDiagnostic(telemetry, actions)).toMatchObject({
            telemetryCount: 2,
            actionableDecisionCount: 2,
            buildingDecisionCount: 2,
            orderModeCounts: {
                attack_move_exact_unseen_coordinates: 1,
                attack_visible_building: 1,
            },
        });
    });

    it("rejects a legacy direct attack against an exact unseen building", () => {
        const telemetry = [event(100, false), event(200, true)];
        const actions = [
            { tick: 100, args: [[3, 4], OrderType.Attack, 99] },
            { tick: 200, args: [[3, 4], OrderType.Attack, 99] },
        ];
        expect(() => validateProgressCertifiedV5CompatibilityExposure(
            telemetry, actions, Countries.USA, 0,
        )).toThrow("lacks a matching issued order");
    });
});
