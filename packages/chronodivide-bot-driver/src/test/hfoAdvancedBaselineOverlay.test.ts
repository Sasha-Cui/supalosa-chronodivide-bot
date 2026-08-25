import { describe, expect, it } from "vitest";
import { HFO_ADVANCED_OVERLAY_ARMS, HFO_ADVANCED_OVERLAY_COUNTRIES, HFO_ADVANCED_OVERLAY_SPEC } from
    "../training/hfoAdvancedBaselineOverlay.js";

describe("HFO Advanced baseline overlay design", () => {
    it("freezes the balanced sample and uncertainty design", () => {
        expect(HFO_ADVANCED_OVERLAY_SPEC).toEqual({
            seedBase: 4_264_000_000,
            casesPerCountryStartSlot: 1,
            maxOffsets: 400,
            maxTicks: 90_000,
            countryCount: 9,
            startCount: 4,
            slotCount: 2,
            caseCount: 72,
            armCount: 5,
            taskCount: 360,
            clusterCount: 36,
            clusterTCritical: 1.68957,
            pairedTCritical: 1.29376,
        });
        expect(HFO_ADVANCED_OVERLAY_COUNTRIES).toEqual([
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
        expect(9 * 4 * 2).toBe(HFO_ADVANCED_OVERLAY_SPEC.caseCount);
        expect(HFO_ADVANCED_OVERLAY_ARMS).toEqual([
            { id: "external_supalosa", external: true, guards: false, assaults: false },
            { id: "overlay_full", external: false, guards: true, assaults: true },
            { id: "overlay_guards_only", external: false, guards: true, assaults: false },
            { id: "overlay_assaults_only", external: false, guards: false, assaults: true },
            { id: "overlay_minimal", external: false, guards: false, assaults: false },
        ]);
        expect(HFO_ADVANCED_OVERLAY_SPEC.seedBase + 8 * 100_000 + 3 * 20_000 + 10_000 + 399)
            .toBeLessThan(2 ** 32);
    });
});
