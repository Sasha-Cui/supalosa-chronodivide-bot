import { describe, expect, it } from "vitest";
import {
    OFFICIAL_MAP_LIVE_COUNTRIES,
    OFFICIAL_MAP_LIVE_ENGINE_SEED_BASE,
    OFFICIAL_MAP_LIVE_TARGET_TICK,
    OFFICIAL_MAP_LIVE_WARNING_RULE,
    parseOfficialMapIni,
} from "../training/officialMapLiveCompatibilityCampaign.js";
import {
    parseOfficialMapLiveSacct,
    validateOfficialMapReplicateShape,
} from "../training/officialMapLiveCompatibilityAggregate.js";

describe("official-map live outcome-blind compatibility gate", () => {
    it("freezes the all-country, two-slot, two-replicate design", () => {
        expect(OFFICIAL_MAP_LIVE_COUNTRIES).toHaveLength(9);
        expect(new Set(OFFICIAL_MAP_LIVE_COUNTRIES).size).toBe(9);
        expect(41 * 9 * 2).toBe(738);
        expect(738 * 2).toBe(1_476);
        expect(OFFICIAL_MAP_LIVE_ENGINE_SEED_BASE).toBe(4_226_200_000);
        expect(OFFICIAL_MAP_LIVE_TARGET_TICK).toBe(120);
        expect(OFFICIAL_MAP_LIVE_WARNING_RULE.consoleErrorAlwaysFails).toBe(true);
        expect(OFFICIAL_MAP_LIVE_WARNING_RULE.truncatedCaptureFails).toBe(true);
    });

    it("parses case-insensitive INI sections without inventing absent player metadata", () => {
        const ini = parseOfficialMapIni([
            "\uFEFF; official map fixture",
            "[Map]",
            "Theater=SNOW ; inline comment",
            "Size=0,0,100,100",
            "[Waypoints]",
            "0=10010",
            "1=90090",
            "[map]",
            "Theater=TEMPERATE",
        ].join("\r\n"));
        expect(ini.get("map")?.get("theater")).toBe("SNOW");
        expect(ini.get("map")?.get("size")).toBe("0,0,100,100");
        expect(ini.get("waypoints")?.get("0")).toBe("10010");
        expect(ini.get("basic")?.get("maxplayer")).toBeUndefined();
        expect(ini.get("header")?.get("numberstartingpoints")).toBeUndefined();
    });

    it("accepts exact success and structured pre-horizon failure shapes", () => {
        const seed = 4_226_200_000;
        const common = {
            replicate: 0,
            candidateSlot: 0,
            requestedEngineSeed: seed,
            warnings: [],
            warningCaptureTruncated: false,
            reviewCategories: [],
            technicalDigestSha256: "a".repeat(64),
        };
        const success = {
            ...common,
            gameModeSha256: "b".repeat(64),
            initialTick: 0,
            finalTick: 120,
            updateCount: 120,
            tickArithmeticConsistent: true,
            reachedTargetTick: true,
            candidateStart: { x: 1, y: 2 },
            baselineStart: { x: 3, y: 4 },
            distinctStarts: true,
            startsDeclared: true,
            error: null,
            failureCategories: ["invalid_waypoint"],
        };
        expect(validateOfficialMapReplicateShape(success, 0, 0, seed)).toBe(true);
        const failure = {
            ...common,
            gameModeSha256: null,
            initialTick: null,
            finalTick: null,
            updateCount: 0,
            tickArithmeticConsistent: false,
            reachedTargetTick: false,
            candidateStart: null,
            baselineStart: null,
            distinctStarts: false,
            startsDeclared: false,
            error: { category: "engine_error", name: "captured_error", messageSha256: "c".repeat(64) },
            failureCategories: ["engine_error"],
        };
        expect(validateOfficialMapReplicateShape(failure, 0, 0, seed)).toBe(true);
        expect(validateOfficialMapReplicateShape({ ...failure, updateCount: 1 }, 0, 0, seed)).toBe(false);
        expect(validateOfficialMapReplicateShape({ ...failure, error: null }, 0, 0, seed)).toBe(false);
        expect(validateOfficialMapReplicateShape({ ...success, reachedTargetTick: false }, 0, 0, seed)).toBe(false);
    });

    it("requires all 738 clean scheduler tasks on pi_jss233", () => {
        const raw = Array.from({ length: 738 }, (_, index) =>
            `321_${index}|${10_000 + index}|COMPLETED|0:0|pi_jss233`,
        ).join("\n");
        expect(parseOfficialMapLiveSacct(raw, "321").size).toBe(738);
        expect(() => parseOfficialMapLiveSacct(
            raw.replace(
                "321_37|10037|COMPLETED|0:0|pi_jss233",
                "321_37|10037|COMPLETED|0:0|wrong_account",
            ),
            "321",
        )).toThrow("failed, duplicate, or unauthorized");
        expect(() => parseOfficialMapLiveSacct(raw.split("\n").slice(0, -1).join("\n"), "321"))
            .toThrow("737/738 tasks");
    });
});
