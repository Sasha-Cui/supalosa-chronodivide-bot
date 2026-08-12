import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";

export type CountryPairingMode = "cross" | "mirror";
export type CountryPair = { candidateCountry: Countries; baselineCountry: Countries };

export const buildCountryPairs = (
    candidateCountries: Countries[],
    baselineCountries: Countries[],
    mode: CountryPairingMode,
): CountryPair[] => {
    if (candidateCountries.length === 0 || baselineCountries.length === 0) {
        throw new Error("Country lists must be non-empty");
    }
    if (new Set(candidateCountries).size !== candidateCountries.length || new Set(baselineCountries).size !== baselineCountries.length) {
        throw new Error("Country lists must not contain duplicates");
    }
    if (mode === "mirror") {
        const baselineSet = new Set(baselineCountries);
        if (
            candidateCountries.length !== baselineCountries.length ||
            candidateCountries.some((country) => !baselineSet.has(country))
        ) {
            throw new Error("Mirror country pairing requires identical candidate and baseline country sets");
        }
        return candidateCountries.map((country) => ({
            candidateCountry: country,
            baselineCountry: country,
        }));
    }
    return candidateCountries.flatMap((candidateCountry) =>
        baselineCountries.map((baselineCountry) => ({ candidateCountry, baselineCountry })),
    );
};
