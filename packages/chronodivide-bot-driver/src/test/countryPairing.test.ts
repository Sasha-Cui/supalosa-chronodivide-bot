import { describe, expect, test } from "vitest";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { buildCountryPairs } from "../benchmark/countryPairing.js";

describe("country pairing", () => {
    test("constructs one exact mirror per country", () => {
        const countries = [Countries.USA, Countries.IRAQ, Countries.LIBYA];
        expect(buildCountryPairs(countries, [...countries].reverse(), "mirror")).toEqual([
            { candidateCountry: Countries.USA, baselineCountry: Countries.USA },
            { candidateCountry: Countries.IRAQ, baselineCountry: Countries.IRAQ },
            { candidateCountry: Countries.LIBYA, baselineCountry: Countries.LIBYA },
        ]);
    });

    test("preserves the legacy Cartesian cross product", () => {
        expect(buildCountryPairs([Countries.USA, Countries.IRAQ], [Countries.FRANCE], "cross")).toEqual([
            { candidateCountry: Countries.USA, baselineCountry: Countries.FRANCE },
            { candidateCountry: Countries.IRAQ, baselineCountry: Countries.FRANCE },
        ]);
    });

    test("mirror mode rejects unequal or duplicate country sets", () => {
        expect(() => buildCountryPairs([Countries.USA], [Countries.IRAQ], "mirror")).toThrow("identical");
        expect(() => buildCountryPairs([Countries.USA, Countries.USA], [Countries.USA], "mirror")).toThrow(
            "duplicates",
        );
    });
});
