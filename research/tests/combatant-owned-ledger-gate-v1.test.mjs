import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {fileURLToPath,pathToFileURL} from "node:url";
import {ROOT_RELATIVE,ACTORS,NEUTRAL,ORDER,TYPE,tasks,SMOKE_INDICES,fixtureMap,validateInitialUnits,planActions,dispatchAction,normalizeAction,readiness,encodeRecords,decodeRecords,analyzeRecords,rejectCompetitiveKeys} from "../runtime/combatant-owned-ledger-gate-v1.mjs";
const legacy=await import(new URL("../../packages/chronodivide-bot-driver/dist/training/literalBuildingEliminationEndpoint.js",import.meta.url));
const evaluate=legacy.evaluateLiteralBuildingUpdate;
const unit=(id,rule,type)=>({id,rule,type,hp:100,rx:37,ry:63});
const initialUnits={attacker:[unit(1,"AMCV",7),unit(5,"MTNK",7),unit(6,"ENGINEER",3),unit(7,"E1",3)],owner:[unit(2,"SMCV",7),unit(3,"SENGINEER",3),unit(4,"SENGINEER",3)]};
const row=(id,owner,rule,hp=100)=>({id,owner,rulesName:rule,hitPoints:hp,x:50,y:50});
const basic=(owner=NEUTRAL,hp=100)=>({id:10,owner,hp,rx:50,ry:50,inWorld:true});
function synthetic(task){
 let state={legacy:[],live:[],target:basic()},once=false;const eventsBefore=[],records=[{kind:"initial",schemaVersion:1,update:0,gameTick:0,actors:ACTORS,targetId:10,seed:task.seed,scenario:task.scenario,initialUnits,targetRules:{capturable:true,returnable:false,leaveRubble:task.rubble},state,observation:{update:0}}];
 for(let tick=0;tick<=1800;tick++){
  if(tick===1800)records.push({kind:"readiness",update:1800,gameTick:1800,state,checks:readiness(state,eventsBefore,10),observation:{update:1800}});
  const own={attacker:tick===0?initialUnits.attacker:[unit(9,"GACNST",2),...initialUnits.attacker.slice(1)],owner:tick<201?initialUnits.owner:[initialUnits.owner[0],initialUnits.owner[2]]};
  const views=(task.orientation===0?["attacker","owner"]:["owner","attacker"]).map(role=>({role,tick,own:own[role],target:state.target,visible:tick>=120}));
  const actions=[];
  for(const v of views)for(const r of planActions(v,task.scenario,once)){actions.push({role:v.role,tick,...r});if(["sell","quit"].includes(r.kind))once=true;}
  let post=state,events=[];
  if(tick===0){post={...state,legacy:[row(9,ACTORS.attacker,"GACNST")],live:[row(9,ACTORS.attacker,"GACNST")]};}
  if(tick===200){
   post={legacy:[row(9,ACTORS.attacker,"GACNST"),row(10,ACTORS.owner,"GAPOWR")],live:[row(9,ACTORS.attacker,"GACNST"),row(10,ACTORS.owner,"GAPOWR")],target:basic(ACTORS.owner)};
   events=[{type:0,target:10,previousOwnerName:NEUTRAL,newOwnerName:ACTORS.owner},{type:2,target:3}];
  }
  if(tick===1800){
   const remaining=[row(9,ACTORS.attacker,"GACNST")];
   if(task.scenario==="capture"){
    events=[{type:0,target:10,previousOwnerName:ACTORS.owner,newOwnerName:ACTORS.attacker},{type:2,target:6}];
    post={legacy:[...remaining,row(10,ACTORS.attacker,"GAPOWR")],live:[...remaining,row(10,ACTORS.attacker,"GAPOWR")],target:basic(ACTORS.attacker)};
   }else{
    events=task.scenario==="sale"?[{type:2,target:10}]:[{type:3,target:10,attackerPlayerName:task.scenario==="cleanup"?null:ACTORS.attacker,attackerObjectId:null,weaponName:null},{type:2,target:10}];
    const retained=task.rubble&&task.scenario!=="sale";
    post={legacy:retained?[...remaining,row(10,ACTORS.owner,"GAPOWR",0)]:remaining,live:remaining,target:retained?basic(ACTORS.owner,0):null};
   }
  }
  const f={kind:"update",update:tick+1,gameTickBefore:tick,gameTickAfter:tick+1,pre:state,post,views,actions,events,gameFinishedAfter:tick===1800&&task.scenario==="cleanup"};
  if([120,300,600,1200,1799,1801].includes(f.update))f.observation={update:f.update};
  records.push(f);if(tick<1800)eventsBefore.push(...events);state=post;
 }
 records.push({kind:"stop",update:1801,reason:"target_transition",gameFinished:task.scenario==="cleanup"});return records;
}
test("exact frozen task matrix and smoke population",()=>{
 assert.equal(tasks.length,40);assert.equal(new Set(tasks.map(t=>t.taskIndex)).size,40);assert.deepEqual(SMOKE_INDICES,[0,8,16,24,32]);
 for(const t of tasks){assert.equal(t.taskIndex,t.scenarioIndex*8+t.orientation*4+t.attackerLabelIndex*2+t.repeat);assert.equal(t.seed,3100500000+t.scenarioIndex*100+t.orientation);}
 for(let i=0;i<40;i+=4)assert.equal(new Set(tasks.slice(i,i+4).map(t=>t.seed)).size,1);
});
test("fixture preserves geometry and native country restrictions",()=>{
 const t="[Basic]\nName=No name\n[Map]\nSize=0,0,50,50\n";
 for(const rubble of [true,false]){
  const map=fixtureMap(t,rubble);assert.ok(map.includes("Size=0,0,50,50"));assert.ok(map.includes("LeaveRubble="+(rubble?"yes":"no")));
  assert.ok(map.includes("[ENGINEER]\nAllowedToStartInMultiplayer=yes"));assert.ok(map.includes("[SENGINEER]\nAllowedToStartInMultiplayer=yes"));
  assert.ok(!map.includes("ForbiddenHouses")&&!map.includes("Returnable="));assert.equal(map.split("0=Neutral,GAPOWR").length,2);
 }
 assert.throws(()=>fixtureMap(t+"[GAPOWR]",true));
});
test("country-specific initial types fail closed",()=>{
 assert.equal(validateInitialUnits(initialUnits),true);
 const bad=structuredClone(initialUnits);bad.owner.push(unit(8,"HTNK",7));assert.throws(()=>validateInitialUnits(bad));
 const bad2=structuredClone(initialUnits);bad2.owner[1].rule="ENGINEER";assert.throws(()=>validateInitialUnits(bad2));
});
test("owner scouts then captures, holds units, and performs one declared control",()=>{
 const v={role:"owner",tick:120,own:initialUnits.owner,target:basic(),visible:false};
 assert.deepEqual(planActions(v,"capture"),[{kind:"order",ids:[3],type:ORDER.Move,rx:50,ry:50}]);
 assert.deepEqual(planActions({...v,visible:true},"capture"),[{kind:"order",ids:[3],type:ORDER.Capture,targetId:10}]);
 const own={...v,tick:1800,target:basic(ACTORS.owner)};
 assert.equal(planActions(own,"cleanup").filter(a=>a.kind==="quit").length,1);
 assert.equal(planActions(own,"cleanup",true).filter(a=>a.kind==="quit").length,0);
 assert.equal(planActions(own,"sale").filter(a=>a.kind==="sell").length,1);
});
test("attacker waits, deploys without target, and separates engineer from armed actions",()=>{
 const v={role:"attacker",tick:0,own:initialUnits.attacker,target:basic(ACTORS.owner),visible:true};
 assert.deepEqual(planActions(v,"physical_rubble"),[{kind:"order",ids:[1],type:10}]);
 assert.deepEqual(planActions({...v,tick:300},"physical_rubble"),[]);
 assert.deepEqual(planActions({...v,tick:1800},"physical_rubble"),[{kind:"order",ids:[5,7],type:3,targetId:10}]);
 assert.deepEqual(planActions({...v,tick:1800},"capture"),[{kind:"order",ids:[6],type:7,targetId:10}]);
 assert.equal(planActions({...v,tick:1800,visible:false},"capture")[0].type,ORDER.Move);
});
test("actual action overloads normalize back to the frozen request",()=>{
 const requests=[{kind:"order",ids:[1],type:10},{kind:"order",ids:[1],type:0,rx:50,ry:50},{kind:"order",ids:[1],type:7,targetId:10},{kind:"sell",targetId:10},{kind:"quit"}];
 for(const r of requests){const api=Object.fromEntries(["orderUnits","sellObject","quitGame"].map(method=>[method,(...args)=>assert.deepEqual(normalizeAction(method,args),r)]));dispatchAction(api,r);}
 assert.throws(()=>normalizeAction("toggleRepairWrench",[10]));
});
test("complete synthetic streams replay all scenarios with symmetric evaluator labels",()=>{
 for(const task of tasks){const r=analyzeRecords(synthetic(task),task,evaluate);assert.equal(r.passed,true,JSON.stringify({task,checks:r.checks}));}
 for(let i=0;i<40;i+=4)assert.equal(new Set(tasks.slice(i,i+4).map(t=>encodeRecords(synthetic(t)).plainSha256)).size,1);
});
test("gzip payload, hashes and prohibited keys are checked before replay",()=>{
 const records=synthetic(tasks[0]),e=encodeRecords(records);assert.deepEqual(decodeRecords(e.compressed,e),records);
 assert.throws(()=>decodeRecords(e.compressed,{...e,plainSha256:"bad"}));
 const b=Buffer.from(e.compressed);b[10]^=255;assert.throws(()=>decodeRecords(b,e));
 assert.throws(()=>rejectCompetitiveKeys({a:[{nativeWinner:"x"}]}));
});
test("stream tampering and false attribution are not accepted",()=>{
 const a=synthetic(tasks[8]);a[100].pre={legacy:[],live:[],target:null};assert.throws(()=>analyzeRecords(a,tasks[8],evaluate));
 const b=synthetic(tasks[8]);b.at(-2).events[0].attackerPlayerName=null;assert.equal(analyzeRecords(b,tasks[8],evaluate).passed,false);
 const c=synthetic(tasks[0]);c.at(-2).actions.push({role:"owner",tick:1800,kind:"quit"});assert.throws(()=>analyzeRecords(c,tasks[0],evaluate));
 const d=synthetic(tasks[0]);delete d.find(r=>r.kind==="readiness").observation;assert.equal(analyzeRecords(d,tasks[0],evaluate).passed,false);
});
test("replayed cleanup does not become attributed physical destruction",()=>{
 for(const index of [32,34,36,38]){const r=analyzeRecords(synthetic(tasks[index]),tasks[index],evaluate);assert.equal(r.checks.noPhysicalAttribution,true);assert.equal(r.attributionAtTransition.attackerAttributed,false);assert.equal(r.attributionAtTransition.ownerAttributed,false);}
});

