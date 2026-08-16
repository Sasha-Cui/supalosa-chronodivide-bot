import { describe, expect, it } from "vitest";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import {
    parseFinishAdvantageStateAuditSacct,
    selectFinishAdvantageMargins,
    summarizeFinishAdvantageMarginExposure,
} from "../training/finishAdvantageStateAuditAggregate.js";

const exposure = (
    margin: 0 | 2 | 4 | 8,
    family: number,
    country: Countries,
    candidateSlot: 0 | 1,
    strike = 2,
) => ({
    margin,
    familyId: `family-${family}`,
    country,
    faction: [
        Countries.USA,
        Countries.KOREA,
        Countries.FRANCE,
        Countries.GERMANY,
        Countries.GREAT_BRITAIN,
    ].includes(country) ? "Allied" as const : "Soviet" as const,
    candidateSlot,
    maximumPositiveStrikeSize: strike,
});

const countries = [
    Countries.USA,
    Countries.KOREA,
    Countries.FRANCE,
    Countries.GERMANY,
    Countries.GREAT_BRITAIN,
    Countries.LIBYA,
    Countries.IRAQ,
    Countries.CUBA,
    Countries.RUSSIA,
];

describe("finish-advantage state-audit aggregation", () => {
    it("selects the largest eligible and smallest eligible median-two margin", () => {
        const cells = ([0, 2, 4] as const).flatMap((margin) =>
            Array.from({ length: 5 }, (_, family) => countries.flatMap((country, countryIndex) =>
                ([0, 1] as const).map((slot) => exposure(
                    margin,
                    family,
                    country,
                    slot,
                    margin === 0 && countryIndex < 5 ? 1 : 2,
                )),
            )).flat(),
        );
        const summaries = summarizeFinishAdvantageMarginExposure(cells);
        expect(summaries.find(({ margin }) => margin === 8)?.eligible).toBe(false);
        expect(summaries.find(({ margin }) => margin === 0)?.medianMaximumPositiveStrikeSizePerExposedCell)
            .toBe(1);
        expect(selectFinishAdvantageMargins(summaries)).toEqual([4, 2]);
    });

    it("requires exposure in every country and every country-slot orientation", () => {
        const eightCountries = Array.from({ length: 5 }, (_, family) =>
            countries.slice(0, 8).flatMap((country) => ([0, 1] as const).map((slot) =>
                exposure(2, family, country, slot),
            )),
        ).flat();
        const eightSummary = summarizeFinishAdvantageMarginExposure(eightCountries)
            .find(({ margin }) => margin === 2)!;
        expect(eightSummary.distinctCountryCount).toBe(8);
        expect(eightSummary.distinctCountrySlotCount).toBe(16);
        expect(eightSummary.eligible).toBe(false);

        const missingOrientation = Array.from({ length: 5 }, (_, family) =>
            countries.flatMap((country) => ([0, 1] as const).flatMap((slot) =>
                country === Countries.RUSSIA && slot === 1 ? [] : [exposure(2, family, country, slot)],
            )),
        ).flat();
        const missingSummary = summarizeFinishAdvantageMarginExposure(missingOrientation)
            .find(({ margin }) => margin === 2)!;
        expect(missingSummary.distinctCountryCount).toBe(9);
        expect(missingSummary.distinctCountrySlotCount).toBe(17);
        expect(missingSummary.eligible).toBe(false);
    });

    it("does not let repeated records create extra support", () => {
        const summaries = summarizeFinishAdvantageMarginExposure([
            exposure(0, 0, Countries.USA, 0, 1),
            exposure(0, 0, Countries.USA, 0, 8),
            exposure(0, 1, Countries.FRANCE, 1, 2),
        ]);
        const zero = summaries.find(({ margin }) => margin === 0)!;
        expect(zero.distinctFamilyCount).toBe(2);
        expect(zero.distinctCountryCount).toBe(2);
        expect(zero.distinctCountrySlotCount).toBe(2);
        expect(zero.exposedCellCount).toBe(2);
        expect(zero.medianMaximumPositiveStrikeSizePerExposedCell).toBe(5);
        expect(zero.eligible).toBe(false);
    });

    it("parses exactly 90 authorized array tasks", () => {
        const raw = Array.from({ length: 90 }, (_, index) =>
            `123_${index}|${5000 + index}|COMPLETED|0:0|pi_jss233`,
        ).join("\n");
        expect(parseFinishAdvantageStateAuditSacct(raw, "123").size).toBe(90);
        expect(() => parseFinishAdvantageStateAuditSacct(
            raw.replace("123_7|5007|COMPLETED|0:0|pi_jss233", "123_7|5007|FAILED|1:0|pi_jss233"),
            "123",
        )).toThrow(/failed, duplicate, or unauthorized/);
    });
});
