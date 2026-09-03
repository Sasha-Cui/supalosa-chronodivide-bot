import {test}from"node:test";import assert from"node:assert/strict";
import {buildConfirmationPlan,confirmationAssignment,analyzeConfirmation}from"./multimap-confirmation-v1.mjs";
const rows=()=>Array.from({length:144},(_,i)=>({countryOrdinal:Math.floor(i/16),candidateStart:String(Math.floor(i/8)%2),
    candidateSlot:i%2,winner:"candidate",updates:1000,endpointStatus:"candidate_win"}));
test("strict confirmation succeeds only under every gate",()=>{
    const a=analyzeConfirmation(rows());assert.equal(a.positive,true);assert.equal(a.dominanceCriteriaMet,true);assert.equal(a.clustered.oneSided95Lower,1);
    const failed=rows().map((r,i)=>({...r,winner:i<8?"opponent":"candidate"}));
    const b=analyzeConfirmation(failed);assert.equal(b.positive,false);assert.equal(b.gates.countryStartAllNoninferior,false);
    assert.throws(()=>analyzeConfirmation(rows().slice(1)));
});
test("one tied cell permits the 17-of-18 rule, but not dominance",()=>{
    const r=rows().map((r,i)=>({...r,winner:i<4?"opponent":"candidate"}));
    const a=analyzeConfirmation(r);assert.equal(a.positive,true);assert.equal(a.positiveCells,17);assert.equal(a.dominanceCriteriaMet,false);
});
test("only eligible maps and disjoint immutable confirmation indices are mapped",()=>{
    const maps=["hfo-lvl","hfo-rvr"].map((id,i)=>({mapIndex:i+6,mapId:id,mapSha256:"a".repeat(64),startCount:2,
        screenIndices:Array.from({length:36},(_,j)=>j),confirmationIndices:Array.from({length:144},(_,j)=>j+36)}));
    const plan=buildConfirmationPlan({complete:true,technicalIntegrityPassed:true,eligibleMapIds:["hfo-lvl","hfo-rvr"],
        maps:maps.map(m=>({map:{id:m.mapId},eligible:true}))},{maps});
    const all=Array.from({length:288},(_,i)=>confirmationAssignment(plan,i));
    assert.equal(new Set(all.map(x=>x.mapIndex+":"+x.mapCaseIndex)).size,288);
    assert.equal(all[0].mapIndex,6);assert.equal(all[287].mapIndex,7);
    assert.throws(()=>confirmationAssignment(plan,288));
});
