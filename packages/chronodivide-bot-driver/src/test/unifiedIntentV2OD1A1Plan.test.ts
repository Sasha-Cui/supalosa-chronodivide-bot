import { describe, expect, it } from "vitest";
import { buildUnifiedIntentV2OD1Plan as original } from "../training/unifiedIntentV2OD1Plan.js";
import { buildUnifiedIntentV2OD1Plan, validateUnifiedIntentV2OD1Plan,
    OD1_MAP_IDS } from "../training/unifiedIntentV2OD1A1Plan.js";
import { UnifiedIntentGate3Map } from "../training/unifiedIntentGate3Plan.js";
const maps = (): UnifiedIntentGate3Map[] => OD1_MAP_IDS.map((id, i) => ({
    id, label: id, fileName: id + ".map", absolutePath: "/maps/" + id + ".map",
    sha256: i.toString(16).padStart(64, "0"), starts: ["1,2", "3,4"], advancedEligible: id.startsWith("hfo-"),
}));
const all = (p: ReturnType<typeof original>) => [...p.cases, ...p.canaries, p.smoke];
describe("OD1 A1 complete fresh selector population", () => {
    it("uses exactly the prospectively frozen 905 identities", () => {
        const p = buildUnifiedIntentV2OD1Plan(maps());
        expect(p.cases[0].requestedEngineSeed).toBe(3350108000);
        expect(p.cases[899].requestedEngineSeed).toBe(3350108899);
        expect(p.canaries.map((c) => c.requestedEngineSeed)).toEqual([3350109000, 3350109001, 3350109002, 3350109003]);
        expect(p.smoke.requestedEngineSeed).toBe(3350109100);
        expect(new Set([...p.cases, ...p.canaries, p.smoke].map((c) => c.requestedEngineSeed)).size).toBe(905);
        validateUnifiedIntentV2OD1Plan(p, maps());
    });
    it("does not reuse a single abandoned V1 identity", () => {
        const old = new Set(all(original(maps())).map((c) => c.requestedEngineSeed));
        const fresh = buildUnifiedIntentV2OD1Plan(maps());
        expect([...fresh.cases, ...fresh.canaries, fresh.smoke].some((c) => old.has(c.requestedEngineSeed))).toBe(false);
    });
    it("changes only namespace and amendment identity, not arms, cells, or counts", () => {
        const old = original(maps()), fresh = buildUnifiedIntentV2OD1Plan(maps());
        const strip = (cells: any[]) => cells.map(({ requestedEngineSeed: _seed, ...rest }) => rest);
        expect(strip([...fresh.cases, ...fresh.canaries, fresh.smoke])).toEqual(strip(all(old)));
        expect(fresh.arms).toEqual(old.arms);
        expect(fresh.counts).toEqual(old.counts);
        expect(fresh.maps).toEqual(old.maps);
        expect(fresh.countries).toEqual(old.countries);
    });
    it("rejects altered identities and partial populations", () => {
        const p = buildUnifiedIntentV2OD1Plan(maps());
        p.cases[0].requestedEngineSeed = 3350106000;
        expect(() => validateUnifiedIntentV2OD1Plan(p, maps())).toThrow(/reconstruction/);
        const partial = buildUnifiedIntentV2OD1Plan(maps()); partial.cases.pop();
        expect(() => validateUnifiedIntentV2OD1Plan(partial, maps())).toThrow(/reconstruction/);
    });
    it("preserves original V1 reconstruction for audit and leaves map inputs unchanged", () => {
        const m = maps(), before = JSON.stringify(m);
        buildUnifiedIntentV2OD1Plan(m);
        expect(JSON.stringify(m)).toBe(before);
        expect(original(m).cases[0].requestedEngineSeed).toBe(3350106000);
        expect(original(m).smoke.requestedEngineSeed).toBe(3350107100);
    });
});
