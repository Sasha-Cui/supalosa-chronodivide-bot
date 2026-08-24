import { describe, expect, it } from "vitest";
import { HFO_RA2WEB_COUNTRIES, HFO_RA2WEB_CROSSPLAY_SPEC } from
    "../training/hfoRa2WebAdvancedCrossplay.js";

describe("HFO RA2Web Advanced cross-play design", () => {
    it("freezes the balanced sample and uncertainty design", () => {
        expect(HFO_RA2WEB_CROSSPLAY_SPEC).toEqual({
            seedBase: 4_261_000_000,
            casesPerCountryStartSlot: 5,
            maxOffsets: 400,
            maxTicks: 90_000,
            countryCount: 9,
            startCount: 4,
            slotCount: 2,
            caseCount: 360,
            armCount: 2,
            taskCount: 720,
            clusterCount: 36,
            clusterTCritical: 1.68957,
            pairedTCritical: 1.64913,
        });
        expect(HFO_RA2WEB_COUNTRIES).toEqual([
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
        expect(9 * 4 * 2 * 5).toBe(HFO_RA2WEB_CROSSPLAY_SPEC.caseCount);
        expect(HFO_RA2WEB_CROSSPLAY_SPEC.seedBase + 8 * 100_000 + 3 * 20_000 + 10_000 + 399)
            .toBeLessThan(2 ** 32);
    });
});
