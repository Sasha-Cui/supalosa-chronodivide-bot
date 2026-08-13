import { describe, expect, it } from "vitest";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { EconomicStartTrial, reduceEconomicStartFamilies } from "../training/methodV6EconomicStartGate.js";

const family = { familyId: "family-a", mapName: "a.map", mapSha256: "a".repeat(64) };
const completeTrials = (): EconomicStartTrial[] => Object.values(Countries).flatMap((country, countryIndex) =>
    ([0, 1] as const).map((slot) => ({
        ...family,
        country,
        slot,
        seedBlockIndex: countryIndex * 2 + slot,
        requestedEngineSeed: 1_000 + countryIndex * 2 + slot,
        ticks: 100,
        candidateEstablished: true,
        baselineEstablished: true,
        candidateFirstBuildingTick: 80,
        baselineFirstBuildingTick: 90,
        engineFinishedBeforeEstablishment: false,
        technicalFailure: null,
    })),
);

describe("Method-v6 economic-start family reducer", () => {
    it("supports only complete reciprocal all-country establishment", () => {
        expect(reduceEconomicStartFamilies([family], completeTrials())[0]).toMatchObject({
            supported: true,
            trialCount: 18,
            establishedTrialCount: 18,
            maxEstablishmentTick: 90,
        });
    });

    it("rejects a single non-establishing trial", () => {
        const rows = completeTrials();
        rows[0] = { ...rows[0], candidateEstablished: false, candidateFirstBuildingTick: null };
        expect(reduceEconomicStartFamilies([family], rows)[0]).toMatchObject({
            supported: false,
            establishedTrialCount: 17,
        });
    });

    it("rejects incomplete coverage and technical failures", () => {
        const rows = completeTrials().slice(1);
        rows[0] = { ...rows[0], technicalFailure: "synthetic" };
        expect(reduceEconomicStartFamilies([family], rows)[0]).toMatchObject({
            supported: false,
            trialCount: 17,
            technicalFailureCount: 1,
        });
    });
});
