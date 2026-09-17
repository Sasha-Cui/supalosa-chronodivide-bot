import { describe, expect, it } from "vitest";
import { buildUnifiedIntentV2OD1Plan, validateUnifiedIntentV2OD1Plan, OD1_MAP_IDS,
    OD1_ARMS } from "../training/unifiedIntentV2OD1Plan.js";
import { UnifiedIntentGate3Map } from "../training/unifiedIntentGate3Plan.js";
const maps = (): UnifiedIntentGate3Map[] => OD1_MAP_IDS.map((id, index) => ({
    id, label: id, fileName: id + ".map", absolutePath: "/maps/" + id + ".map",
    sha256: index.toString(16).padStart(64, "0"), starts: ["1,2", "3,4", "5,6"],
    advancedEligible: id.startsWith("hfo-"),
}));
describe("V2 OD1 frozen paired population", () => {
    it("reconstructs all 905 identities with exact arm order and launch counts", () => {
        const plan = buildUnifiedIntentV2OD1Plan(maps());
        validateUnifiedIntentV2OD1Plan(plan, maps());
        expect(plan.counts.advancingEpisodes).toBe(1818);
        expect(plan.arms).toEqual(OD1_ARMS);
        expect(plan.cases).toHaveLength(900);
        expect(plan.cases[0].requestedEngineSeed).toBe(3350106000);
        expect(plan.cases[899].requestedEngineSeed).toBe(3350106899);
        const all = [...plan.cases, ...plan.canaries, plan.smoke];
        expect(new Set(all.map((value) => value.requestedEngineSeed)).size).toBe(905);
        expect(plan.canaries.map((value) => [value.mapId, value.opponent, value.requestedEngineSeed]))
            .toEqual([["hfo-le", "pinned_supalosa", 3350107000], ["peak", "pinned_supalosa", 3350107001],
                ["tour-of-egypt", "pinned_supalosa", 3350107002], ["hfo-le", "ra2web_advanced", 3350107003]]);
        expect(plan.smoke.requestedEngineSeed).toBe(3350107100);
    });
    it("crosses countries, slots and reciprocal first-two starts without calling them independent topologies", () => {
        const plan = buildUnifiedIntentV2OD1Plan(maps());
        expect(new Set(plan.cases.map((value) => value.stratumId)).size).toBe(25);
        expect(new Set(plan.cases.map((value) => value.topologyId)).size).toBe(5);
        expect(new Set(plan.cases.filter((c) => c.opponent === "ra2web_advanced").map((c) => c.topologyId)))
            .toEqual(new Set(["hfo"]));
        for (const stratum of new Set(plan.cases.map((value) => value.stratumId))) {
            const rows = plan.cases.filter((value) => value.stratumId === stratum);
            expect(rows).toHaveLength(36);
            expect(new Set(rows.map((c) => [c.country, c.directionOrdinal, c.candidateSlot].join("|"))).size).toBe(36);
            expect(rows.every((c) => c.candidateStartOrdinal + c.opponentStartOrdinal === 1)).toBe(true);
        }
    });
    it.each(["seed", "start", "arm", "country", "extra", "maps"])("rejects %s mutation even when counts agree", (change) => {
        const plan = structuredClone(buildUnifiedIntentV2OD1Plan(maps())) as any;
        if (change === "seed") plan.cases[0].requestedEngineSeed += 1;
        if (change === "start") plan.cases[0].candidateStart = "5,6";
        if (change === "arm") plan.arms.reverse();
        if (change === "country") plan.cases[0].country = "Iraq";
        if (change === "extra") plan.cases[0].score = 1;
        if (change === "maps") plan.maps[0].sha256 = "b".repeat(64);
        expect(() => validateUnifiedIntentV2OD1Plan(plan, maps())).toThrow(/reconstruction/);
    });
    it("rejects wrong map order, eligibility, and duplicate starts before constructing cases", () => {
        const reversed = maps().reverse();
        expect(() => buildUnifiedIntentV2OD1Plan(reversed)).toThrow(/map order/);
        const wrong = maps(); wrong[0].advancedEligible = false;
        expect(() => buildUnifiedIntentV2OD1Plan(wrong)).toThrow();
        const duplicate = maps(); duplicate[0].starts = ["1,2", "1,2"];
        expect(() => buildUnifiedIntentV2OD1Plan(duplicate)).toThrow();
    });
});
