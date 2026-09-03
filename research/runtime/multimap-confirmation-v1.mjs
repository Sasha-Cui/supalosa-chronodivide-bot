import assert from "node:assert/strict";
import {summarizeScreen} from "./multimap-screen-analysis-v3.mjs";
export const SCREEN_SHA256="8e760c72605cbe6c67fcc088cba5a3e460fecf53f28b4b614158abe050bef341";
export function buildConfirmationPlan(screen,screenPlan){
    assert.equal(screen.complete,true);assert.equal(screen.technicalIntegrityPassed,true);
    const ids=screen.maps.filter(m=>m.eligible).map(m=>m.map.id);
    assert.deepEqual(ids,["hfo-lvl","hfo-rvr"]);
    assert.deepEqual(screen.eligibleMapIds,ids);
    const maps=screenPlan.maps.filter(m=>ids.includes(m.mapId)).map(m=>{
        assert.equal(m.confirmationIndices.length,144);
        assert.equal(m.startCount,2);
        assert.ok(m.confirmationIndices.every(i=>!m.screenIndices.includes(i)));
        return {mapIndex:m.mapIndex,mapId:m.mapId,mapSha256:m.mapSha256,startCount:m.startCount,caseIndices:m.confirmationIndices};
    });
    assert.equal(maps.length,2);
    return {screenSha256:SCREEN_SHA256,method:"unchanged-deployed-policy-confirmation-v1",taskCount:288,maps};
}
export function confirmationAssignment(plan,index){
    assert.ok(Number.isInteger(index)&&index>=0&&index<288);
    let rest=index;
    for(const map of plan.maps){if(rest<map.caseIndices.length)return {taskIndex:index,mapIndex:map.mapIndex,mapCaseIndex:map.caseIndices[rest]};rest-=map.caseIndices.length;}
    throw Error("Unreachable confirmation assignment");
}
export function analyzeConfirmation(rows,startCount=2){
    assert.equal(startCount,2);assert.equal(rows.length,144);
    const summary=summarizeScreen(rows);
    const by=key=>Object.fromEntries([...new Set(rows.map(key))].sort().map(k=>[k,summarizeScreen(rows.filter(r=>key(r)===k))]));
    const strata={faction:by(r=>r.countryOrdinal<5?"Allied":"Soviet"),slot:by(r=>String(r.candidateSlot)),
        start:by(r=>r.candidateStart),country:by(r=>String(r.countryOrdinal)),
        countryStart:by(r=>r.countryOrdinal+":"+r.candidateStart)};
    assert.equal(Object.keys(strata.faction).length,2);assert.equal(Object.keys(strata.slot).length,2);
    assert.equal(Object.keys(strata.start).length,2);assert.equal(Object.keys(strata.country).length,9);
    assert.equal(Object.keys(strata.countryStart).length,18);
    assert.ok(Object.values(strata.countryStart).every(s=>s.games===8));
    const cells=Object.values(strata.countryStart),rates=cells.map(s=>s.winRate),mean=rates.reduce((s,v)=>s+v,0)/18,
        sd=Math.sqrt(rates.reduce((s,v)=>s+(v-mean)**2,0)/17),lower=mean-1.73961*sd/Math.sqrt(18),
        positiveCells=cells.filter(s=>s.wins>s.losses).length,noninferiorCells=cells.filter(s=>s.wins>=s.losses).length;
    const clustered={clusterCount:18,degreesOfFreedom:17,meanWinRate:mean,sampleStandardDeviation:sd,tCritical:1.73961,oneSided95Lower:lower};
    const gates={overallPositive:summary.wins>summary.losses,
        factionsPositive:Object.values(strata.faction).every(s=>s.wins>s.losses),
        slotsPositive:Object.values(strata.slot).every(s=>s.wins>s.losses),
        startsPositive:Object.values(strata.start).every(s=>s.wins>s.losses),
        pooledWilsonAbove065:summary.oneSided95WilsonWinLower>0.65,
        clusteredLowerAbove060:lower>0.60,countryStartPositiveAtLeast17:positiveCells>=17,
        countryStartAllNoninferior:noninferiorCells===18,pairedAdaptationGateApplicable:false};
    const positive=Object.entries(gates).filter(([k])=>k!=="pairedAdaptationGateApplicable").every(([,v])=>v===true);
    const aspirational={pointWinRateAtLeast080:summary.winRate>=0.80,pooledLowerAbove075:summary.oneSided95WilsonWinLower>0.75,
        everyCountryStartPositive:positiveCells===18};
    return {summary,strata,clustered,positiveCells,noninferiorCells,gates,positive,aspirational,
        dominanceCriteriaMet:positive&&Object.values(aspirational).every(Boolean)};
}
