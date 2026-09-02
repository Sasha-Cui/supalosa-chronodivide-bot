import {test} from "node:test";
import assert from "node:assert/strict";
import {buildScreenAllocation,screenAssignment} from "./multimap-screen-allocation-v3.mjs";
import {analyzeMapScreen,summarizeScreen} from "./multimap-screen-analysis-v3.mjs";

function fixture(){
    return {complete:true,outcomeFree:true,maps:[8,6,4,4,4,2,2,2,2,6,4,2,4].map((n,mapIndex)=>{
        const cases=[];
        for(let c=0;c<9;c++)for(let slot=0;slot<2;slot++)for(let a=0;a<n;a++)for(let b=0;b<n;b++)if(a!==b)
            for(let repeat=0;repeat<(n===2?5:1);repeat++)cases.push({
                mapCaseIndex:cases.length,countryOrdinal:c,candidateSlot:slot,candidateStartOrdinal:a,opponentStartOrdinal:b,
                repeatIndex:repeat,stage1Screen:n===2?repeat===0:b===(a+1+c%(n-1))%n
            });
        return {map:{id:String(mapIndex),startCount:n,sha256:"a".repeat(64)},cases};
    })};
}
test("900/3168 partition and exact prescribed six/eight-start offset quotas",()=>{
    const a=buildScreenAllocation(fixture());
    assert.equal(a.screenCount,900);assert.equal(a.confirmationCount,3168);
    assert.deepEqual(Object.values(a.maps[0].byCyclicOffset),[22,20,20,20,20,20,22]);
    assert.deepEqual(Object.values(a.maps[1].byCyclicOffset),[22,22,20,22,22]);
    for(const map of a.maps){
        assert.equal(new Set([...map.screenIndices,...map.confirmationIndices]).size,
            map.screenIndices.length+map.confirmationIndices.length);
        if(map.startCount===2||map.startCount===4)assert.equal(map.addedIndices.length,0);
        assert.equal(map.addedIndices.length,map.removedIndices.length);
    }
});
test("all 900 task assignments are unique and deterministic",()=>{
    const a=buildScreenAllocation(fixture()),assignments=Array.from({length:900},(_,i)=>screenAssignment(a,i));
    assert.equal(new Set(assignments.map(x=>x.mapIndex+":"+x.mapCaseIndex)).size,900);
    assert.deepEqual(screenAssignment(a,0),assignments[0]);assert.equal(assignments[899].mapIndex,12);
    assert.throws(()=>screenAssignment(a,900));assert.throws(()=>screenAssignment(a,-1));
});
test("input mutation or missing coverage is rejected",()=>{
    const a=fixture();a.maps[0].cases.pop();assert.throws(()=>buildScreenAllocation(a));
});
function outcomes(){
    return Array.from({length:36},(_,i)=>({countryOrdinal:Math.floor(i/4),candidateSlot:i%2,
        candidateStart:String(Math.floor(i/2)%2),winner:"candidate",updates:1000,endpointStatus:"literal_win"}));
}
test("screen gates require literal positive outcomes and all mandatory strata",()=>{
    assert.equal(analyzeMapScreen(outcomes(),2).eligible,true);
    const draws=outcomes().map(x=>({...x,winner:"draw",updates:90000,endpointStatus:"tick_cap_draw"}));
    const d=analyzeMapScreen(draws,2);assert.equal(d.eligible,false);assert.equal(d.summary.tickCapCount,36);
    assert.equal(d.summary.oneSided95WilsonWinLower,0);
    const badStart=outcomes().map(x=>({...x,winner:x.candidateStart==="0"?"opponent":"candidate"}));
    assert.equal(analyzeMapScreen(badStart,2).gates.startsNoninferior,false);
    assert.throws(()=>analyzeMapScreen(outcomes().slice(1),2));
});
test("Wilson lower bound is descriptive and scores keep draws at one half",()=>{
    const s=summarizeScreen([{winner:"candidate",updates:1000},{winner:"draw",updates:90000},{winner:"opponent",updates:1500}]);
    assert.equal(s.scoreRate,0.5);assert.equal(s.wins,1);assert.equal(s.draws,1);assert.equal(s.losses,1);
    assert.ok(s.oneSided95WilsonWinLower>0&&s.oneSided95WilsonWinLower<1/3);
    assert.throws(()=>summarizeScreen([{winner:"technical_failure"}]));
});
