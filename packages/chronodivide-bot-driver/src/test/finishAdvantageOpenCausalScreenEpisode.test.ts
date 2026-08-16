import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { describe, expect, it } from "vitest";
import { buildFinishAdvantageOpenArms } from "../training/finishAdvantageOpenCausalScreenAnalysis.js";
import {
    FINISH_ADVANTAGE_OPEN_EPISODE_SCHEMA_VERSION,
    finishAdvantageOpenArmPolicyCommitment,
    validateFinishAdvantageOpenEpisodeSpec,
} from "../training/finishAdvantageOpenCausalScreenEpisode.js";

const arms = buildFinishAdvantageOpenArms([2, 8]);
const base = () => {
    const arm = arms[0];
    return {
        schemaVersion: FINISH_ADVANTAGE_OPEN_EPISODE_SCHEMA_VERSION,
        episodeId: "f0-k0-a0-s0",
        familyId: "mf_hills",
        mapName: "cd_chrono_hills.map",
        mapSha256: "a".repeat(64),
        arm,
        policySha256: finishAdvantageOpenArmPolicyCommitment(arm).policySha256,
        familyOrdinal: 0,
        countryOrdinal: 0,
        requestedEngineSeed: 4_227_000_000,
        candidateSlot: 0 as const,
        candidateCountry: Countries.USA,
        baselineCountry: Countries.USA,
        maxTicks: 24_000,
    };
};

describe("finish-advantage open causal-screen episode contract", () => {
    it("binds every arm to a deterministic distinct policy commitment", () => {
        const first = arms.map(finishAdvantageOpenArmPolicyCommitment);
        const repeat = arms.map(finishAdvantageOpenArmPolicyCommitment);
        expect(first).toEqual(repeat);
        expect(new Set(first.map(({ policySha256 }) => policySha256)).size).toBe(arms.length);
        expect(first.every(({ policySha256 }) => /^[0-9a-f]{64}$/.test(policySha256))).toBe(true);
        expect(first.map(({ policy }) => policy.terminalBaseRaceMode)).toEqual([
            "none",
            "legacy_v5_ignore_own_base_loss",
            "strict_literal_endpoint_base_race",
            "strict_literal_endpoint_base_race",
            "strict_literal_endpoint_base_race",
            "strict_literal_endpoint_base_race",
        ]);
    });

    it("accepts the exact frozen country, slot, map, and horizon contract", () => {
        expect(validateFinishAdvantageOpenEpisodeSpec(base())).toEqual(base());
    });

    it("rejects arm-policy drift and non-reciprocal countries", () => {
        expect(() => validateFinishAdvantageOpenEpisodeSpec({
            ...base(),
            policySha256: "b".repeat(64),
        })).toThrow("policy commitment drifted");
        expect(() => validateFinishAdvantageOpenEpisodeSpec({
            ...base(),
            baselineCountry: Countries.IRAQ,
        })).toThrow("grid or horizon");
    });

    it("rejects invalid family-country ordinals and horizons", () => {
        expect(() => validateFinishAdvantageOpenEpisodeSpec({ ...base(), familyOrdinal: 10 }))
            .toThrow("grid or horizon");
        expect(() => validateFinishAdvantageOpenEpisodeSpec({ ...base(), countryOrdinal: -1 }))
            .toThrow("grid or horizon");
        expect(() => validateFinishAdvantageOpenEpisodeSpec({ ...base(), maxTicks: 0 }))
            .toThrow("grid or horizon");
    });
});
