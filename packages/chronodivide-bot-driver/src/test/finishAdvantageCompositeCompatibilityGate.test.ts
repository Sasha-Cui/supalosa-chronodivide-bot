import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { OrderType } from "@chronodivide/game-api";
import { describe, expect, it } from "vitest";
import {
    FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_2_SHA256,
    FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_3_SHA256,
    FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_4_SHA256,
    FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_CELL_COUNT,
    FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_COUNTRIES,
    FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_MAX_TICKS,
    FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_RUNS_PER_CELL,
    FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_SEED_BASE,
    FinishAdvantageCompositeCompatibilityCell,
    selectFinishAdvantageTechnicalGatePolicy,
    summarizeFinishAdvantageCompositeCompatibility,
    deterministicTerminalBaseRaceCases,
    validateFinishAdvantageCompatibilityTelemetry,
    validateTerminalBaseRaceCompatibilityTelemetry,
} from "../training/finishAdvantageCompositeCompatibilityGate.js";
import { buildFinishAdvantageIrreversiblePolicy, buildFinishAdvantageSurplusPolicy } from
    "../training/finishAdvantagePolicy.js";
import { FinishAdvantageTelemetry } from "../training/finishAdvantageStrategy.js";
import { matchingFinishAdvantageAction } from
    "../training/finishAdvantageCompositeCompatibilityRunner.js";

const audit = (selectedMargins: number[] = []) => ({
    schemaVersion: 1,
    kind: "finish-advantage-outcome-blind-state-audit-finalizer",
    status: "PASS_OUTCOME_BLIND_STATE_AUDIT",
    passed: true,
    outcomeFree: true,
    selectedMargins,
});

const event = (overrides: Partial<FinishAdvantageTelemetry> = {}): FinishAdvantageTelemetry => ({
    schemaVersion: 4,
    event: "finish_advantage_decision",
    informationInterface: "public_complete_state",
    tick: 1_000,
    country: Countries.USA,
    mode: "surplus_cover",
    phase: "building_strike",
    reason: "fastest_safe_building_race",
    enemyBuildingCount: 3,
    enemyMobileSelectableCombatantCount: 1,
    irreversibleCertificate: false,
    irreversibleCertificateRevoked: false,
    missionOwnershipAvailable: true,
    missionMembershipSha256: "a".repeat(64),
    nominalEligibleCount: 6,
    protectedEligibleCount: 2,
    protectedEligibleIds: [1, 2],
    additionalReserveIds: [3],
    strikePoolIds: [4, 5, 6],
    selectedAttackerIds: [4, 5, 6],
    targetBuildingId: 100,
    targetBuildingCoordinates: { x: 40, y: 50 },
    targetBuildingHitPoints: 1_000,
    targetBuildingVisible: true,
    buildingCompletionTicks: 120,
    earliestInterceptTicks: 200,
    earliestOwnBuildingLossTicks: 300,
    blockerId: null,
    blockerCoordinates: null,
    blockerVisible: null,
    blockerHitPoints: null,
    blockerRemovalTicks: null,
    baseRaceThreatId: null,
    objectiveProgress: "new_commitment",
    objectiveDistanceTiles: 12,
    ticksSinceObjectiveProgress: 0,
    stalledTargetId: null,
    issuedOrder: "attack_visible_building",
    forbiddenFieldsEmitted: [],
    ...overrides,
});

describe("finish-advantage outcome-free composite compatibility gate", () => {
    it("freezes 72 games over all countries, reciprocal slots, and fresh seeds", () => {
        expect(FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_2_SHA256).toHaveLength(64);
        expect(FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_3_SHA256).toHaveLength(64);
        expect(FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_AMENDMENT_4_SHA256).toHaveLength(64);
        expect(FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_COUNTRIES).toHaveLength(9);
        expect(new Set(FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_COUNTRIES).size).toBe(9);
        expect(FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_CELL_COUNT).toBe(18);
        expect(FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_RUNS_PER_CELL).toBe(4);
        expect(FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_CELL_COUNT *
            FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_RUNS_PER_CELL).toBe(72);
        expect(FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_MAX_TICKS).toBe(5_400);
        expect(FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_SEED_BASE + 17).toBeLessThan(0xffff_ffff);
    });

    it("selects the least conservative eligible margin without outcome access", () => {
        const sha = "b".repeat(64);
        const selected = selectFinishAdvantageTechnicalGatePolicy(audit([8, 2]), sha);
        expect(selected.selectedMargins).toEqual([2, 8]);
        expect(selected.selectedMode).toBe("surplus_cover");
        expect(selected.selectedMargin).toBe(2);
        expect(selected.policy).toEqual(buildFinishAdvantageSurplusPolicy(2));
        expect(selectFinishAdvantageTechnicalGatePolicy(audit(), sha).policy)
            .toEqual(buildFinishAdvantageIrreversiblePolicy());
        expect(() => selectFinishAdvantageTechnicalGatePolicy({ ...audit(), winner: "candidate" }, sha))
            .toThrow("invalid or did not pass");
    });

    it("accepts a safe building strike with exact protected and cover separation", () => {
        expect(validateFinishAdvantageCompatibilityTelemetry(
            event(), buildFinishAdvantageSurplusPolicy(2),
        )).toEqual([]);
    });

    it("matches visible and coordinate orders to the exact same-tick telemetry witness", () => {
        const visible = event();
        expect(matchingFinishAdvantageAction(visible, [{
            tick: visible.tick,
            args: [[6, 5, 4], OrderType.Attack, visible.targetBuildingId],
        }])).not.toBeNull();
        const unseen = event({ issuedOrder: "approach_exact_unseen_building", targetBuildingVisible: false });
        expect(matchingFinishAdvantageAction(unseen, [{
            tick: unseen.tick,
            args: [[4, 5, 6], OrderType.AttackMove, 40, 50],
        }])).not.toBeNull();
        const blocker = event({
            phase: "blocker_clear",
            issuedOrder: "approach_exact_unseen_blocker",
            blockerId: 200,
            blockerCoordinates: { x: 10, y: 11 },
            blockerVisible: false,
            blockerHitPoints: 500,
        });
        expect(matchingFinishAdvantageAction(blocker, [{
            tick: blocker.tick,
            args: [[4, 5, 6], OrderType.AttackMove, 10, 11],
        }])).not.toBeNull();
        expect(matchingFinishAdvantageAction(visible, [{
            tick: visible.tick + 1,
            args: [[4, 5, 6], OrderType.Attack, visible.targetBuildingId],
        }])).toBeNull();
    });

    it("rejects protected leasing, unsafe building races, and final-building takeover", () => {
        const policy = buildFinishAdvantageSurplusPolicy(2);
        expect(validateFinishAdvantageCompatibilityTelemetry(
            event({ selectedAttackerIds: [1, 4] }), policy,
        )).toContain("selected attackers overlap protected mission units");
        expect(validateFinishAdvantageCompatibilityTelemetry(
            event({ earliestInterceptTicks: 125 }), policy,
        )).toContain("building order is not certified to win its causal race");
        expect(validateFinishAdvantageCompatibilityTelemetry(
            event({ enemyBuildingCount: 1 }), policy,
        )).toContain("multi-building overlay acted at or below the final-building boundary");
        expect(validateFinishAdvantageCompatibilityTelemetry(
            event({ nominalEligibleCount: -1 }), policy,
        )).toContain("finish-advantage telemetry count is malformed");
        expect(validateFinishAdvantageCompatibilityTelemetry(
            event({ irreversibleCertificate: true, irreversibleCertificateRevoked: true }), policy,
        )).toContain("finish-advantage certificate revocation contradicts the current certificate");
        expect(validateFinishAdvantageCompatibilityTelemetry(
            event({ stalledTargetId: 0 }), policy,
        )).toContain("finish-advantage stalled-target witness is malformed");
        expect(validateFinishAdvantageCompatibilityTelemetry(
            event({ stalledTargetId: 100 }), policy,
        )).toContain("finish-advantage stall recovery reselected the stalled target");
    });

    it("accepts an action-free final-building handoff", () => {
        expect(validateFinishAdvantageCompatibilityTelemetry(event({
            enemyBuildingCount: 1,
            phase: "inactive",
            reason: "outside_multi_building_scope",
            missionOwnershipAvailable: false,
            missionMembershipSha256: null,
            nominalEligibleCount: 0,
            protectedEligibleCount: 0,
            protectedEligibleIds: [],
            additionalReserveIds: [],
            strikePoolIds: [],
            selectedAttackerIds: [],
            targetBuildingId: null,
            targetBuildingCoordinates: null,
            targetBuildingHitPoints: null,
            targetBuildingVisible: null,
            buildingCompletionTicks: null,
            earliestInterceptTicks: null,
            earliestOwnBuildingLossTicks: null,
            objectiveProgress: "none",
            objectiveDistanceTiles: null,
            ticksSinceObjectiveProgress: null,
            issuedOrder: "none",
        }), buildFinishAdvantageSurplusPolicy(2))).toEqual([]);
    });

    it("enforces the strict literal-endpoint final-building base race", () => {
        const finalStrike = [{
            event: "decision",
            exactEnemyBuildingCount: 1,
            decisionKind: "terminal_candidate_strike",
            directCompletionTicks: 20,
            earliestBaseDestructionTick: 40,
            terminalBaseRaceMode: "strict_literal_endpoint_base_race",
            terminalBaseRaceObjectiveCompletionTicks: 20,
            terminalBaseRaceGuardIntervened: false,
        }] as any;
        expect(validateTerminalBaseRaceCompatibilityTelemetry(
            finalStrike, "strict_literal_endpoint_base_race", 2,
        )).toEqual([]);
        expect(validateTerminalBaseRaceCompatibilityTelemetry(
            [{ ...finalStrike[0], earliestBaseDestructionTick: 21 }] as any,
            "strict_literal_endpoint_base_race",
            2,
        )).toContain("terminal base-race telemetry 0 contains an unsafe building strike");
        expect(validateTerminalBaseRaceCompatibilityTelemetry([{
            ...finalStrike[0],
            decisionKind: "base_defense",
            earliestBaseDestructionTick: 21,
            threatIds: [100],
            terminalBaseRaceGuardIntervened: true,
        }] as any, "strict_literal_endpoint_base_race", 2)).toEqual([]);
        expect(validateTerminalBaseRaceCompatibilityTelemetry([{
            ...finalStrike[0],
            decisionKind: "base_defense",
            earliestBaseDestructionTick: 21,
            threatIds: [100],
            terminalBaseRaceGuardIntervened: false,
        }] as any, "strict_literal_endpoint_base_race", 2)).toContain(
            "terminal base-race telemetry 0 lacks a causal defense witness",
        );
        expect(validateTerminalBaseRaceCompatibilityTelemetry([{
            ...finalStrike[0],
            decisionKind: "predecessor_fallback",
            decisionReason: "uncalibrated_relevant_threat",
            threatIds: [900],
            terminalBaseRaceGuardIntervened: true,
        }] as any, "strict_literal_endpoint_base_race", 2)).toEqual([]);
        expect(validateTerminalBaseRaceCompatibilityTelemetry([{
            ...finalStrike[0],
            decisionKind: "predecessor_fallback",
            decisionReason: "uncalibrated_relevant_threat",
            threatIds: [],
            terminalBaseRaceGuardIntervened: true,
        }] as any, "strict_literal_endpoint_base_race", 2)).toContain(
            "terminal base-race telemetry 0 lacks an uncertainty witness",
        );
        expect(deterministicTerminalBaseRaceCases()).toMatchObject({ passed: true, caseCount: 5 });
    });

    it("requires broad live exposure and all technical equivalence checks", () => {
        const countries = FINISH_ADVANTAGE_COMPOSITE_COMPATIBILITY_COUNTRIES;
        const rows: FinishAdvantageCompositeCompatibilityCell[] = countries.flatMap((country) =>
            ([0, 1] as const).map((candidateSlot, index) => ({
                country,
                candidateSlot,
                disabledEquivalent: true,
                deterministic: true,
                validationErrors: [],
                finishBuildingOrderWitness: countries.indexOf(country) < 3 || country === Countries.IRAQ,
                irreversibleOrderWitness: country === Countries.USA && candidateSlot === 0,
                surplusOrderWitness: country === Countries.USA && candidateSlot === 0,
                protectedSeparationWitness: country === Countries.KOREA && candidateSlot === 1,
                exactUnseenApproachWitness: country === Countries.FRANCE && candidateSlot === 0,
                visibleHandoffWitness: country === Countries.GERMANY && candidateSlot === 1,
                terminalBaseRaceMode: "strict_literal_endpoint_base_race",
            })),
        );
        const summary = summarizeFinishAdvantageCompositeCompatibility(rows, "surplus_cover", 1);
        expect(summary.passed).toBe(true);
        expect(summary.validationErrors).toEqual([]);
        const failed = summarizeFinishAdvantageCompositeCompatibility(
            rows.map((row) => ({ ...row, deterministic: false })), "surplus_cover", 1,
        );
        expect(failed.passed).toBe(false);
        expect(failed.validationErrors).toContain("an enabled same-seed composite trace is nondeterministic");
    });
});
