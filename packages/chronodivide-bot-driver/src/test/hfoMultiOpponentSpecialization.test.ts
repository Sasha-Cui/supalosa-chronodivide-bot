import { describe, expect, it } from "vitest";
import { HFO_MULTI_OPPONENT_ARMS, HFO_MULTI_OPPONENT_COUNTRIES, HFO_MULTI_OPPONENT_SPEC } from
    "../training/hfoMultiOpponentSpecialization.js";

describe("HFO multi-opponent specialization design", () => {
    it("freezes the balanced sample and uncertainty design", () => {
        expect(HFO_MULTI_OPPONENT_SPEC).toEqual({
            seedBase: 4_262_000_000,
            casesPerCountryStartSlot: 1,
            maxOffsets: 400,
            maxTicks: 90_000,
            countryCount: 9,
            startCount: 4,
            slotCount: 2,
            caseCount: 72,
            armCount: 10,
            taskCount: 720,
            clusterCount: 36,
            clusterTCritical: 1.68957,
            pairedTCritical: 1.29376,
        });
        expect(HFO_MULTI_OPPONENT_COUNTRIES).toEqual([
            "Americans",
            "Alliance",
            "French",
            "Germans",
            "British",
            "Africans",
            "Arabs",
            "Confederation",
            "Russians",
        ]);
        expect(9 * 4 * 2).toBe(HFO_MULTI_OPPONENT_SPEC.caseCount);
        expect(HFO_MULTI_OPPONENT_ARMS.map((arm) => arm.id)).toEqual([
            "deployed_vs_supalosa",
            "deployed_vs_advanced",
            "profiles_off_vs_supalosa",
            "profiles_off_vs_advanced",
            "exact_tactics_off_vs_supalosa",
            "exact_tactics_off_vs_advanced",
            "specialization_off_vs_supalosa",
            "specialization_off_vs_advanced",
            "external_supalosa_vs_supalosa",
            "external_supalosa_vs_advanced",
        ]);
        expect(HFO_MULTI_OPPONENT_SPEC.seedBase + 8 * 100_000 + 3 * 20_000 + 10_000 + 399)
            .toBeLessThan(2 ** 32);
    });
});
