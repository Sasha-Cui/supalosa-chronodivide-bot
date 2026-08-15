import { describe, expect, it } from "vitest";
import {
    PROGRESS_CERTIFIED_V5_ADVANCEMENT_RULE,
    PROGRESS_CERTIFIED_V5_COMPATIBILITY_JOB_ID,
    PROGRESS_CERTIFIED_V5_COMPATIBILITY_SHA256,
    PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_COUNTRIES,
    PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_ENGINE_SEED_BASE,
    PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES,
    PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_LAUNCH_COUNT,
    PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_MAX_TICKS,
    PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_PROTOCOL_SHA256,
    PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_SHARD_COUNT,
    buildProgressCertifiedV5Episodes,
} from "../training/progressCertifiedV5OpenDevelopmentCampaign.js";
import { buildProgressCertifiedV5Arms } from "../training/progressCertifiedV5ExperimentPolicy.js";

describe("progress-certified V5 open-development campaign freeze", () => {
    it("uses all ten open families, all countries, reciprocal slots, and 540 launches", () => {
        expect(PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES).toHaveLength(10);
        expect(new Set(PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES.map(
            ({ familyId }) => familyId,
        )).size).toBe(10);
        expect(new Set(PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_FAMILIES.map(
            ({ mapSha256 }) => mapSha256,
        )).size).toBe(10);
        expect(PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_COUNTRIES).toHaveLength(9);
        expect(PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_SHARD_COUNT).toBe(90);
        expect(PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_LAUNCH_COUNT).toBe(540);
        expect(PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_ENGINE_SEED_BASE).toBe(4_215_000_000);
        expect(PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_MAX_TICKS).toBe(24_000);
    });

    it("binds exact external, V4, and V5 reciprocal episodes", () => {
        const arms = buildProgressCertifiedV5Arms();
        const episodes = buildProgressCertifiedV5Episodes(arms);
        expect(episodes).toHaveLength(6);
        for (const arm of arms) {
            expect(episodes.filter(({ armId }) => armId === arm.armId).map(
                ({ candidateSlot }) => candidateSlot,
            )).toEqual([0, 1]);
        }
    });

    it("freezes exact protocol, compatibility, and reliable-improvement commitments", () => {
        expect(PROGRESS_CERTIFIED_V5_OPEN_DEVELOPMENT_PROTOCOL_SHA256).toMatch(/^[0-9a-f]{64}$/);
        expect(PROGRESS_CERTIFIED_V5_COMPATIBILITY_SHA256).toMatch(/^[0-9a-f]{64}$/);
        expect(PROGRESS_CERTIFIED_V5_COMPATIBILITY_JOB_ID).toMatch(/^\d+$/);
        expect(PROGRESS_CERTIFIED_V5_ADVANCEMENT_RULE).toHaveLength(7);
    });
});
