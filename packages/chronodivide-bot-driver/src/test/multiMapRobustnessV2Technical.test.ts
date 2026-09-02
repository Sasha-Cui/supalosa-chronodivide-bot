import { describe, expect, it } from "vitest";
import { MULTIMAP_V2_MAPS, MULTIMAP_V2_TASK_COUNT, multiMapV2IsScreenCase,
    multiMapV2ScreenCaseCount, multiMapV2SelectedCaseCount } from
    "../training/multiMapRobustnessV2Technical.js";

describe("multi-map robustness V2 technical campaign", () => {
    it("freezes the 13 new exact map identities and disjoint seed blocks", () => {
        expect(MULTIMAP_V2_TASK_COUNT).toBe(13);
        expect(MULTIMAP_V2_MAPS.map((row) => [row.id, row.fileName, row.startCount, row.family])).toEqual([
            ["hfo-original", "cd_chrono_mp32s8.map", 8, "hfo-primary"],
            ["hfo-golden", "cd_chrono_heckgolden.mpr", 6, "hfo-primary"],
            ["hfo-corners", "cd_chrono_heckcorners.map", 4, "hfo-primary"],
            ["hfo-corners-b", "cd_chrono_heckcorners_b.map", 4, "hfo-primary"],
            ["hfo-corners-b-golden", "cd_chrono_heckcorners_b_golden.map", 4, "hfo-primary"],
            ["hfo-bvb", "cd_chrono_heckbvb.map", 2, "hfo-secondary"],
            ["hfo-lvl", "cd_chrono_hecklvl.map", 2, "hfo-secondary"],
            ["hfo-rvr", "cd_chrono_heckrvr.map", 2, "hfo-secondary"],
            ["hfo-tvt", "cd_chrono_hecktvt.map", 2, "hfo-secondary"],
            ["tour-of-egypt", "cd_chrono_tourofegypt.map", 6, "distinct-primary"],
            ["south-pacific", "cd_chrono_mp01t4.map", 4, "distinct-primary"],
            ["south-pacific-2", "cd_2_south_pacific.map", 2, "distinct-secondary"],
            ["pacific-heights", "cd_chrono_pacific.map", 4, "distinct-primary"],
        ]);
        expect(MULTIMAP_V2_MAPS.map((row) => row.seedBase)).toEqual(
            Array.from({ length: 13 }, (_, index) => 3_000_000_000 + index * 100_000));
        expect(new Set(MULTIMAP_V2_MAPS.map((row) => row.sha256)).size).toBe(13);
    });

    it("freezes 4,068 zero-update cases and the exact 900-game screen", () => {
        expect(MULTIMAP_V2_MAPS.reduce((sum, row) => sum + multiMapV2SelectedCaseCount(row), 0)).toBe(4_068);
        expect(MULTIMAP_V2_MAPS.reduce((sum, row) => sum + multiMapV2ScreenCaseCount(row), 0)).toBe(900);
        expect(MULTIMAP_V2_MAPS.map((row) => multiMapV2ScreenCaseCount(row))).toEqual(
            [144, 108, 72, 72, 72, 36, 36, 36, 36, 108, 72, 36, 72]);
    });

    it("selects one deterministic opponent per country/start/slot screen cell", () => {
        for (const spec of MULTIMAP_V2_MAPS) for (let country = 0; country < 9; country += 1)
            for (let candidateStart = 0; candidateStart < spec.startCount; candidateStart += 1) {
                const selected = [];
                for (let opponentStart = 0; opponentStart < spec.startCount; opponentStart += 1)
                    if (opponentStart !== candidateStart) for (let repeat = 0; repeat < (spec.startCount === 2 ? 5 : 1); repeat += 1)
                        if (multiMapV2IsScreenCase(spec, country, candidateStart, opponentStart, repeat))
                            selected.push([opponentStart, repeat]);
                expect(selected).toHaveLength(1);
            }
    });
});
