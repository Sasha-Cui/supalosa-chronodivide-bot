import { describe, expect, it } from "vitest";
import { MULTIMAP_V2_MAPS, buildMultiMapV2ExplicitCases, multiMapV2ExplicitCoverage } from
    "../training/multiMapRobustnessV2ExplicitTechnical.js";

describe("explicit multi-map V2 populations", () => {
    const starts = (n: number) => Array.from({length:n},(_,i)=>String(i)+","+String(i+10));
    it("preserves 4068 full cases and 900 screen memberships with fresh unique seeds", () => {
        const all = MULTIMAP_V2_MAPS.flatMap((map) => buildMultiMapV2ExplicitCases(map,starts(map.startCount)));
        expect(all).toHaveLength(4068);
        expect(all.filter((row)=>row.stage1Screen)).toHaveLength(900);
        expect(new Set(all.map((row)=>row.requestedEngineSeed)).size).toBe(4068);
        expect(all.every((row)=>row.requestedEngineSeed>=3002000000&&row.requestedEngineSeed<3003300000)).toBe(true);
        for(const map of MULTIMAP_V2_MAPS){
            const rows=buildMultiMapV2ExplicitCases(map,starts(map.startCount));
            expect(rows.map((row)=>row.mapCaseIndex)).toEqual(Array.from({length:rows.length},(_,i)=>i));
            expect(multiMapV2ExplicitCoverage(map,rows).completeDirectedPairCoverage).toBe(true);
        }
    });
    it("exposes original six/eight-start offset imbalance without authorizing a screen", () => {
        for(const map of MULTIMAP_V2_MAPS){
            const audit=multiMapV2ExplicitCoverage(map,buildMultiMapV2ExplicitCases(map,starts(map.startCount)));
            expect(audit.screenAuthorized).toBe(false);
            expect(audit.cyclicOffsetCountsUniform).toBe(map.startCount===2||map.startCount===4);
            if(map.startCount===6)expect(audit.byCyclicOffset).toEqual({"1":24,"2":24,"3":24,"4":24,"5":12});
            if(map.startCount===8)expect(audit.byCyclicOffset).toEqual({"1":32,"2":32,"3":16,"4":16,"5":16,"6":16,"7":16});
        }
    });
    it("rejects malformed start metadata and incomplete pair coverage", () => {
        const map=MULTIMAP_V2_MAPS[0];
        expect(()=>buildMultiMapV2ExplicitCases(map,["0,0","1,1"])).toThrow();
        const rows=buildMultiMapV2ExplicitCases(map,starts(map.startCount));
        expect(()=>multiMapV2ExplicitCoverage(map,rows.slice(1))).toThrow();
    });
});
