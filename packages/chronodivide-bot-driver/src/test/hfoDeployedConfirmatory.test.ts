import { describe, expect, it } from "vitest";
import { HFO_CONFIRMATORY_COUNTRIES, HFO_DEPLOYED_CONFIRMATORY_SPEC } from
    "../training/hfoDeployedConfirmatory.js";

describe("deployed HFO confirmatory design", () => {
    it("freezes the balanced sample and uncertainty design", () => {
        expect(HFO_DEPLOYED_CONFIRMATORY_SPEC).toEqual({
            seedBase: 4_260_000_000,
            casesPerCountryStartSlot: 10,
            maxOffsets: 400,
            maxTicks: 90_000,
            countryCount: 9,
            startCount: 4,
            slotCount: 2,
            caseCount: 720,
            clusterCount: 36,
            clusterTCritical: 1.68957,
        });
        expect(HFO_CONFIRMATORY_COUNTRIES).toEqual([
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
        expect(9 * 4 * 2 * 10).toBe(HFO_DEPLOYED_CONFIRMATORY_SPEC.caseCount);
        expect(HFO_DEPLOYED_CONFIRMATORY_SPEC.seedBase + 8 * 100_000 + 3 * 20_000 + 10_000 + 399)
            .toBeLessThan(2 ** 32);
    });
});
