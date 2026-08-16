import { describe, expect, it } from "vitest";
import { buildFinishAdvantageOpenCellSummary } from
    "../training/finishAdvantageOpenCausalScreenCell.js";

const base = () => ({
    runId: "finish-open-0-123",
    campaignSha256: "a".repeat(64),
    taskIndex: 0,
    requestedLaunches: 10,
    completed: 10,
    technicalFailures: 0,
    candidateWins: 4,
    baselineWins: 2,
    draws: 4,
});

describe("finish-advantage open causal-screen shard summary", () => {
    it("marks an exactly accounted clean all-arm shard complete", () => {
        expect(buildFinishAdvantageOpenCellSummary(base())).toMatchObject({
            status: "COMPLETE_FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_SHARD",
            requestedLaunches: 10,
            accountedLaunches: 10,
            completed: 10,
            technicalFailures: 0,
            complete: true,
            technicallyClean: true,
            outcomeAccess: "withheld-until-complete-open-screen-finalizer",
        });
    });

    it("preserves a failed all-arm shard without calling it technically clean", () => {
        expect(buildFinishAdvantageOpenCellSummary({
            ...base(),
            completed: 9,
            technicalFailures: 1,
        })).toMatchObject({
            status: "FAILED_FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_TECHNICAL_SHARD",
            accountedLaunches: 10,
            complete: true,
            technicallyClean: false,
        });
    });

    it("distinguishes incomplete accounting from a clean completion", () => {
        expect(buildFinishAdvantageOpenCellSummary({
            ...base(),
            completed: 9,
            technicalFailures: 0,
        })).toMatchObject({ complete: false, technicallyClean: true });
    });
});
