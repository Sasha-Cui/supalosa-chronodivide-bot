import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { describe, expect, it } from "vitest";
import {
    Ra2WebCompatibilitySummaryCell,
    parseRa2WebCompatibilitySacct,
    summarizeRa2WebCompatibilityCells,
} from "../training/ra2WebCompatibilityAggregate.js";

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
const opponents = [
    "ra2web_standard",
    "ra2web_sea_land",
    "ra2web_advanced_old_priest",
] as const;
const completeCells = (): Ra2WebCompatibilitySummaryCell[] => countries.flatMap((country, countryOrdinal) =>
    ([0, 1] as const).map((candidateSlot) => ({
        taskIndex: countryOrdinal * 2 + candidateSlot,
        country,
        candidateSlot,
        standardIdenticalToExact: candidateSlot === 0,
        deterministicOpponentIds: [...opponents],
    })),
);

describe("RA2Web compatibility aggregation", () => {
    it("requires all opponents in all nine countries and reciprocal slots", () => {
        const summary = summarizeRa2WebCompatibilityCells(completeCells());
        expect(summary.passed).toBe(true);
        expect(summary.standardEquivalenceCellCount).toBe(9);
        expect(summary.standardDivergenceCellCount).toBe(9);
        expect(summary.opponentSupport).toHaveLength(3);
        expect(summary.opponentSupport.every(({ allCountryReciprocalSupport }) =>
            allCountryReciprocalSupport,
        )).toBe(true);
    });

    it("fails when one opponent lacks one country-slot cell", () => {
        const cells = completeCells();
        cells[17] = {
            ...cells[17],
            deterministicOpponentIds: cells[17].deterministicOpponentIds.filter((id) =>
                id !== "ra2web_advanced_old_priest",
            ),
        };
        const summary = summarizeRa2WebCompatibilityCells(cells);
        expect(summary.passed).toBe(false);
        expect(summary.opponentSupport.find(({ opponentId }) =>
            opponentId === "ra2web_advanced_old_priest",
        )?.supportedCountrySlotCount).toBe(17);
    });

    it("rejects partial or duplicate cell populations", () => {
        expect(() => summarizeRa2WebCompatibilityCells(completeCells().slice(0, 17)))
            .toThrow(/exactly 18/);
        const duplicate = completeCells();
        duplicate[17] = { ...duplicate[17], taskIndex: 0 };
        expect(() => summarizeRa2WebCompatibilityCells(duplicate)).toThrow(/exactly 18/);
    });

    it("parses exactly 18 successful pi_jss233 array tasks", () => {
        const raw = Array.from({ length: 18 }, (_, index) =>
            `900_${index}|${9100 + index}|COMPLETED|0:0|pi_jss233`,
        ).join("\n");
        expect(parseRa2WebCompatibilitySacct(raw, "900").size).toBe(18);
        expect(() => parseRa2WebCompatibilitySacct(
            raw.replace("900_4|9104|COMPLETED|0:0|pi_jss233", "900_4|9104|FAILED|1:0|pi_jss233"),
            "900",
        )).toThrow(/failed, duplicate, or unauthorized/);
        expect(() => parseRa2WebCompatibilitySacct(raw.replace(/\n900_17[^\n]+$/, ""), "900"))
            .toThrow(/17\/18/);
    });
});
