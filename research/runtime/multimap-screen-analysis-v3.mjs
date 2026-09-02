import assert from "node:assert/strict";
export function summarizeScreen(rows){
    assert.ok(rows.length>0);
    for(const row of rows)assert.ok(["candidate","opponent","draw"].includes(row.winner));
    const wins=rows.filter(r=>r.winner==="candidate").length,losses=rows.filter(r=>r.winner==="opponent").length,
        draws=rows.length-wins-losses,n=rows.length,p=wins/n,z=1.644853626951,
        lower=(p+z*z/(2*n)-z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n)))/(1+z*z/n),
        times=rows.filter(r=>r.winner==="candidate").map(r=>r.updates).sort((a,b)=>a-b),mid=Math.floor(times.length/2);
    return {games:n,wins,draws,losses,winRate:p,scoreRate:(wins+0.5*draws)/n,
        oneSided95WilsonWinLower:Math.max(0,lower),
        medianLiteralWinUpdates:times.length?(times.length%2?times[mid]:(times[mid-1]+times[mid])/2):null,
        tickCapCount:rows.filter(r=>r.endpointStatus==="tick_cap_draw").length};
}
export function analyzeMapScreen(rows,startCount){
    const summary=summarizeScreen(rows);
    assert.equal(rows.length,18*startCount);
    const by=(key)=>Object.fromEntries([...new Set(rows.map(key))].sort().map(k=>[k,summarizeScreen(rows.filter(r=>key(r)===k))]));
    const strata={faction:by(r=>r.countryOrdinal<5?"Allied":"Soviet"),slot:by(r=>String(r.candidateSlot)),
        start:by(r=>r.candidateStart),country:by(r=>String(r.countryOrdinal))};
    assert.equal(Object.keys(strata.faction).length,2);assert.equal(Object.keys(strata.slot).length,2);
    assert.equal(Object.keys(strata.start).length,startCount);assert.equal(Object.keys(strata.country).length,9);
    const gates={overallPositive:summary.wins>summary.losses,
        factionsPositive:Object.values(strata.faction).every(s=>s.wins>s.losses),
        slotsPositive:Object.values(strata.slot).every(s=>s.wins>s.losses),
        startsNoninferior:Object.values(strata.start).every(s=>s.wins>=s.losses),
        noninferiorCountries:Object.values(strata.country).filter(s=>s.wins>=s.losses).length,
        pairedDeployedControlGateApplicable:false};
    return {summary,strata,gates,eligible:gates.overallPositive&&gates.factionsPositive&&gates.slotsPositive&&
        gates.startsNoninferior&&gates.noninferiorCountries>=8};
}
