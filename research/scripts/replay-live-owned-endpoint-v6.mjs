import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {fileURLToPath,pathToFileURL} from "node:url";
import {hash,decodeRecords,labels} from "../runtime/combatant-owned-ledger-gate-v1.mjs";
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../.."),project=path.dirname(repo);
const root=path.join(project,"research-evidence/live-building-ledger/combatant-owned-gate-v1-callback-a1"),driver=path.join(repo,"packages/chronodivide-bot-driver");
const read=p=>fs.readFileSync(p);
const bytes=read(path.join(root,"finalizer/aggregate.json"));
assert.equal(hash(bytes),"0f8525c2874c8fc99c04ba121687e03c76a1a3a86675b80d95b4af75c79034ba");
const aggregate=JSON.parse(bytes);assert.equal(aggregate.complete,true);assert.equal(aggregate.passed,true);assert.equal(aggregate.cases.length,40);
const legacyFile=path.join(driver,"dist/training/literalBuildingEliminationEndpoint.js"),v6File=path.join(driver,"dist/training/liveOwnedBuildingEliminationEndpointV6.js");
assert.equal(hash(read(legacyFile)),"51abc0ae861322841d03971b26c709cbea5f9a4ceed4b1b827aec205adfda578");
const legacy=await import(pathToFileURL(legacyFile)),v6=await import(pathToFileURL(v6File));
const normal={finished:false,defeated:{candidate:false,baseline:false}};
const asPublic=e=>e.type===3?{type:3,target:e.target,attackerInfo:e.attackerPlayerName===null?undefined:{
 playerName:e.attackerPlayerName,objId:e.attackerObjectId??undefined,weaponName:e.weaponName??undefined}}:
 e.type===0?{type:0,target:e.target,prevOwnerName:e.previousOwnerName,newOwnerName:e.newOwnerName}:{type:2,target:e.target};
let steps=0,physicalCases=0;const rows=[];
for(const c of aggregate.cases){
 const dir=path.join(root,"cells/task-"+String(c.task.taskIndex).padStart(3,"0"));
 assert.deepEqual(JSON.parse(read(path.join(dir,"case.json"))),c);
 const records=decodeRecords(read(path.join(dir,c.stream.file)),c.stream);
 let state=records[0].state,tick=0,established={candidate:false,baseline:false},physical=false;
 const mock={
  getVisibleUnits:(owner,relation,predicate)=>{
   assert.equal(relation,"self");
   return state.live.filter(r=>r.owner===owner&&predicate({type:2,name:r.rulesName})).map(r=>r.id);
  },
  getUnitData:id=>{
   const r=state.legacy.find(r=>r.id===id)??state.live.find(r=>r.id===id);
   return r?{id:r.id,owner:r.owner,hitPoints:r.hitPoints,rules:{type:2,name:r.rulesName},tile:{rx:r.x,ry:r.y}}:undefined;
  },
  getCurrentTick:()=>tick,
 };
 const counter=new v6.LiveOwnedBuildingEliminationAdjudicator(labels(c.task));
 for(const frame of records.filter(r=>r.kind==="update")){
  state=frame.pre;tick=frame.gameTickBefore;counter.beginUpdate(mock);
  for(const e of frame.events){counter.observe(asPublic(e));counter.observe(asPublic(e));}
  state=frame.post;tick=frame.gameTickAfter;
  const actual=counter.completeUpdate(mock,normal),expected=legacy.evaluateLiteralBuildingUpdate({
   tick,combatants:labels(c.task),pre:frame.pre.live,post:frame.post.live,events:frame.events,establishedBeforeUpdate:established});
  assert.deepEqual(actual.evaluation,expected);established=expected.establishedAfterUpdate;
  if(actual.terminal){assert.equal(actual.terminal.endpointVersion,6);assert.equal(actual.terminal.endpointSha256,v6.LIVE_OWNED_ENDPOINT_SHA256);
   assert.ok(actual.evaluation.candidatePhysicalWin||actual.evaluation.baselinePhysicalWin||actual.evaluation.status==="simultaneous_draw");physical=true;}
  assert.equal(actual.technicalFailure,null);steps++;
 }
 assert.equal(physical,c.task.scenario.startsWith("physical_"));if(physical)physicalCases++;
 rows.push({taskIndex:c.task.taskIndex,scenario:c.task.scenario,orientation:c.task.orientation,attackerLabelIndex:c.task.attackerLabelIndex,
  repeat:c.task.repeat,steps:records.filter(r=>r.kind==="update").length,allEvaluationsMatch:true,physicalDetected:physical,sourceStreamSha256:c.stream.plainSha256});
}
assert.equal(physicalCases,16);
const out=path.join(repo,"research/results/2026-09-03-v6-interface-replay");fs.mkdirSync(out,{recursive:true});
const keys=Object.keys(rows[0]),q=v=>'"'+String(v).replaceAll('"','""')+'"';
const csv=[keys,...rows.map(r=>keys.map(k=>r[k]))].map(r=>r.map(q).join(",")).join("\n")+"\n";
fs.writeFileSync(path.join(out,"cases.csv"),csv);
const validation={complete:true,passed:true,gameInstancesCreated:0,sourceAggregateSha256:hash(bytes),
 v6Version:v6.LIVE_OWNED_ENDPOINT_VERSION,v6SpecSha256:v6.LIVE_OWNED_ENDPOINT_SHA256,
 v6SourceSha256:hash(read(path.join(driver,"src/training/liveOwnedBuildingEliminationEndpointV6.ts"))),v6CompiledSha256:hash(read(v6File)),
 legacyCompiledSha256:hash(read(legacyFile)),replayerSha256:hash(read(fileURLToPath(import.meta.url))),
 cases:40,stepsReplayed:steps,allPerUpdateEvaluationsMatch:true,duplicatePublicEventsDeduplicated:true,
 physicalCasesDetected:16,negativeControlsWithoutPhysicalCredit:24,csvSha256:hash(csv),
 nativeCompletionLimitation:"The retained technical streams omit native defeated-side flags. Replay supplies a nonterminal engine state and checks physical decisions only; native completion/cap behavior is covered by separate synthetic truth-table tests, not inferred from these streams.",
 deploymentState:"Separate v6 module only; no existing competitive runner was switched and no historical result was rescored."};
fs.writeFileSync(path.join(out,"validation.json"),JSON.stringify(validation,null,2)+"\n");
console.log(JSON.stringify(validation));
