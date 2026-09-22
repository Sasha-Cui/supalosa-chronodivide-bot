import { describe, expect, it } from "vitest";
import { buildUnifiedIntentD1Plan, validateUnifiedIntentD1Plan, D1_ARMS, D1_COUNTRIES } from "../training/unifiedIntentD1Plan.js";
import { OD1_MAP_IDS } from "../training/unifiedIntentV2OD1Plan.js";
import { UnifiedIntentGate3Map } from "../training/unifiedIntentGate3Plan.js";
const maps = (): UnifiedIntentGate3Map[] => OD1_MAP_IDS.map((id, index) => ({
    id, label: id, fileName: id + ".map", absolutePath: "/maps/" + id + ".map",
    sha256: index.toString(16).padStart(64, "0"), starts: ["1,2", "3,4", "5,6"],
    advancedEligible: id.startsWith("hfo-"),
}));
describe("D1 frozen complete three-arm definitions", () => {
    it("defines exactly 205 fresh identities and 627 advancing episodes, without initializing games", () => {
        const plan = buildUnifiedIntentD1Plan(maps());
        validateUnifiedIntentD1Plan(plan, maps());
        expect(plan.arms).toEqual(D1_ARMS);
        expect(plan.countries).toEqual(["Americans", "Africans"]);
        expect(plan.cases).toHaveLength(200);
        expect(plan.cases.map(row => row.caseIndex)).toEqual(Array.from({ length: 200 }, (_, i) => i));
        expect(plan.cases.map(row => row.requestedEngineSeed))
            .toEqual(Array.from({ length: 200 }, (_, i) => 3350110000 + i));
        expect(plan.canaries.map(row => [row.mapId, row.opponent, row.requestedEngineSeed]))
            .toEqual([["hfo-le", "pinned_supalosa", 3350111000], ["peak", "pinned_supalosa", 3350111001],
                ["tour-of-egypt", "pinned_supalosa", 3350111002], ["hfo-le", "ra2web_advanced", 3350111003]]);
        expect(plan.smoke.requestedEngineSeed).toBe(3350111100);
        expect(plan.smoke.caseIndex).toBe(204);
        expect(plan.counts).toEqual({ zeroUpdateDefinitions: 205, competitiveBlocks: 200,
            competitiveEpisodes: 600, canaryConfigurations: 4, canaryEpisodes: 24, smokeEpisodes: 3,
            advancingEpisodes: 627, strata: 25, topologies: 5, countryDirectionClusters: 4,
            supalosaCases: 120, advancedCases: 80 });
        expect(new Set([...plan.cases, ...plan.canaries, plan.smoke].map(row => row.requestedEngineSeed)).size).toBe(205);
        expect(plan.canaries.every(row => row.maxUpdates === 3600 && row.country === "Americans" &&
            row.directionOrdinal === 0 && row.candidateSlot === 0)).toBe(true);
        expect(plan.smoke.maxUpdates).toBe(24000);
        expect(plan.cases.every(row => row.maxUpdates === 24000)).toBe(true);
    });
    it("enumerates opponent/map/direction/country/slot in the frozen order", () => {
        const plan = buildUnifiedIntentD1Plan(maps());
        const expected: unknown[] = [];
        for (const opponent of ["pinned_supalosa", "ra2web_advanced"]) {
            for (const mapId of OD1_MAP_IDS) {
                if (opponent === "ra2web_advanced" && !mapId.startsWith("hfo-")) continue;
                for (const direction of [0, 1]) for (const country of D1_COUNTRIES) for (const slot of [0, 1]) {
                    expected.push([opponent, mapId, direction, country, slot]);
                }
            }
        }
        expect(plan.cases.map(row => [row.opponent, row.mapId, row.directionOrdinal, row.country, row.candidateSlot]))
            .toEqual(expected);
        expect(plan.cases.every(row => plan.countries[row.countryOrdinal] === row.country)).toBe(true);
    });
    it("retains every stratum, reciprocal first-two starts and both slots without overstating topology count", () => {
        const plan = buildUnifiedIntentD1Plan(maps());
        expect(new Set(plan.cases.map(row => row.stratumId)).size).toBe(25);
        expect(new Set(plan.cases.map(row => row.topologyId)).size).toBe(5);
        for (const stratum of new Set(plan.cases.map(row => row.stratumId))) {
            const rows = plan.cases.filter(row => row.stratumId === stratum);
            expect(rows).toHaveLength(8);
            expect(new Set(rows.map(row => [row.country, row.directionOrdinal, row.candidateSlot].join("/"))).size).toBe(8);
            expect(rows.every(row => row.candidateStartOrdinal + row.opponentStartOrdinal === 1)).toBe(true);
            expect(rows.every(row => [row.candidateStart, row.opponentStart].sort().join("|") === "1,2|3,4")).toBe(true);
        }
        const advanced = plan.cases.filter(row => row.opponent === "ra2web_advanced");
        expect(advanced).toHaveLength(80);
        expect(new Set(advanced.map(row => row.topologyId))).toEqual(new Set(["hfo"]));
        expect(new Set(advanced.map(row => row.country + "/" + row.directionOrdinal)).size).toBe(4);
    });
    it.each(["seed", "start", "countryOrdinal", "country", "arm", "ceiling", "count", "extra", "maps"])(
        "rejects a %s mutation even with otherwise correct counts", change => {
            const plan = structuredClone(buildUnifiedIntentD1Plan(maps())) as any;
            if (change === "seed") plan.cases[0].requestedEngineSeed++;
            if (change === "start") plan.cases[0].candidateStart = "5,6";
            if (change === "countryOrdinal") plan.cases[2].countryOrdinal = 5;
            if (change === "country") plan.cases[2].country = "Russians";
            if (change === "arm") plan.arms.reverse();
            if (change === "ceiling") plan.arms[2].commandCeiling = 115;
            if (change === "count") plan.counts.advancingEpisodes++;
            if (change === "extra") plan.cases[0].score = 1;
            if (change === "maps") plan.maps[0].sha256 = "f".repeat(64);
            expect(() => validateUnifiedIntentD1Plan(plan, maps())).toThrow(/reconstruction/);
        });
});
