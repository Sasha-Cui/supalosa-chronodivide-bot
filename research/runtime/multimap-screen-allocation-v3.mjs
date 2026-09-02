import assert from "node:assert/strict";

export const CENSUS_SHA256="5715eef27a8dc0b4b24f3ea2909c83ef2d15c3ea546a7c16b9b3a61b1583d1c5";
export const PERMUTATIONS={
    6:[[1,3,5,0,2,4],[3,0,4,1,5,2],[2,0,1,4,5,3],[3,5,4,2,1,0],[4,2,0,5,3,1],
       [5,4,3,1,0,2],[4,5,3,2,0,1],[2,4,1,5,3,0],[5,2,0,4,1,3]],
    8:[[1,0,5,7,6,2,4,3],[1,0,6,5,7,2,4,3],[2,3,0,1,7,6,5,4],[2,4,0,7,5,1,3,6],
       [3,6,1,4,2,7,5,0],[4,2,7,5,0,3,1,6],[5,7,3,6,1,4,0,2],[6,5,4,2,3,0,7,1],[7,4,3,0,1,6,2,5]]
};
const count=(rows,key)=>{const result={};for(const row of rows){const k=key(row);result[k]=(result[k]??0)+1;}return result;};
export function buildScreenAllocation(census){
    assert.equal(census.complete,true);assert.equal(census.outcomeFree,true);assert.equal(census.maps.length,13);
    const maps=census.maps.map((entry,mapIndex)=>{
        const n=entry.map.startCount,rows=entry.cases,changed=!!PERMUTATIONS[n];
        assert.equal(rows.length,9*2*n*(n-1)*(n===2?5:1));
        const selected=rows.filter(row=>changed?
            row.opponentStartOrdinal===PERMUTATIONS[n][row.countryOrdinal][row.candidateStartOrdinal]&&row.repeatIndex===0:
            row.stage1Screen);
        const old=rows.filter(row=>row.stage1Screen).map(row=>row.mapCaseIndex);
        const chosen=selected.map(row=>row.mapCaseIndex),set=new Set(chosen),oldSet=new Set(old);
        assert.equal(chosen.length,18*n);assert.equal(set.size,chosen.length);
        const confirmation=rows.filter(row=>!set.has(row.mapCaseIndex)).map(row=>row.mapCaseIndex);
        const byCountryStartSlot=count(selected,r=>[r.countryOrdinal,r.candidateStartOrdinal,r.candidateSlot].join(":"));
        assert.equal(Object.keys(byCountryStartSlot).length,18*n);
        assert.ok(Object.values(byCountryStartSlot).every(v=>v===1));
        const byCountryOpponentSlot=count(selected,r=>[r.countryOrdinal,r.opponentStartOrdinal,r.candidateSlot].join(":"));
        assert.equal(Object.keys(byCountryOpponentSlot).length,18*n);
        assert.ok(Object.values(byCountryOpponentSlot).every(v=>v===1));
        for(let c=0;c<9;c++)for(let a=0;a<n;a++){
            const pair=selected.filter(r=>r.countryOrdinal===c&&r.candidateStartOrdinal===a);
            assert.equal(pair.length,2);assert.deepEqual(pair.map(r=>r.candidateSlot).sort(),[0,1]);
            assert.equal(pair[0].opponentStartOrdinal,pair[1].opponentStartOrdinal);
        }
        const offset=r=>(r.opponentStartOrdinal-r.candidateStartOrdinal+n)%n;
        const offsets=count(selected,r=>String(offset(r)));
        assert.equal(Object.keys(offsets).length,n-1);
        assert.ok(Math.max(...Object.values(offsets))-Math.min(...Object.values(offsets))<=2);
        for(let a=0;a<n;a++){
            const local=count(selected.filter(r=>r.candidateStartOrdinal===a&&r.candidateSlot===0),r=>String(offset(r)));
            assert.equal(Object.keys(local).length,n-1);
            assert.ok(Object.values(local).every(v=>v>=Math.floor(9/(n-1))&&v<=Math.ceil(9/(n-1))));
        }
        const byFactionOffset={Allied:count(selected.filter(r=>r.countryOrdinal<5),r=>String(offset(r))),
            Soviet:count(selected.filter(r=>r.countryOrdinal>=5),r=>String(offset(r)))};
        if(changed){
            const expected=n===6?[22,22,20,22,22]:[22,20,20,20,20,20,22];
            assert.deepEqual(Array.from({length:n-1},(_,i)=>offsets[String(i+1)]),expected);
            for(const side of Object.values(byFactionOffset))
                assert.ok(Math.max(...Object.values(side))-Math.min(...Object.values(side))<=2);
        }else assert.deepEqual(chosen,old);
        assert.equal(confirmation.length+chosen.length,rows.length);
        return {mapIndex,mapId:entry.map.id,mapSha256:entry.map.sha256,startCount:n,screenIndices:chosen,
            confirmationIndices:confirmation,originalScreenIndices:old,addedIndices:chosen.filter(x=>!oldSet.has(x)),
            removedIndices:old.filter(x=>!set.has(x)),byCountryStartSlot,byCountryOpponentSlot,
            byCyclicOffset:offsets,byFactionOffset,uniformCyclicOffsets:new Set(Object.values(offsets)).size===1,
            closestFeasibleSlotPairedBalance:true};
    });
    const screenCount=maps.reduce((s,m)=>s+m.screenIndices.length,0),
        confirmationCount=maps.reduce((s,m)=>s+m.confirmationIndices.length,0);
    assert.equal(screenCount,900);assert.equal(confirmationCount,3168);
    return {method:"explicit-amendment-3-closest-feasible-slot-paired",censusSha256:CENSUS_SHA256,
        unitGameWeights:true,screenCount,confirmationCount,maps};
}
export function screenAssignment(plan,index){
    assert.ok(Number.isInteger(index)&&index>=0&&index<900);
    let remainder=index;
    for(const map of plan.maps){
        if(remainder<map.screenIndices.length)return {taskIndex:index,mapIndex:map.mapIndex,mapCaseIndex:map.screenIndices[remainder]};
        remainder-=map.screenIndices.length;
    }
    throw Error("Unreachable allocation index");
}
