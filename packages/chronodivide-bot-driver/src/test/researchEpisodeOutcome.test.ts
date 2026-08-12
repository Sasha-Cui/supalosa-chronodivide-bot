import { describe, expect, test } from "vitest";
import { assertShortGameBuildingEliminationOutcome } from "../training/researchEpisode.js";


describe("research episode actual-win invariant", () => {
    test("accepts wins only after every opposing building is destroyed", () => {
        expect(() => assertShortGameBuildingEliminationOutcome("candidate", 3, 0, "candidate-win")).not.toThrow();
        expect(() => assertShortGameBuildingEliminationOutcome("baseline", 0, 4, "baseline-win")).not.toThrow();
        expect(() => assertShortGameBuildingEliminationOutcome("draw", 5, 7, "tick-cap")).not.toThrow();
    });

    test("rejects a defeated flag with surviving enemy buildings", () => {
        expect(() => assertShortGameBuildingEliminationOutcome("candidate", 3, 1, "invalid-candidate")).toThrow(
            /Candidate win violates.*building-elimination/,
        );
        expect(() => assertShortGameBuildingEliminationOutcome("baseline", 1, 3, "invalid-baseline")).toThrow(
            /Baseline win violates.*building-elimination/,
        );
    });
});
