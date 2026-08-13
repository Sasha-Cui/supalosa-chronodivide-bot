import { describe, expect, it, vi } from "vitest";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import {
    CONTINUOUS_OFFENSE_EPISODE_SCHEMA_VERSION,
    createContinuousOffenseExperimentCandidate,
    validateContinuousOffenseEpisodeSpec,
} from "../training/continuousOffenseEpisode.js";
import { buildContinuousOffenseArms } from "../training/continuousOffenseExperimentPolicy.js";

const arms = new Map(buildContinuousOffenseArms().map((arm) => [arm.armId, arm]));

describe("continuous-offense episode", () => {
    it("uses the exact external construction path for self-control", () => {
        const external = { name: "external" };
        const factory = { create: vi.fn(() => external) };
        const policy = arms.get("external_baseline_control")!.policy;
        expect(createContinuousOffenseExperimentCandidate(
            factory as any,
            "candidate",
            Countries.USA,
            policy,
            vi.fn(),
        )).toBe(external);
        expect(factory.create).toHaveBeenCalledOnce();
    });

    it("validates the hash-bound episode contract", () => {
        const arm = arms.get("macro_route_blockers_full")!;
        const spec = {
            schemaVersion: CONTINUOUS_OFFENSE_EPISODE_SCHEMA_VERSION,
            episodeId: "a5-s0",
            familyId: "mf_example",
            mapName: "example.map",
            mapSha256: "a".repeat(64),
            policyId: arm.policyId,
            policy: arm.policy,
            seedBlockIndex: 0,
            requestedEngineSeed: 1,
            candidateSlot: 0 as const,
            candidateCountry: Countries.USA,
            baselineCountry: Countries.USA,
            maxTicks: 24_000,
        };
        expect(validateContinuousOffenseEpisodeSpec(spec)).toEqual(spec);
        expect(() => validateContinuousOffenseEpisodeSpec({ ...spec, policyId: "b".repeat(64) }))
            .toThrow("canonical policy SHA-256");
    });
});
