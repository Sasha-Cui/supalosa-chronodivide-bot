import { describe, expect, it } from "vitest";
import { PEAK_PROFILE_ARMS } from "../training/peakProfilePolicies.js";
import { PEAK_STUDY_COUNTRIES, PEAK_STUDY_POPULATIONS, PEAK_STUDY_SPEC, peakStageArms } from
    "../training/peakProfileScopeStudy.js";

describe("Peak profile-scope study design", () => {
    it("freezes disjoint development and replication populations", () => {
        expect(PEAK_STUDY_COUNTRIES).toHaveLength(9);
        expect(PEAK_STUDY_POPULATIONS).toEqual([
            { id: "development", seedBase: 4_281_000_000, casesPerCell: 1 },
            { id: "replication", seedBase: 4_282_000_000, casesPerCell: 5 },
        ]);
        expect(PEAK_STUDY_SPEC).toEqual({ maxOffsets: 100, maxUpdates: 90_000, selectionCaseCount: 216,
            developmentCaseCount: 36, developmentArmCount: 6, developmentTaskCount: 216,
            replicationCaseCount: 180, replicationArmCount: 2, replicationTaskCount: 360,
            clusterCount: 18, clusterTCritical: 1.73961 });
        expect(2 * 9 * 2 * (1 + 5)).toBe(PEAK_STUDY_SPEC.selectionCaseCount);
        expect(4_282_000_000 + 8 * 10_000 + 1_000 + 100 + 99).toBeLessThan(2 ** 32);
    });

    it("runs all arms in development and only the frozen champion in replication", () => {
        expect(peakStageArms(0, null)).toEqual(PEAK_PROFILE_ARMS);
        expect(peakStageArms(1, { champion: { id: "both_both" } }).map((row) => row.id))
            .toEqual(["deployed", "both_both"]);
    });

    it("preserves the intended one-start factorial boundary", () => {
        for (const arm of PEAK_PROFILE_ARMS.slice(1, 4)) {
            expect(arm.historical).toBe(false);
            expect(arm.strategyScope === "both" || arm.botScope === "both").toBe(true);
        }
        expect(PEAK_PROFILE_ARMS.slice(4).every((arm) => arm.historical)).toBe(true);
    });

    it("fails if replication names a missing arm", () => {
        expect(() => peakStageArms(1, { champion: { id: "missing" } })).toThrow();
    });
});
