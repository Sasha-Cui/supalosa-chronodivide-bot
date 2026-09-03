import assert from "node:assert/strict";
import crypto from "node:crypto";
import {gzipSync,gunzipSync} from "node:zlib";

export const ROOT_RELATIVE="research-evidence/live-building-ledger/combatant-owned-gate-v1";
export const PROTOCOL_SHA256="874ace6fbf40b6570abe767290641e47732dcb32db6f021cf547ea20da5e43ee";
export const TEMPLATE_SHA256="bd61bb9ab4412b15895c89188336ab53b03dd20879936b92aaf4418e091cf7fc";
export const ACTORS={attacker:"OwnedFixtureAttacker",owner:"OwnedFixtureOwner"};
export const NEUTRAL="@@NEUTRAL@@";
export const ORDER={Move:0,ForceAttack:3,Capture:7,DeploySelected:10,Stop:11};
export const TYPE={Building:2,Infantry:3,Vehicle:7};
export const SCENARIOS=["physical_no_rubble","physical_rubble","capture","sale","cleanup"];
export const SMOKE_INDICES=[0,8,16,24,32];
export const MAX_UPDATES=7200,ACTION_TICK=1800;
export const tasks=Array.from({length:40},(_,taskIndex)=>{
 const scenarioIndex=Math.floor(taskIndex/8),orientation=Math.floor(taskIndex%8/4),attackerLabelIndex=Math.floor(taskIndex%4/2),repeat=taskIndex%2;
 return {taskIndex,scenarioIndex,scenario:SCENARIOS[scenarioIndex],rubble:scenarioIndex!==0,orientation,attackerLabelIndex,repeat,seed:3100500000+scenarioIndex*100+orientation};
});
export const hash=bytes=>crypto.createHash("sha256").update(bytes).digest("hex");
export const labels=task=>task.attackerLabelIndex===0?{candidate:ACTORS.attacker,baseline:ACTORS.owner}:{candidate:ACTORS.owner,baseline:ACTORS.attacker};
export const physical=task=>task.scenario.startsWith("physical_");
export function fixtureMap(template,rubble){
 assert.equal(typeof rubble,"boolean");for(const section of ["Structures","GAPOWR","ENGINEER","SENGINEER","E2","HTNK"])assert.ok(!template.includes("["+section+"]"),"Unexpected fixture override");
 return template.replace("Name=No name","Name=Owned Ledger Technical "+Number(rubble))+
  "\n[Structures]\n0=Neutral,GAPOWR,256,50,50,0,None,0,0,1,0,0,0,0,0,0,0\n"+
  "\n[GAPOWR]\nStrength=100\nCrewed=no\nExplodes=no\nLeaveRubble="+(rubble?"yes":"no")+
  "\n\n[ENGINEER]\nAllowedToStartInMultiplayer=yes\n\n[SENGINEER]\nAllowedToStartInMultiplayer=yes"+
  "\n\n[E2]\nAllowedToStartInMultiplayer=no\n\n[HTNK]\nAllowedToStartInMultiplayer=no\n";
}
export function rejectCompetitiveKeys(value){
 if(!value||typeof value!=="object")return;
 for(const [key,child]of Object.entries(value)){assert.ok(!/winner|score|defeat|terminal|ranking|winrate|losses|draws/i.test(key),"Prohibited competitive key "+key);rejectCompetitiveKeys(child);}
}
export function validateInitialUnits(units){
 const rules=role=>[...new Set(units[role].map(u=>u.rule))].sort();
 assert.deepEqual(rules("owner"),["SENGINEER","SMCV"]);
 assert.ok(rules("attacker").every(n=>["AMCV","MTNK","E1","ENGINEER"].includes(n)));
 assert.ok(["AMCV","MTNK","ENGINEER"].every(n=>rules("attacker").includes(n)));
 const all=[...units.attacker,...units.owner];assert.equal(new Set(all.map(u=>u.id)).size,all.length);
 for(const role of ["attacker","owner"]){assert.equal(new Set(units[role].map(u=>u.id)).size,units[role].length);assert.ok(units[role].every(u=>u.hp>0));}
 return true;
}
export function planActions(view,scenario,oneOffSent=false){
 const {role,tick,own,target,visible}=view,result=[],order=(ids,type,extra={})=>({kind:"order",ids,type,...extra});
 const idsFor=name=>own.filter(u=>u.rule===name&&u.hp>0).map(u=>u.id).sort((a,b)=>a-b);
 if(role==="attacker"){
  if(tick<120&&tick%15===0){const ids=idsFor("AMCV");if(ids.length)result.push(order(ids,ORDER.DeploySelected));}
  if(tick<ACTION_TICK||tick%30!==0||!target||target.hp<=0||target.owner!==ACTORS.owner)return result;
  let ids;
  if(scenario==="capture")ids=idsFor("ENGINEER").slice(0,1);
  else if(scenario.startsWith("physical_"))ids=own.filter(u=>u.hp>0&&[TYPE.Vehicle,TYPE.Infantry].includes(u.type)&&!["AMCV","SMCV","ENGINEER","SENGINEER"].includes(u.rule)).map(u=>u.id).sort((a,b)=>a-b);
  else return result;
  if(ids.length)result.push(visible?order(ids,scenario==="capture"?ORDER.Capture:ORDER.ForceAttack,{targetId:target.id}):order(ids,ORDER.Move,{rx:50,ry:50}));
 }else{
  assert.equal(role,"owner");
  if(tick%30!==0)return result;
  if(target?.owner===ACTORS.owner&&target.hp>0){
   const ids=idsFor("SENGINEER");if(ids.length)result.push(order(ids,ORDER.Stop));
   if(tick===ACTION_TICK&&!oneOffSent){
    if(scenario==="sale")result.push({kind:"sell",targetId:target.id});
    else if(scenario==="cleanup")result.push({kind:"quit"});
   }
  }else if(tick>=120&&tick<ACTION_TICK&&target?.owner===NEUTRAL&&target.hp>0){
   const ids=idsFor("SENGINEER").slice(0,1);
   if(ids.length)result.push(visible?order(ids,ORDER.Capture,{targetId:target.id}):order(ids,ORDER.Move,{rx:50,ry:50}));
  }
 }
 return result;
}
export function dispatchAction(api,request){
 if(request.kind==="sell")return api.sellObject(request.targetId);
 if(request.kind==="quit")return api.quitGame();
 assert.equal(request.kind,"order");
 if(request.targetId!==undefined)return api.orderUnits(request.ids,request.type,request.targetId);
 if(request.rx!==undefined)return api.orderUnits(request.ids,request.type,request.rx,request.ry);
 return api.orderUnits(request.ids,request.type);
}
export function normalizeAction(method,args){
 if(method==="sellObject"){assert.equal(args.length,1);return {kind:"sell",targetId:args[0]};}
 if(method==="quitGame"){assert.equal(args.length,0);return {kind:"quit"};}
 assert.equal(method,"orderUnits","Non-declared action method");assert.ok([2,3,4].includes(args.length));
 const [ids,type,a,b]=args;return {kind:"order",ids:[...ids],type,...(args.length===3?{targetId:a}:args.length===4?{rx:a,ry:b}:{})};
}
export function readiness(state,preparationEvents,targetId){
 return {
  targetOwned:state.target?.owner===ACTORS.owner&&state.target.hp>0,
  exactlyOneOwnerBuilding:state.live.filter(b=>b.owner===ACTORS.owner).length===1&&state.live.some(b=>b.id===targetId&&b.owner===ACTORS.owner),
  attackerEstablished:state.live.some(b=>b.owner===ACTORS.attacker),
  preparationOwnerChange:preparationEvents.some(e=>e.type===0&&e.target===targetId&&e.previousOwnerName===NEUTRAL&&e.newOwnerName===ACTORS.owner),
 };
}
export function isTargetTransition(frame,targetId){
 return frame.gameTickBefore>=ACTION_TICK&&frame.events.some(e=>e.target===targetId&&[0,2,3].includes(e.type));
}
export function encodeRecords(records){
 const plain=Buffer.from(records.map(r=>JSON.stringify(r)).join("\n")+"\n"),compressed=gzipSync(plain,{level:6});
 return {plain,compressed,plainSha256:hash(plain),gzipSha256:hash(compressed),recordCount:records.length};
}
export function decodeRecords(compressed,expected){
 assert.equal(hash(compressed),expected.gzipSha256);
 const plain=gunzipSync(compressed,{maxOutputLength:128*1024*1024});assert.equal(hash(plain),expected.plainSha256);
 assert.ok(plain.toString().endsWith("\n"));const records=plain.toString().trimEnd().split("\n").map(s=>JSON.parse(s));
 assert.equal(records.length,expected.recordCount);rejectCompetitiveKeys(records);return records;
}
const validateState=state=>{
 for(const name of ["legacy","live"]){
  const rows=state[name];assert.ok(Array.isArray(rows));assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);
  assert.ok(rows.every((r,i)=>Number.isSafeInteger(r.id)&&Object.values(ACTORS).includes(r.owner)&&Number.isFinite(r.hitPoints)&&
   (name!=="live"||r.hitPoints>0)&&(i===0||rows[i-1].id<r.id)));
 }
};
export function analyzeRecords(records,task,evaluate){
 assert.deepEqual(task,tasks[task.taskIndex]);rejectCompetitiveKeys(records);
 const initial=records[0],stop=records.at(-1);assert.equal(initial.kind,"initial");assert.equal(initial.schemaVersion,1);assert.equal(initial.update,0);assert.equal(initial.gameTick,0);
 assert.deepEqual(initial.actors,ACTORS);validateInitialUnits(initial.initialUnits);assert.equal(stop.kind,"stop");
 assert.equal(initial.seed,task.seed);assert.equal(initial.scenario,task.scenario);
 assert.deepEqual(initial.targetRules,{capturable:true,returnable:false,leaveRubble:task.rubble});
 assert.equal(initial.state.target.id,initial.targetId);assert.equal(initial.state.target.owner,NEUTRAL);assert.equal(initial.state.target.hp,100);
 assert.ok(![...initial.initialUnits.attacker,...initial.initialUnits.owner].some(u=>u.id===initial.targetId));
 assert.equal(initial.state.target.rx,50);assert.equal(initial.state.target.ry,50);validateState(initial.state);
 assert.equal(records.length,2+records.filter(r=>r.kind==="update").length+records.filter(r=>r.kind==="readiness").length);
 const frames=records.filter(r=>r.kind==="update"),readies=records.filter(r=>r.kind==="readiness");
 assert.ok(frames.length<=MAX_UPDATES);assert.equal(stop.update,frames.length);
 let previous=initial.state,liveEstablished={candidate:false,baseline:false},legacyEstablished={candidate:false,baseline:false},oneOff=false;
 const preparationEvents=[],transitions=[],actions=[],evaluations=[];
 for(const [index,f]of frames.entries()){
  assert.equal(f.update,index+1);assert.equal(f.gameTickBefore,index);assert.equal(f.gameTickAfter,index+1);
  assert.deepEqual(f.pre,previous);validateState(f.pre);validateState(f.post);previous=f.post;
  assert.deepEqual(f.views.map(v=>v.role),task.orientation===0?["attacker","owner"]:["owner","attacker"]);
  const expected=[];
  for(const v of f.views){
   assert.equal(v.tick,f.gameTickBefore);assert.deepEqual(v.target,f.pre.target);
   assert.equal(new Set(v.own.map(u=>u.id)).size,v.own.length);assert.ok(v.own.every(u=>Number.isFinite(u.hp)));
   const requests=planActions(v,task.scenario,oneOff);
   for(const request of requests){expected.push({role:v.role,tick:v.tick,...request});if(["sell","quit"].includes(request.kind))oneOff=true;}
  }
  assert.deepEqual(f.actions,expected);actions.push(...f.actions);
  if(f.gameTickBefore<ACTION_TICK)preparationEvents.push(...f.events);
  if(isTargetTransition(f,initial.targetId))transitions.push(f);
  const common={tick:f.gameTickAfter,combatants:labels(task),events:f.events};
  const live=evaluate({...common,pre:f.pre.live,post:f.post.live,establishedBeforeUpdate:liveEstablished});
  const legacy=evaluate({...common,pre:f.pre.legacy,post:f.post.legacy,establishedBeforeUpdate:legacyEstablished});
  liveEstablished=live.establishedAfterUpdate;legacyEstablished=legacy.establishedAfterUpdate;
  const select=(e,actor)=>labels(task).candidate===ACTORS[actor]?e.candidatePhysicalWin:e.baselinePhysicalWin;
  evaluations.push({update:f.update,attackerAttributed:select(live,"attacker"),ownerAttributed:select(live,"owner"),legacyAttackerAttributed:select(legacy,"attacker"),legacyOwnerAttributed:select(legacy,"owner")});
 }
 const ready=readies[0],f=transitions[0],ev=evaluations.find(e=>e.update===f?.update);
 if(ready){assert.equal(ready.gameTick,ACTION_TICK);assert.equal(ready.update,ACTION_TICK);assert.deepEqual(ready.state,frames[ACTION_TICK]?.pre??previous);}
 const readyChecks=ready?readiness(ready.state,preparationEvents,initial.targetId):{};
 if(ready)assert.deepEqual(ready.checks,readyChecks);
 const event=e=>f?.events.filter(x=>x.target===initial.targetId&&x.type===e)??[];
 const ownerAfter=f?.post.live.filter(b=>b.owner===ACTORS.owner).length;
 const targetAfter=f?.post.target;
 const scenarioAction=actions.filter(a=>a.tick>=ACTION_TICK&&(physical(task)?a.type===ORDER.ForceAttack:task.scenario==="capture"?a.role==="attacker"&&a.type===ORDER.Capture:task.scenario==="sale"?a.kind==="sell":a.kind==="quit"));
 const checks={
  initialComposition:true,fullStreamIntegrity:true,declaredActionsOnly:true,
  readinessExactlyOnce:readies.length===1,readinessPassed:!!ready&&Object.values(readyChecks).every(Boolean),
  firstTransition:transitions.length===1&&stop.reason==="target_transition"&&f?.update===frames.length,
  boundaryObservations:!!ready&&ready.observation?.update===ACTION_TICK&&!!f&&f.observation?.update===f.update,
  transitionAfterReadiness:!!f&&f.gameTickBefore>=ACTION_TICK&&f.update<=MAX_UPDATES,
  ownerLiveZeroing:ownerAfter===0,
  intendedScenarioAction:scenarioAction.length>0,
  noUnexpectedQuit:actions.filter(a=>a.kind==="quit").length===(task.scenario==="cleanup"?1:0),
  noUnexpectedSale:actions.filter(a=>a.kind==="sell").length===(task.scenario==="sale"?1:0),
  noPriorPhysicalAttribution:evaluations.filter(e=>e.update<f?.update).every(e=>!e.attackerAttributed&&!e.ownerAttributed),
  visibilityRespected:frames.every(x=>x.actions.every(a=>![ORDER.Capture,ORDER.ForceAttack].includes(a.type)||x.views.find(v=>v.role===a.role)?.visible===true)),
  nativeFinishExpected:frames.every(x=>!x.gameFinishedAfter||task.scenario==="cleanup"&&x.gameTickBefore>=ACTION_TICK),
  fixedObservationCoverage:[0,120,300,600,1200,1799,1800].every(n=>records.some(r=>r.observation?.update===n)),
 };
 if(physical(task)){
  Object.assign(checks,{
   strictOpposingAttribution:ev?.attackerAttributed===true&&ev.ownerAttributed===false,
   destroyExactlyOnce:event(3).length===1&&event(3)[0].attackerPlayerName===ACTORS.attacker,
   unspawnPresent:event(2).length===1,
   noCaptureAtTransition:event(0).length===0,
   worldLifecycle:task.rubble?targetAfter?.inWorld===true&&targetAfter.hp===0&&targetAfter.owner===ACTORS.owner:targetAfter===null,
   targetNotLive:!!f&&!f.post.live.some(b=>b.id===initial.targetId),
   legacyAsExpected:ev?.legacyAttackerAttributed===!task.rubble&&ev.legacyOwnerAttributed===false,
  });
 }else{
  checks.noPhysicalAttribution=evaluations.every(e=>!e.attackerAttributed&&!e.ownerAttributed&&!e.legacyAttackerAttributed&&!e.legacyOwnerAttributed);
  if(task.scenario==="capture")checks.captureObserved=event(0).some(e=>e.previousOwnerName===ACTORS.owner&&e.newOwnerName===ACTORS.attacker)&&targetAfter?.owner===ACTORS.attacker&&targetAfter.hp>0;
  if(task.scenario==="sale")checks.saleObserved=event(2).length===1&&targetAfter===null&&!event(3).some(e=>e.attackerPlayerName===ACTORS.attacker);
  if(task.scenario==="cleanup")checks.unattributedCleanup=event(3).length===1&&event(3)[0].attackerPlayerName===null&&event(2).length===1&&(!targetAfter||targetAfter.hp===0);
 }
 return {passed:Object.values(checks).every(v=>v===true),checks,updates:frames.length,stopReason:stop.reason,
  transitionUpdate:f?.update??null,readinessChecks:readyChecks,actionCounts:{total:actions.length,attacker:actions.filter(a=>a.role==="attacker").length,owner:actions.filter(a=>a.role==="owner").length,
   captures:actions.filter(a=>a.type===ORDER.Capture).length,physicalAttacks:actions.filter(a=>a.type===ORDER.ForceAttack).length,sales:actions.filter(a=>a.kind==="sell").length,quits:actions.filter(a=>a.kind==="quit").length},
  attributionAtTransition:ev??null};
}
