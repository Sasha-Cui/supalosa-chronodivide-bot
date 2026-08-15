import { describe, expect, it } from "vitest";
import {
    ProgressCertifiedV5RepairConfirmatoryAnalysisRow,
    analyzeProgressCertifiedV5Confirmation,
} from "../training/progressCertifiedV5RepairConfirmatoryUnblinder.js";
import { PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_COUNTRIES } from
    "../training/progressCertifiedV5RepairConfirmatoryCampaign.js";

const arms = [
    "external_supalosa_control",
    "final_building_hybrid_v4",
    "visibility_aware_final_building_v5",
] as const;

const rows = (positive: boolean): ProgressCertifiedV5RepairConfirmatoryAnalysisRow[] =>
    Array.from({ length: 53 }, (_, familyIndex) => `family_${familyIndex}`).flatMap((familyId, familyIndex) =>
        PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_COUNTRIES.flatMap((country) =>
            ([0, 1] as const).flatMap((candidateSlot) => arms.map((armId) => {
                const score = armId === "visibility_aware_final_building_v5" && positive && familyIndex % 2 === 0
                    ? 1
                    : 0.5;
                return {
                    familyId,
                    country,
                    faction: new Set(["Americans", "Alliance", "French", "Germans", "British"]).has(country)
                        ? "Allied" as const
                        : "Soviet" as const,
                    candidateSlot,
                    armId,
                    score: score as 0 | 0.5 | 1,
                    winner: score === 1 ? "candidate" as const : "draw" as const,
                    ticks: score === 1 ? 10_000 : 24_000,
                    outcomeStatus: score === 1 ? "candidate_win" : "tick_cap_draw",
                    policyTelemetry: [],
                };
            })),
        ),
    );

describe("progress-certified V5 confirmatory unblinding", () => {
    it("requires both paired improvement and absolute above-even evidence", () => {
        const analysis = analyzeProgressCertifiedV5Confirmation(rows(true));
        expect(analysis.status).toBe("PASSED_PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_SUCCESS_GATE");
        expect(analysis.primary.pairedV5MinusExternal.passed).toBe(true);
        expect(analysis.primary.v5Absolute.passed).toBe(true);
        expect(analysis.secondary.v5MinusV4.passed).toBe(true);
        expect(analysis.transitions.pairedCellCount).toBe(954);
        expect(analysis.arms.visibility_aware_final_building_v5).toMatchObject({
            games: 954,
            wins: 486,
            draws: 468,
            losses: 0,
        });
    });

    it("does not claim success when V5 merely ties both controls", () => {
        const analysis = analyzeProgressCertifiedV5Confirmation(rows(false));
        expect(analysis.status).toBe("FAILED_PROGRESS_CERTIFIED_V5_REPAIR_CONFIRMATORY_SUCCESS_GATE");
        expect(analysis.primaryPassed).toBe(false);
    });
});
