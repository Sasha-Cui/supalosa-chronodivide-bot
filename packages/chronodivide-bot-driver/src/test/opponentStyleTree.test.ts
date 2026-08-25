import { describe, expect, it } from "vitest";
import { OpponentStyleExample, fitOpponentStyleTree, groupedOpponentStyleCrossValidation,
    opponentStyleTreeStats, predictOpponentStyle, validateOpponentStyleFeatures } from
    "../training/opponentStyleTree.js";

const examples = (): OpponentStyleExample[] => {
    const rows: OpponentStyleExample[] = [];
    const countries = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];
    const starts = ["west", "east", "top", "bottom"];
    for (const [countryIndex, country] of countries.entries()) {
        for (const [startIndex, start] of starts.entries()) {
            for (const slot of [0, 1] as const) {
                rows.push({ label: "supalosa", country, start, slot,
                    features: { credits: 10_000 - countryIndex, "rules.TANK.nonbuilding_count": startIndex } });
                rows.push({ label: "advanced", country, start, slot,
                    features: { credits: 8_000 - countryIndex, "rules.TANK.nonbuilding_count": startIndex + 5 } });
            }
        }
    }
    return rows;
};

describe("opponent-style decision tree", () => {
    it("fits a deterministic shallow public-state tree", () => {
        const tree = fitOpponentStyleTree(examples());
        expect(opponentStyleTreeStats(tree)).toMatchObject({ depth: 1, leaves: 2 });
        expect(predictOpponentStyle(tree, { credits: 9_900, "rules.TANK.nonbuilding_count": 1 }))
            .toBe("supalosa");
        expect(predictOpponentStyle(tree, { credits: 7_900, "rules.TANK.nonbuilding_count": 7 }))
            .toBe("advanced");
        expect(fitOpponentStyleTree(examples())).toEqual(tree);
    });

    it("passes country, start, and slot grouped holdouts without metadata features", () => {
        for (const group of ["country", "start", "slot"] as const) {
            const result = groupedOpponentStyleCrossValidation(examples(), group);
            expect(result.metrics).toMatchObject({
                games: 144,
                correct: 144,
                accuracy: 1,
                balancedAccuracy: 1,
                recall: { supalosa: 1, advanced: 1 },
            });
            expect(result.metrics.oneSided95WilsonLower).toBeGreaterThan(0.9);
        }
    });

    it("rejects metadata, identity, action, and non-finite features", () => {
        for (const key of ["country", "start", "slot", "seed", "bundle_hash", "build_id",
            "source_path", "bot_class", "identity", "action_count", "production_queue", "outcome"]) {
            expect(() => validateOpponentStyleFeatures({ [key]: 1 })).toThrow(/prohibited/);
        }
        expect(() => validateOpponentStyleFeatures({ credits: Number.NaN })).toThrow(/finite/);
        expect(() => validateOpponentStyleFeatures({})).toThrow(/empty/);
    });

    it("requires both labels and valid training size", () => {
        expect(() => fitOpponentStyleTree(examples().filter((row) => row.label === "supalosa")))
            .toThrow(/both labels/);
        expect(() => fitOpponentStyleTree(examples().slice(0, 4))).toThrow(/configuration/);
    });
});
