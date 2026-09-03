import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {fileURLToPath,pathToFileURL} from "node:url";
import {createRequire} from "node:module";
import {PROBE_RELATIVE_ROOT,tasks,fixtureMap,rejectCompetitiveKeys,probeChecks,scriptedOrders,compactTechnicalError} from "../runtime/neutral-building-ledger-probe-v1.mjs";

const progress={phase:"startup",taskIndex:null,gameCreateRequested:false,gameCallbackEntered:false,completedUpdates:0};
async function main(){
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../.."),project=path.dirname(repo);
const root=path.join(project,PROBE_RELATIVE_ROOT);
const driver=path.join(repo,"packages/chronodivide-bot-driver");
const originalAssets=path.join(project,"private-assets/ra2/runtimes/hfo-literal-snow-regular-e0b18958");
const protocolFile=path.join(repo,"research/protocols/maps/2026-09-03-neutral-building-lifecycle-probe-scouting-a3.md");
const hash=x=>crypto.createHash("sha256").update(x).digest("hex"),read=p=>fs.readFileSync(p),json=p=>JSON.parse(read(p));
const git=(...a)=>execFileSync("git",a,{cwd:repo,encoding:"utf8"}).trim();
const required=k=>{assert.ok(process.env[k],k+" required");return process.env[k];};
const phase=process.argv[2];progress.phase=phase;assert.ok(["prepare","init","smoke","trace","finalize"].includes(phase));
assert.equal(git("branch","--show-current"),"main");assert.equal(git("status","--porcelain"),"");
const sourceCommit=git("rev-parse","HEAD");assert.equal(sourceCommit,git("rev-parse","fork/main"));
const programSha256=hash(read(fileURLToPath(import.meta.url))),protocolSha256=hash(read(protocolFile));
const runtimeSha256="dd398f5c8c2b4c3e3d6eb0f9ca6d7549bf70fee16c5950cd8902616ac922497d";
const require=createRequire(path.join(driver,"package.json")),runtime=fs.realpathSync(require.resolve("@chronodivide/game-api"));
assert.equal(hash(read(runtime)),runtimeSha256);
const candidatesSha256=hash(read(path.join(driver,"dist/training/liveOwnedBuildingSnapshotCandidate.js")));
const legacySha256=hash(read(path.join(driver,"dist/training/literalBuildingEliminationEndpoint.js")));
const coreSha256=hash(read(path.join(repo,"research/runtime/neutral-building-ledger-probe-v1.mjs")));
const assetManifestSha256=hash(read(path.join(project,"private-assets/ra2/manifests/hfo-literal-snow-regular-e0b18958.json")));
assert.equal(assetManifestSha256,"d942117f24363818977d573dbc87006a9b320c6861bddf939d5fc80db2217e67");
const assetEntries=fs.readdirSync(originalAssets).sort().map(name=>{const p=path.join(originalAssets,name);assert.ok(fs.statSync(p).isFile(),"Expected flat asset directory");return {name,sha256:hash(read(p))};});
const assetEntriesSha256=hash(JSON.stringify(assetEntries));
const identity={sourceCommit,programSha256,protocolSha256,runtimeSha256,candidatesSha256,legacySha256,coreSha256,assetManifestSha256,assetEntriesSha256};
const write=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.writeFileSync(file,JSON.stringify(value,null,2)+"\n",{flag:"wx",mode:0o600});};
if(phase==="prepare"){
 assert.ok(!fs.existsSync(root),"Probe already prepared; preserve it");
 const template=read(path.join(driver,"data/simple-1v1-no-preview.map"));
 assert.equal(hash(template),"bd61bb9ab4412b15895c89188336ab53b03dd20879936b92aaf4418e091cf7fc");
 assert.ok(!template.toString().includes("[Structures]"));assert.ok(!template.toString().includes("[GAPOWR]"));
 const previousPath=path.join(project,"research-evidence/live-building-ledger/neutral-probe-v1-materialization-a1/manifest.json");
 const previousManifestSha256=hash(read(previousPath));
 assert.equal(previousManifestSha256,"1a005ed67327b38d0f95d0ae30f18440804674fca18b9d30c4d1d42728d29b3b");
 const previous=json(previousPath),assets=previous.assets;
 assert.deepEqual(previous.assetEntries,assetEntries);
 const maps=[false,true].map(rubble=>{
  const name="chrono_neutral_ledger_"+Number(rubble)+".map",bytes=fixtureMap(template.toString(),rubble);
  assert.ok(fs.lstatSync(path.join(assets,name)).isFile());assert.equal(hash(read(path.join(assets,name))),hash(bytes));
  return {rubble,name,sha256:hash(bytes)};
 });
 write(path.join(root,"manifest.json"),{kind:"neutral-building-lifecycle-probe-v1",...identity,templateSha256:hash(template),assets,assetEntries,materialization:"reuse-sealed-A1-regular-files",previousManifestSha256,maps,tasks,smokeTaskIndices:[0,2],horizon:6000});
 console.log(JSON.stringify({prepared:true,root,manifestSha256:hash(read(path.join(root,"manifest.json"))),...identity}));process.exit(0);
}
assert.equal(required("SLURM_JOB_ACCOUNT"),"pi_jss233");assert.equal(sourceCommit,required("SOURCE_COMMIT"));
assert.equal(programSha256,required("PROGRAM_SHA256"));assert.equal(protocolSha256,required("PROTOCOL_SHA256"));
const manifest=json(path.join(root,"manifest.json")),manifestSha256=hash(read(path.join(root,"manifest.json")));
assert.equal(manifestSha256,required("MANIFEST_SHA256"));
for(const [k,v]of Object.entries(identity))assert.equal(manifest[k],v);
assert.deepEqual(manifest.tasks,tasks);assert.deepEqual(manifest.assetEntries,assetEntries);
assert.equal(process.version,"v20.13.1");
const jobId=required("SLURM_JOB_ID"),out=required("OUT_PATH");
for(const {name,sha256} of manifest.assetEntries){const file=path.join(manifest.assets,name);assert.ok(fs.lstatSync(file).isFile(),"Asset must be a regular file");assert.equal(hash(read(file)),sha256);}
if(phase==="init"){
 progress.phase="asset-initialization";const {cdapi}=await import(pathToFileURL(runtime));await cdapi.init(manifest.assets);progress.phase="asset-initialization-complete";
 write(out,{kind:"neutral-building-init-compatibility-a1",complete:true,passed:true,...identity,manifestSha256,jobId,schedulerAccount:"pi_jss233",gameInstances:0,updates:0,regularAssetCount:manifest.assetEntries.length});
 console.log(JSON.stringify({complete:true,passed:true,gameInstances:0,updates:0}));process.exit(0);
}
const initDir=path.join(root,"compatibility-init");fs.readdirSync(initDir);
assert.equal(read(path.join(initDir,"COMPLETE")).toString().trim(),"COMPLETE_NEUTRAL_LEDGER_INIT_A1");
const initArtifact=json(path.join(initDir,"init.json"));
assert.equal(hash(read(path.join(initDir,"init.json"))),read(path.join(initDir,"init.sha256")).toString().trim().split(/\s+/)[0]);
assert.equal(initArtifact.passed,true);assert.equal(initArtifact.gameInstances,0);assert.equal(initArtifact.updates,0);assert.equal(initArtifact.manifestSha256,manifestSha256);
for(const [k,v]of Object.entries(identity))assert.equal(initArtifact[k],v);
const prohibited=rejectCompetitiveKeys;
if(["trace","finalize"].includes(phase)){
 const smokeRoot=path.join(root,"compatibility-smoke");fs.readdirSync(smokeRoot);
 assert.equal(read(path.join(smokeRoot,"COMPLETE")).toString().trim(),"COMPLETE_NEUTRAL_LEDGER_SMOKE_A2");
 const smokeFile=path.join(smokeRoot,"smoke.json");assert.equal(hash(read(smokeFile)),read(path.join(smokeRoot,"smoke.sha256")).toString().trim().split(/\s+/)[0]);
 const smoke=json(smokeFile);assert.equal(smoke.passed,true);assert.equal(smoke.manifestSha256,manifestSha256);
 for(const [k,v]of Object.entries(identity))assert.equal(smoke[k],v);
}
let apiInitialized=false;
async function runTrace(taskIndex){
 assert.ok(Number.isInteger(taskIndex)&&taskIndex>=0&&taskIndex<8);
 Object.assign(progress,{phase:"trace-setup",taskIndex,gameCreateRequested:false,gameCallbackEntered:false,completedUpdates:0});
 const task=tasks[taskIndex],map=manifest.maps.find(m=>m.rubble===task.rubble);
 assert.equal(hash(read(path.join(manifest.assets,map.name))),map.sha256);
 const {Bot,cdapi,ObjectType,OrderType,ApiEventType}=await import(pathToFileURL(runtime));
 assert.equal(globalThis[Symbol.for("chrono.research.explicit-start.v1")]?.originalSha256,runtimeSha256);
 const {transformExplicitStartRuntime}=await import("../runtime/explicit-start-transform-v1.mjs");
 assert.equal(hash(transformExplicitStartRuntime(read(runtime))),"4ad4a5dd7a6a8ae53a7e671a29d7dd0a5fbad1916d94e52c69c9eda133a30f0c");
 const load=p=>import(pathToFileURL(path.join(driver,"dist",p)));
 const {withSeededOfflineGame}=await load("benchmark/seededOfflineGame.js");
 const {snapshotCombatantBuildings,evaluateLiteralBuildingUpdate,toEndpointEvent}=await load("training/literalBuildingEliminationEndpoint.js");
 const {snapshotLiveOwnedBuildingsCandidate}=await load("training/liveOwnedBuildingSnapshotCandidate.js");
 let targetId=null,events=[],attacks=0,scoutActions=0,hiddenAttackRequests=0,firstTargetVisibleTick=null,firstAttackTick=null;
 const normalize=toEndpointEvent;
 class Scripted extends Bot{
  onGameStart(api){this.api=api;}
  onGameEvent(ev){const e=normalize(ev);if(e&&e.target===targetId)events.push(e);}
  onGameTick(api){
   this.api=api;const tick=api.getCurrentTick();
   const own=api.getVisibleUnits(this.name,"self").map(id=>api.getUnitData(id)).filter(Boolean);
   const target=targetId===null?null:api.getGameObjectData(targetId);
   const targetVisible=targetId!==null&&api.getVisibleUnits(this.name,"hostile").includes(targetId);
   if(targetVisible&&firstTargetVisibleTick===null)firstTargetVisibleTick=tick;
   for(const request of scriptedOrders({tick,own,targetId,target,targetVisible,types:ObjectType,orders:OrderType})){
    if(request.targetId!==undefined){
     if(!targetVisible)hiddenAttackRequests++;
     this.player.actions.orderUnits(request.ids,request.type,request.targetId);attacks++;if(firstAttackTick===null)firstAttackTick=tick;
    }else if(request.rx!==undefined){this.player.actions.orderUnits(request.ids,request.type,request.rx,request.ry);scoutActions++;}
    else this.player.actions.orderUnits(request.ids,request.type);
   }
  }
 }
 const attacker=new Scripted("FixtureAttacker","Americans"),passive=new Bot("FixturePassive","Russians");
 attacker.chronoResearchStartPos=task.orientation;passive.chronoResearchStartPos=1-task.orientation;
 if(!apiInitialized){progress.phase="asset-initialization";await cdapi.init(manifest.assets);apiInitialized=true;}
 const settings={online:false,agents:task.orientation===0?[attacker,passive]:[passive,attacker],mapName:map.name,gameMode:cdapi.getAvailableGameModes(map.name)[0],shortGame:false,mcvRepacks:true,cratesAppear:false,superWeapons:false,gameSpeed:6,credits:10000,unitCount:10,buildOffAlly:false};
 progress.phase="create-game";progress.gameCreateRequested=true;
 const result=await withSeededOfflineGame(cdapi,settings,task.seed,[{agent:attacker,identity:"candidate"},{agent:passive,identity:"opponent"}],async game=>{
  progress.gameCallbackEntered=true;progress.phase="initial-observation";
  const api=attacker.api;assert.ok(api);const starts=[{x:37,y:63},{x:62,y:39}];
  const point=v=>v.x+","+v.y;
  assert.equal(point(api.getPlayerData(attacker.name).startLocation),point(starts[task.orientation]));
  assert.equal(point(api.getPlayerData(passive.name).startLocation),point(starts[1-task.orientation]));
  const targets=api.getNeutralUnits(r=>r.type===ObjectType.Building&&r.name==="GAPOWR");assert.equal(targets.length,1);targetId=targets[0];
  const initial=api.getUnitData(targetId);assert.ok(initial.hitPoints>0);assert.equal(initial.rules.leaveRubble,task.rubble);assert.equal(initial.tile.rx,50);assert.equal(initial.tile.ry,50);
  const combatants={candidate:attacker.name,baseline:initial.owner};assert.notEqual(initial.owner,attacker.name);assert.notEqual(initial.owner,passive.name);
  const snap=()=>({legacy:snapshotCombatantBuildings(api,combatants),live:snapshotLiveOwnedBuildingsCandidate(api,combatants)});
  const trace=crypto.createHash("sha256"),boundaries=[],observations=[];let updates=0,earlyFinish=false,destroyEvents=0;
  const observe=()=>{
   const target=api.getGameObjectData(targetId),targetVisible=api.getVisibleUnits(attacker.name,"hostile").includes(targetId);
   const own=api.getVisibleUnits(attacker.name,"self").map(id=>api.getUnitData(id)).filter(Boolean).map(u=>({id:u.id,rule:u.rules.name,type:u.rules.type,hp:u.hitPoints,rx:u.tile.rx,ry:u.tile.ry,isIdle:u.isIdle,attackState:u.attackState??null})).sort((a,b)=>a.id-b.id);
   observations.push({updates,targetVisible,target:target?{id:target.id,hp:target.hitPoints,rx:target.tile.rx,ry:target.tile.ry}:null,own});
  };
  observe();
  trace.update(JSON.stringify(snap())+"\n");
  while(updates<manifest.horizon){
   if(game.isFinished()){earlyFinish=true;break;}
   progress.phase="pre-update-observation";const pre=snap();events=[];
   progress.phase="game-update";await game.update();updates++;progress.completedUpdates=updates;
   progress.phase="post-update-observation";const post=snap();
   trace.update(JSON.stringify({updates,post,events})+"\n");
   if([120,180,300,600,1200,2400,6000].includes(updates))observe();
   const de=events.filter(e=>e.type===ApiEventType.ObjectDestroy);destroyEvents+=de.length;
   if(de.length){
    const world=api.getAllUnits().includes(targetId),owned=api.getVisibleUnits(initial.owner,"self").includes(targetId),u=api.getUnitData(targetId);
    const options={tick:updates,combatants,events,establishedBeforeUpdate:{candidate:pre.live.some(b=>b.owner===attacker.name),baseline:true}};
    boundaries.push({updates,pre,post,events,targetInWorld:world,targetInOwned:owned,targetHealth:u?.hitPoints??null,ownerTag:u?.owner??null,
     attackerBuildingEstablished:options.establishedBeforeUpdate.candidate,
     strictAttributionRecognized:evaluateLiteralBuildingUpdate({...options,pre:pre.live,post:post.live}).candidatePhysicalWin,
     legacyAttributionRecognized:evaluateLiteralBuildingUpdate({...options,pre:pre.legacy,post:post.legacy}).candidatePhysicalWin});
   }
  }
  const checks=probeChecks({updates,earlyFinish,attacks,destroyEvents,boundaries,task,targetId,initialOwner:initial.owner,attackerName:attacker.name,destroyType:ApiEventType.ObjectDestroy,unspawnType:ApiEventType.ObjectUnspawn});
  checks.visibleBeforeAttack=firstTargetVisibleTick!==null&&firstAttackTick!==null&&firstTargetVisibleTick<=firstAttackTick;
  checks.noHiddenAttackRequest=hiddenAttackRequests===0;
  checks.fixedObservations=observations.length===8;
  return {updates,attackActions:attacks,scoutActions,hiddenAttackRequests,firstTargetVisibleTick,firstAttackTick,destroyEvents,traceSha256:trace.digest("hex"),boundaries,observations,checks};
 });
 const artifact={kind:"neutral-building-lifecycle-trace-v1",complete:true,...identity,manifestSha256,task,map,jobId,schedulerAccount:"pi_jss233",nodeVersion:process.version,result};
 prohibited(artifact);progress.phase="trace-complete";return artifact;
}
if(phase==="smoke"){
 assert.deepEqual(manifest.smokeTaskIndices,[0,2]);const traces=[];
 for(const taskIndex of manifest.smokeTaskIndices)traces.push(await runTrace(taskIndex));
 const passed=traces.every(t=>Object.values(t.result.checks).every(v=>v===true));
 write(out,{kind:"neutral-building-lifecycle-smoke-a2",complete:true,passed,...identity,manifestSha256,jobId,schedulerAccount:"pi_jss233",traces});
 console.log(JSON.stringify({complete:true,passed,technicalCases:2}));
}else if(phase==="trace"){
 const taskIndex=Number(required("SLURM_ARRAY_TASK_ID"));
 write(out,await runTrace(taskIndex));console.log(JSON.stringify({complete:true,taskIndex}));
}else{
 const array=required("ARRAY_JOB_ID");
 const raw=execFileSync("/opt/slurm/current/bin/sacct",["-X","-j",array,"-n","-P","--format=JobID,JobIDRaw,Account,Partition,State,ExitCode,Restarts"],{encoding:"utf8"});
 const jobs=new Map();
 for(const line of raw.trim().split("\n")){
  const [label,id,account,partition,state,exit,restarts]=line.split("|"),match=new RegExp("^"+array+"_(\\d+)$").exec(label);if(!match)continue;
  assert.equal(account,"pi_jss233");assert.equal(partition,"day");assert.equal(state,"COMPLETED");assert.equal(exit,"0:0");assert.equal(restarts,"0");
  assert.ok(!jobs.has(+match[1]));jobs.set(+match[1],id);
 }
 assert.equal(jobs.size,8);assert.equal(new Set(jobs.values()).size,8);
 const traces=tasks.map(task=>{
  const dir=path.join(root,"cells/task-"+task.taskIndex),file=path.join(dir,"trace.json");fs.readdirSync(dir);
  assert.equal(read(path.join(dir,"COMPLETE")).toString().trim(),"COMPLETE_NEUTRAL_LEDGER_TRACE_V1");
  assert.equal(hash(read(file)),read(path.join(dir,"trace.sha256")).toString().trim().split(/\s+/)[0]);
  const a=json(file);assert.equal(a.complete,true);assert.deepEqual(a.task,task);assert.equal(a.jobId,jobs.get(task.taskIndex));assert.equal(a.manifestSha256,manifestSha256);
  for(const [k,v]of Object.entries(identity))assert.equal(a[k],v);prohibited(a);return a;
 });
 const deterministic=[0,2,4,6].every(i=>traces[i].result.traceSha256===traces[i+1].result.traceSha256);
 const passed=deterministic&&traces.every(t=>Object.values(t.result.checks).every(v=>v===true));
 write(out,{kind:"neutral-building-lifecycle-aggregate-v1",complete:true,passed,deterministic,scope:"neutral target primitive only; not endpoint promotion",...identity,manifestSha256,scheduler:{arrayJobId:array,finalizerJobId:jobId,account:"pi_jss233",taskJobIds:Object.fromEntries(jobs)},traces});
 console.log(JSON.stringify({complete:true,passed,traceCount:8}));
}

}
main().catch(error=>{
 const failure=compactTechnicalError(error,progress);console.error(JSON.stringify(failure));
 if(process.env.OUT_PATH){const file=path.join(path.dirname(process.env.OUT_PATH),"failure.json");try{fs.writeFileSync(file,JSON.stringify(failure,null,2)+"\n",{flag:"wx",mode:0o600});}catch{}}
 process.exitCode=1;
});
