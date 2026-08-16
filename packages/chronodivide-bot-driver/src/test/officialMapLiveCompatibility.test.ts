import { describe, expect, it } from "vitest";
import {
    OFFICIAL_MAP_LIVE_COUNTRIES,
    OFFICIAL_MAP_LIVE_ENGINE_SEED_BASE,
    OFFICIAL_MAP_LIVE_TARGET_TICK,
    OFFICIAL_MAP_LIVE_WARNING_RULE,
    parseOfficialMapIni,
} from "../training/officialMapLiveCompatibilityCampaign.js";
import { parseOfficialMapLiveSacct } from "../training/officialMapLiveCompatibilityAggregate.js";

describe("official-map live outcome-blind compatibility gate", () => {
    it("freezes the all-country, two-slot, two-replicate design", () => {
        expect(OFFICIAL_MAP_LIVE_COUNTRIES).toHaveLength(9);
        expect(new Set(OFFICIAL_MAP_LIVE_COUNTRIES).size).toBe(9);
        expect(41 * 9 * 2).toBe(738);
        expect(738 * 2).toBe(1_476);
        expect(OFFICIAL_MAP_LIVE_ENGINE_SEED_BASE).toBe(4_226_000_000);
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
