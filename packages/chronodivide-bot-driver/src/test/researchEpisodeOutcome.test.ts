import { describe, expect, test } from "vitest";
import { assertShortGameBuildingEliminationOutcome } from "../training/researchEpisode.js";


describe("research episode actual-win invariant", () => {
    test("accepts wins only after every opposing building is destroyed", () => {
        expect(() => assertShortGameBuildingEliminationOutcome(
            "candidate", true, false, true, 3, 0, "candidate-win",
        )).not.toThrow();
        expect(() => assertShortGameBuildingEliminationOutcome(
            "baseline", true, true, false, 0, 4, "baseline-win",
        )).not.toThrow();
        expect(() => assertShortGameBuildingEliminationOutcome(
            "draw", false, false, false, 5, 7, "tick-cap",
        )).not.toThrow();
    });

    test("rejects a defeated flag with surviving enemy buildings", () => {
        expect(() => assertShortGameBuildingEliminationOutcome(
            "candidate", true, false, true, 3, 1, "invalid-candidate",
        )).toThrow(
            /Candidate win violates.*building-elimination/,
        );
        expect(() => assertShortGameBuildingEliminationOutcome(
            "baseline", true, true, false, 1, 3, "invalid-baseline",
        )).toThrow(
            /Baseline win violates.*building-elimination/,
        );
    });

    test("rejects nonterminal or inconsistent defeated flags even when no buildings remain", () => {
        expect(() => assertShortGameBuildingEliminationOutcome(
            "candidate", false, false, true, 3, 0, "unfinished-candidate",
        )).toThrow(/Candidate win violates/);
        expect(() => assertShortGameBuildingEliminationOutcome(
            "candidate", true, true, true, 0, 0, "mutual-defeat",
        )).toThrow(/Candidate win violates/);
    });
});
