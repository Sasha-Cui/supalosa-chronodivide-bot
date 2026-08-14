import { describe, expect, it, vi } from "vitest";
import { Bot } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import {
    PROGRESS_CERTIFIED_EPISODE_SCHEMA_VERSION,
    createProgressCertifiedExperimentCandidate,
    validateProgressCertifiedEpisodeSpec,
} from "../training/progressCertifiedEpisode.js";
import { buildProgressCertifiedArms } from "../training/progressCertifiedExperimentPolicy.js";
import { assertOfflineAgentRuntimeIdentity } from "../benchmark/seededOfflineGame.js";

const arms = new Map(buildProgressCertifiedArms().map((arm) => [arm.armId, arm]));

describe("progress-certified episode", () => {
    it("uses the exact external construction path for self-control", () => {
        const external = { name: "external" };
        const factory = { create: vi.fn(() => external) };
        const policy = arms.get("external_baseline_control")!.policy;
        expect(createProgressCertifiedExperimentCandidate(
            factory as any,
            "candidate",
            Countries.USA,
            policy,
            vi.fn(),
        )).toBe(external);
        expect(factory.create).toHaveBeenCalledOnce();
    });

    it("validates the hash-bound episode contract", () => {
        const arm = arms.get("external_low_count_progress_hybrid")!;
        const spec = {
            schemaVersion: PROGRESS_CERTIFIED_EPISODE_SCHEMA_VERSION,
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
        expect(validateProgressCertifiedEpisodeSpec(spec)).toEqual(spec);
        expect(() => validateProgressCertifiedEpisodeSpec({ ...spec, policyId: "b".repeat(64) }))
            .toThrow("canonical policy SHA-256");
    });

    it("requires candidates to inherit from the simulator's exact Bot class", () => {
        const external = arms.get("external_baseline_control")!.policy;
        const hybrid = arms.get("external_low_count_progress_hybrid")!.policy;
        const inherited = Object.create(Bot.prototype);
        Object.assign(inherited, { name: "inherited" });
        const factory = {
            create: vi.fn((name: string, country: Countries) => ({ name, country })),
            createDefaultStrategy: vi.fn(() => ({ onAiUpdate: vi.fn() })),
            createWithStrategy: vi.fn(() => inherited),
        };
        const wrongRuntimeCandidate = createProgressCertifiedExperimentCandidate(
            factory as any,
            "external",
            Countries.USA,
            external,
            vi.fn(),
        );
        expect(() => assertOfflineAgentRuntimeIdentity([wrongRuntimeCandidate]))
            .toThrow("exact Bot class");

        const hybridCandidate = createProgressCertifiedExperimentCandidate(
            factory as any,
            "hybrid",
            Countries.USA,
            hybrid,
            vi.fn(),
        );
        expect(hybridCandidate).toBeInstanceOf(Bot);
        expect(() => assertOfflineAgentRuntimeIdentity([hybridCandidate])).not.toThrow();
    });
});
