import test from "node:test";
import assert from "node:assert/strict";
import {buildPlan,validatePlan,parseStarts,BASES,COUNTRIES,ARMS} from "../runtime/fresh-dual-endpoint-plan-v1.mjs";
import {loadPlanInputs} from "../runtime/fresh-dual-inputs-v1.mjs";
const loaded=loadPlanInputs(),plan=loaded.plan;
test("exact 2160-case, 2700-game and 1084-seed frozen population",()=>{
 assert.equal(validatePlan(plan),true);assert.equal(plan.cases.length,2160);assert.equal(plan.games.length,2700);
 assert.equal(plan.uniqueSeeds.length,1084);assert.equal(plan.blocks.length,16);assert.equal(plan.maps.length,15);
 assert.equal(plan.uniqueSeeds[0],BASES.central);assert.equal(plan.uniqueSeeds.at(-1),BASES.canary+3);
});
test("paired slots and arm groups share a seed without cross-pair reuse",()=>{
 for(const c of plan.cases){
  const pair=plan.cases.filter(x=>x.pairId===c.pairId);assert.equal(pair.length,2);assert.equal(pair[0].requestedEngineSeed,pair[1].requestedEngineSeed);
  assert.deepEqual(plan.games.filter(g=>g.caseIndex===c.caseIndex).map(g=>g.candidateArm),ARMS[c.cohort]);
 }
});
test("all countries and historical opposite starts are retained",()=>{
 for(const cohort of ["central","peak","advanced"]){
  const cases=plan.cases.filter(c=>c.cohort===cohort);assert.equal(new Set(cases.map(c=>c.country)).size,COUNTRIES.length);
  for(const c of cases){assert.notEqual(c.candidateStart,c.opponentStart);assert.ok([0,1].includes(c.candidateSlot));}
 }
});
test("transfer assignments use amendment-3 metadata and ignore old screen flags/seeds",()=>{
 const census=structuredClone(loaded.census);
 for(const m of census.maps)for(const c of m.cases){c.stage1Screen=!c.stage1Screen;c.requestedEngineSeed=42;}
 assert.deepEqual(buildPlan(census,loaded.allocation,plan.maps[0].starts,plan.maps[1].starts),plan);
 const bad=structuredClone(loaded.allocation);bad.plan.maps[0].screenIndices[1]=bad.plan.maps[0].screenIndices[0];
 assert.throws(()=>buildPlan(loaded.census,bad,plan.maps[0].starts,plan.maps[1].starts));
});
test("tampered seeds, country strata, case identities and canaries fail closed",()=>{
 for(const mutate of [
  p=>{p.cases[0].requestedEngineSeed++;},p=>{p.cases[0].countryOrdinal=1;p.cases[0].country=COUNTRIES[1];},
  p=>{p.cases[0].caseId="old-case";},p=>{p.canaries[0].candidateArm="strategy_both";},
  p=>{p.games[0].candidateArm="supalosa_reference";},p=>{p.blocks[0].caseIndices.pop();},
 ]){const p=structuredClone(plan);mutate(p);assert.throws(()=>validatePlan(p));}
});
test("map parsing preserves actual waypoint ordinals and rejects missing/duplicate starts",()=>{
 assert.deepEqual(parseStarts(Buffer.from("[Waypoints]\n1=39062\n0=63037\n98=123\n"),2),["37,63","62,39"]);
 assert.throws(()=>parseStarts(Buffer.from("[Waypoints]\n0=63037\n"),2));
 assert.throws(()=>parseStarts(Buffer.from("[Waypoints]\n0=63037\n1=63037\n"),2));
});
