import { describe, expect, it } from "vitest";
import {
    computeFinishAdvantagePartition,
    computeFinishAdvantageOperationalPartition,
    estimateFinishAdvantageStaggeredDamageCompletion,
    finishAdvantageDirectStrikeIsSafe,
    hasFinishAdvantageIrreversibleCertificate,
    selectFinishAdvantageObjectiveDecision,
} from "../training/finishAdvantageControl.js";

describe("finish-advantage shared control rules", () => {
    it("credits near-unit damage before a distant unit arrives", () => {
        expect(estimateFinishAdvantageStaggeredDamageCompletion(100, [
            { unitId: 1, arrivalTicks: 0, damagePerTick: 10 },
            { unitId: 2, arrivalTicks: 100, damagePerTick: 1_000 },
        ])).toEqual({ completionTicks: 10, participatingUnitIds: [1] });
    });

    it("integrates several deterministic arrival waves", () => {
        expect(estimateFinishAdvantageStaggeredDamageCompletion(100, [
            { unitId: 3, arrivalTicks: 10, damagePerTick: 4 },
            { unitId: 1, arrivalTicks: 0, damagePerTick: 2 },
            { unitId: 2, arrivalTicks: 10, damagePerTick: 4 },
        ])).toEqual({ completionTicks: 18, participatingUnitIds: [1, 2, 3] });
    });

    it("fails closed on malformed staggered-damage inputs", () => {
        expect(estimateFinishAdvantageStaggeredDamageCompletion(0, [
            { unitId: 1, arrivalTicks: 0, damagePerTick: 1 },
        ])).toBeNull();
        expect(estimateFinishAdvantageStaggeredDamageCompletion(10, [
            { unitId: 1, arrivalTicks: 0, damagePerTick: 1 },
            { unitId: 1, arrivalTicks: 1, damagePerTick: 2 },
        ])).toBeNull();
        expect(estimateFinishAdvantageStaggeredDamageCompletion(10, [
            { unitId: 1, arrivalTicks: Number.POSITIVE_INFINITY, damagePerTick: 1 },
        ])).toBeNull();
        expect(estimateFinishAdvantageStaggeredDamageCompletion(10, [
            { unitId: 1, arrivalTicks: 0, damagePerTick: 0 },
        ])).toBeNull();
    });

    it("keeps protected missions out of both reserve and strike leasing", () => {
        const result = computeFinishAdvantagePartition({
            nominalEligibleIds: [1, 2, 3, 4, 5, 6],
            protectedEligibleIds: new Set([1, 2]),
            leasePoolByHomeDistance: [3, 4, 5, 6],
            enemyMobileSelectableCombatantCount: 1,
            margin: 2,
        });
        expect(result).toEqual({
            desiredCover: 3,
            protectedCount: 2,
            additionalReserveIds: [3],
            strikeIds: [4, 5, 6],
        });
    });

    it("recognizes only the exact helpless multi-building certificate", () => {
        const base = {
            enemyBuildingCount: 3,
            enemySelectableCombatantCount: 0,
            enemyProductionBuildingCount: 0,
            enemyDeployableBaseUnitCount: 0,
        };
        expect(hasFinishAdvantageIrreversibleCertificate(base)).toBe(true);
        expect(hasFinishAdvantageIrreversibleCertificate({ ...base, enemyBuildingCount: 1 })).toBe(false);
        expect(hasFinishAdvantageIrreversibleCertificate({ ...base, enemySelectableCombatantCount: 1 })).toBe(false);
        expect(hasFinishAdvantageIrreversibleCertificate({ ...base, enemyProductionBuildingCount: 1 })).toBe(false);
        expect(hasFinishAdvantageIrreversibleCertificate({ ...base, enemyDeployableBaseUnitCount: 1 })).toBe(false);
    });

    it("releases every unprotected compatible unit under the irreversible certificate", () => {
        expect(computeFinishAdvantageOperationalPartition({
            nominalEligibleIds: [1, 2, 3, 4],
            protectedEligibleIds: new Set([1]),
            leasePoolByHomeDistance: [2, 3, 4],
            enemyMobileSelectableCombatantCount: 0,
            margin: 8,
            multiBuildingMode: "surplus_cover",
            irreversibleCertificate: true,
        })).toEqual({
            active: true,
            activationReason: "irreversible_certificate",
            desiredCover: 0,
            protectedCount: 1,
            additionalReserveIds: [],
            strikeIds: [2, 3, 4],
        });
    });

    it("keeps the irreversible-only ablation action-free before certification", () => {
        expect(computeFinishAdvantageOperationalPartition({
            nominalEligibleIds: [1, 2, 3, 4, 5],
            protectedEligibleIds: new Set([1]),
            leasePoolByHomeDistance: [2, 3, 4, 5],
            enemyMobileSelectableCombatantCount: 1,
            margin: 0,
            multiBuildingMode: "irreversible_only",
            irreversibleCertificate: false,
        })).toMatchObject({
            active: false,
            activationReason: "inactive",
            strikeIds: [],
        });
    });

    it("activates only a numerical surplus when the certificate is absent", () => {
        expect(computeFinishAdvantageOperationalPartition({
            nominalEligibleIds: [1, 2, 3, 4, 5, 6],
            protectedEligibleIds: new Set([1, 2]),
            leasePoolByHomeDistance: [3, 4, 5, 6],
            enemyMobileSelectableCombatantCount: 1,
            margin: 2,
            multiBuildingMode: "surplus_cover",
            irreversibleCertificate: false,
        })).toEqual({
            active: true,
            activationReason: "surplus_cover",
            desiredCover: 3,
            protectedCount: 2,
            additionalReserveIds: [3],
            strikeIds: [4, 5, 6],
        });
    });

    it("attacks a building despite an arbitrarily large off-route army", () => {
        expect(finishAdvantageDirectStrikeIsSafe({
            buildingCompletionTicks: 120,
            earliestInterceptTicks: null,
            earliestOwnBuildingLossTicks: null,
            safetyMarginTicks: 12,
        })).toBe(true);
    });

    it("clears or bypasses a blocker when interception wins the race", () => {
        expect(finishAdvantageDirectStrikeIsSafe({
            buildingCompletionTicks: 120,
            earliestInterceptTicks: 100,
            earliestOwnBuildingLossTicks: null,
            safetyMarginTicks: 12,
        })).toBe(false);
    });

    it("protects the base when our last-building loss wins the race", () => {
        expect(finishAdvantageDirectStrikeIsSafe({
            buildingCompletionTicks: 120,
            earliestInterceptTicks: null,
            earliestOwnBuildingLossTicks: 100,
            safetyMarginTicks: 12,
        })).toBe(false);
    });

    it("fails closed on unknown or malformed building completion", () => {
        expect(finishAdvantageDirectStrikeIsSafe({
            buildingCompletionTicks: null,
            earliestInterceptTicks: null,
            earliestOwnBuildingLossTicks: null,
            safetyMarginTicks: 12,
        })).toBe(false);
        expect(finishAdvantageDirectStrikeIsSafe({
            buildingCompletionTicks: Number.POSITIVE_INFINITY,
            earliestInterceptTicks: null,
            earliestOwnBuildingLossTicks: null,
            safetyMarginTicks: 12,
        })).toBe(false);
    });

    const candidate = (overrides: Partial<{
        buildingId: number;
        strategicPriority: number;
        buildingCompletionTicks: number | null;
        earliestInterceptTicks: number | null;
        blockerId: number | null;
        blockerRemovalTicks: number | null;
        stalled: boolean;
    }> = {}) => ({
        buildingId: 10,
        strategicPriority: 0,
        buildingCompletionTicks: 120,
        earliestInterceptTicks: null,
        blockerId: null,
        blockerRemovalTicks: null,
        stalled: false,
        ...overrides,
    });

    const decision = (overrides: Partial<{
        candidates: ReturnType<typeof candidate>[];
        earliestOwnBuildingLossTicks: number | null;
        baseRaceThreatId: number | null;
        safetyMarginTicks: number;
    }> = {}) => selectFinishAdvantageObjectiveDecision({
        candidates: [candidate()],
        earliestOwnBuildingLossTicks: null,
        baseRaceThreatId: null,
        safetyMarginTicks: 12,
        ...overrides,
    });

    it("turns the one-building plus one-hundred-off-route-tanks case into a building order", () => {
        expect(decision()).toEqual({
            kind: "building_strike",
            reason: "fastest_safe_building_race",
            targetBuildingId: 10,
            blockerId: null,
            threatId: null,
        });
    });

    it("clears only the minimum causally relevant blocker", () => {
        expect(decision({ candidates: [
            candidate({ buildingId: 10, earliestInterceptTicks: 80, blockerId: 90, blockerRemovalTicks: 30 }),
            candidate({ buildingId: 11, earliestInterceptTicks: 70, blockerId: 91, blockerRemovalTicks: 50 }),
        ] })).toEqual({
            kind: "blocker_clear",
            reason: "minimum_causal_intercept_blocker",
            targetBuildingId: 10,
            blockerId: 90,
            threatId: null,
        });
    });

    it("defends when enemy forces win the last-building race", () => {
        expect(decision({ earliestOwnBuildingLossTicks: 90, baseRaceThreatId: 77 })).toEqual({
            kind: "base_defense",
            reason: "own_building_loss_precedes_objective",
            targetBuildingId: null,
            blockerId: null,
            threatId: 77,
        });
    });

    it("sweeps the fastest building when several helpless structures remain", () => {
        expect(decision({ candidates: [
            candidate({ buildingId: 12, buildingCompletionTicks: 160 }),
            candidate({ buildingId: 11, buildingCompletionTicks: 60 }),
            candidate({ buildingId: 13, buildingCompletionTicks: 90 }),
        ] })).toMatchObject({ kind: "building_strike", targetBuildingId: 11 });
    });

    it("uses strategic removal value only after complete mission cost", () => {
        expect(decision({ candidates: [
            candidate({ buildingId: 12, buildingCompletionTicks: 60, strategicPriority: 0 }),
            candidate({ buildingId: 11, buildingCompletionTicks: 60, strategicPriority: 3 }),
            candidate({ buildingId: 13, buildingCompletionTicks: 59, strategicPriority: 0 }),
        ] })).toMatchObject({ kind: "building_strike", targetBuildingId: 13 });
        expect(decision({ candidates: [
            candidate({ buildingId: 12, buildingCompletionTicks: 60, strategicPriority: 0 }),
            candidate({ buildingId: 11, buildingCompletionTicks: 60, strategicPriority: 3 }),
        ] })).toMatchObject({ kind: "building_strike", targetBuildingId: 11 });
    });

    it("does not let irrelevant remote forces change multi-building target selection", () => {
        expect(decision({ candidates: [
            candidate({ buildingId: 12, buildingCompletionTicks: 80, earliestInterceptTicks: null }),
            candidate({ buildingId: 11, buildingCompletionTicks: 60, earliestInterceptTicks: null }),
        ] })).toMatchObject({ kind: "building_strike", targetBuildingId: 11 });
    });

    it("retargets a stalled building before yielding without a global army hunt", () => {
        expect(decision({ candidates: [
            candidate({ buildingId: 10, buildingCompletionTicks: 40, stalled: true }),
            candidate({ buildingId: 11, buildingCompletionTicks: 90 }),
        ] })).toMatchObject({ kind: "building_strike", targetBuildingId: 11 });
        expect(decision({ candidates: [candidate({ stalled: true })] })).toEqual({
            kind: "predecessor_fallback",
            reason: "no_live_reachable_objective",
            targetBuildingId: null,
            blockerId: null,
            threatId: null,
        });
    });

    it("fails closed instead of inventing an unidentifiable base defender or blocker", () => {
        expect(decision({ earliestOwnBuildingLossTicks: 90, baseRaceThreatId: null }))
            .toMatchObject({ kind: "predecessor_fallback", reason: "malformed_or_unknown_race" });
        expect(decision({ candidates: [candidate({
            earliestInterceptTicks: 80,
            blockerId: 91,
            blockerRemovalTicks: null,
        })] })).toMatchObject({ kind: "predecessor_fallback", reason: "malformed_or_unknown_race" });
    });
});
