import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {createRequire} from "node:module";
import {fileURLToPath,pathToFileURL} from "node:url";
import {ROOT_RELATIVE,PROTOCOL_SHA256,TEMPLATE_SHA256,ACTORS,NEUTRAL,ORDER,TYPE,SMOKE_INDICES,MAX_UPDATES,ACTION_TICK,tasks,hash,labels,
 fixtureMap,rejectCompetitiveKeys,validateInitialUnits,planActions,dispatchAction,normalizeAction,readiness,isTargetTransition,encodeRecords,decodeRecords,analyzeRecords} from "../runtime/combatant-owned-ledger-gate-v1.mjs";

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../.."),project=path.dirname(repo),driver=path.join(repo,"packages/chronodivide-bot-driver");
const root=path.join(project,ROOT_RELATIVE),read=p=>fs.readFileSync(p),json=p=>JSON.parse(read(p));
const required=k=>{assert.ok(process.env[k],k+" required");return process.env[k];};
const git=(...a)=>execFileSync("git",a,{cwd:repo,encoding:"utf8"}).trim();
const progress={phase:"startup",taskIndex:null,gameCreateRequests:0,gameCallbacksEntered:0,completedUpdates:0};
const write=(file,data)=>{rejectCompetitiveKeys(data);fs.writeFileSync(file,JSON.stringify(data,null,2)+"\n",{flag:"wx",mode:0o600});};
const sealed=(dir,name,marker)=>{
 fs.readdirSync(dir);assert.equal(read(path.join(dir,"COMPLETE")).toString().trim(),marker);
 const bytes=read(path.join(dir,name+".json"));assert.equal(hash(bytes),read(path.join(dir,name+".sha256")).toString().trim().split(/\s+/)[0]);return JSON.parse(bytes);
};
async function main(){
 const mode=process.argv[2];assert.ok(["prepare","init","smoke","cell","finalize"].includes(mode));progress.phase=mode;
 assert.equal(git("branch","--show-current"),"main");assert.equal(git("status","--porcelain"),"");
 const sourceCommit=git("rev-parse","HEAD");assert.equal(sourceCommit,git("rev-parse","fork/main"));
 const require=createRequire(path.join(driver,"package.json")),runtime=fs.realpathSync(require.resolve("@chronodivide/game-api"));
 const files={
  program:fileURLToPath(import.meta.url),core:path.join(repo,"research/runtime/combatant-owned-ledger-gate-v1.mjs"),
  protocol:path.join(repo,"research/protocols/maps/2026-09-03-combatant-owned-lifecycle-gate-v1.md"),
  runtime,loader:path.join(repo,"research/runtime/explicit-start-loader-v1.mjs"),transform:path.join(repo,"research/runtime/explicit-start-transform-v1.mjs"),
  seedHelper:path.join(driver,"dist/benchmark/seededOfflineGame.js"),candidate:path.join(driver,"dist/training/liveOwnedBuildingSnapshotCandidate.js"),
  legacy:path.join(driver,"dist/training/literalBuildingEliminationEndpoint.js"),package:path.join(driver,"package.json"),lockfile:path.join(driver,"pnpm-lock.yaml"),
 };
 const fileHashes=Object.fromEntries(Object.entries(files).map(([k,p])=>[k,hash(read(p))]));
 assert.equal(fileHashes.protocol,PROTOCOL_SHA256);
 assert.equal(fileHashes.runtime,"dd398f5c8c2b4c3e3d6eb0f9ca6d7549bf70fee16c5950cd8902616ac922497d");
 assert.equal(fileHashes.candidate,"9e6abc6d3ae2833c8c48377dc10e4349c1e788c8b87f8c4b32b77a6ada2ce6f7");
 assert.equal(fileHashes.legacy,"51abc0ae861322841d03971b26c709cbea5f9a4ceed4b1b827aec205adfda578");
 const a3File=path.join(project,"research-evidence/live-building-ledger/neutral-probe-v1-scouting-a3/finalizer/aggregate.json");
 assert.equal(hash(read(a3File)),"9e3d788a97e1b078ce93b03fc20af9af065e83fe60a78fcc20ddf733a750581a");assert.equal(json(a3File).passed,true);
 const oldManifestFile=path.join(project,"research-evidence/live-building-ledger/neutral-probe-v1-materialization-a1/manifest.json");
 const oldManifestSha256=hash(read(oldManifestFile));assert.equal(oldManifestSha256,"1a005ed67327b38d0f95d0ae30f18440804674fca18b9d30c4d1d42728d29b3b");
 const oldManifest=json(oldManifestFile),identity={sourceCommit,fileHashes,parentA3Sha256:hash(read(a3File)),parentAssetManifestSha256:oldManifestSha256};
 if(mode==="prepare"){
  assert.ok(!fs.existsSync(root),"Preserve existing gate root; never prepare twice");
  const template=read(path.join(driver,"data/simple-1v1-no-preview.map"));assert.equal(hash(template),TEMPLATE_SHA256);
  for(const e of oldManifest.assetEntries){const p=path.join(oldManifest.assets,e.name);assert.ok(fs.lstatSync(p).isFile());assert.equal(hash(read(p)),e.sha256);}
  const assets=path.join(root,"assets");fs.mkdirSync(assets,{recursive:true,mode:0o700});
  const assetEntries=oldManifest.assetEntries.map(e=>{
   const from=path.join(oldManifest.assets,e.name),to=path.join(assets,e.name);let materialization="hardlink";
   try{fs.linkSync(from,to);}catch(error){if(error.code!=="EXDEV")throw error;fs.copyFileSync(from,to,fs.constants.COPYFILE_EXCL);materialization="copy";}
   return {...e,materialization};
  });
  const maps=[false,true].map(rubble=>{
   const name="chrono_owned_ledger_"+Number(rubble)+".map",bytes=fixtureMap(template.toString(),rubble);
   fs.writeFileSync(path.join(assets,name),bytes,{flag:"wx",mode:0o600});return {name,rubble,sha256:hash(bytes)};
  });
  write(path.join(root,"manifest.json"),{kind:"combatant-owned-gate-v1-manifest",...identity,assets,assetEntries,maps,tasks,smokeIndices:SMOKE_INDICES,
   maxUpdates:MAX_UPDATES,actionTick:ACTION_TICK,actors:ACTORS,sourceTemplateSha256:TEMPLATE_SHA256,
   resources:{account:"pi_jss233",partition:"day",cpusPerJob:1,memoryGiB:4,maxConcurrentCells:8,cellMinutes:30,smokeMinutes:60,
    maxTechnicalGames:45,maxGameUpdates:324000,estimatedTypicalCpuHours:1,scheduledCpuHourUpperBound:22,
    estimatedCompressedStorageMiB:256,estimatedUncompressedStorageUpperBoundMiB:5760,assetBytesCopiedOnlyOnCrossDevice:true}});
  console.log(JSON.stringify({prepared:true,root,manifestSha256:hash(read(path.join(root,"manifest.json"))),...identity}));return;
 }
 assert.equal(required("SLURM_JOB_ACCOUNT"),"pi_jss233");assert.equal(process.version,"v20.13.1");
 assert.equal(sourceCommit,required("SOURCE_COMMIT"));assert.equal(fileHashes.program,required("PROGRAM_SHA256"));
 const manifestBytes=read(path.join(root,"manifest.json")),manifest=JSON.parse(manifestBytes),manifestSha256=hash(manifestBytes);
 assert.equal(manifestSha256,required("MANIFEST_SHA256"));assert.equal(manifest.sourceCommit,sourceCommit);assert.deepEqual(manifest.fileHashes,fileHashes);
 assert.equal(manifest.parentA3Sha256,identity.parentA3Sha256);assert.equal(manifest.parentAssetManifestSha256,oldManifestSha256);
 assert.deepEqual(manifest.tasks,tasks);assert.deepEqual(manifest.smokeIndices,SMOKE_INDICES);
 for(const e of [...manifest.assetEntries,...manifest.maps]){
  const file=path.join(manifest.assets,e.name);assert.ok(fs.lstatSync(file).isFile());assert.equal(hash(read(file)),e.sha256);
 }
 const jobId=required("SLURM_JOB_ID"),outDir=required("OUT_DIR");
 const context={...identity,manifestSha256,scheduler:{jobId,account:"pi_jss233",partition:"day",arrayJobId:process.env.SLURM_ARRAY_JOB_ID??null},nodeVersion:process.version};
 const {Bot,cdapi,ApiEventType,ObjectType,OrderType}=await import(pathToFileURL(runtime));
 for(const [k,v]of Object.entries(ORDER))assert.equal(OrderType[k],v);
 for(const [k,v]of Object.entries(TYPE))assert.equal(ObjectType[k],v);
 assert.equal(globalThis[Symbol.for("chrono.research.explicit-start.v1")]?.originalSha256,fileHashes.runtime);
 const {transformExplicitStartRuntime}=await import("../runtime/explicit-start-transform-v1.mjs");
 assert.equal(hash(transformExplicitStartRuntime(read(runtime))),"4ad4a5dd7a6a8ae53a7e671a29d7dd0a5fbad1916d94e52c69c9eda133a30f0c");
 progress.phase="asset-init";await cdapi.init(manifest.assets);
 for(const m of manifest.maps)assert.ok(cdapi.getAvailableGameModes(m.name).length>0);
 if(mode==="init"){
  write(path.join(outDir,"init.json"),{kind:"combatant-owned-init-v1",complete:true,passed:true,...context,gameCreateRequests:0,gameCallbacksEntered:0,updates:0,regularAssets:manifest.assetEntries.length});return;
 }
 const checkParent=a=>{assert.equal(a.complete,true);assert.equal(a.passed,true);assert.equal(a.sourceCommit,sourceCommit);assert.equal(a.manifestSha256,manifestSha256);assert.deepEqual(a.fileHashes,fileHashes);assert.equal(a.scheduler.account,"pi_jss233");assert.equal(a.scheduler.partition,"day");};
 const init=sealed(path.join(root,"init"),"init","COMPLETE_OWNED_GATE_INIT_V1");checkParent(init);assert.equal(init.gameCreateRequests,0);assert.equal(init.gameCallbacksEntered,0);assert.equal(init.updates,0);
 if(["cell","finalize"].includes(mode)){
  const smoke=sealed(path.join(root,"smoke"),"smoke","COMPLETE_OWNED_GATE_SMOKE_V1");checkParent(smoke);
  assert.deepEqual(smoke.cases.map(c=>c.task.taskIndex),SMOKE_INDICES);
 }
 const {withSeededOfflineGame}=await import(pathToFileURL(files.seedHelper));
 const endpoint=await import(pathToFileURL(files.legacy));
 const {snapshotLiveOwnedBuildingsCandidate}=await import(pathToFileURL(files.candidate));
 const verifyCase=(caseDir,task)=>{
  const a=json(path.join(caseDir,"case.json"));assert.equal(a.complete,true);assert.deepEqual(a.task,task);assert.equal(a.sourceCommit,sourceCommit);assert.deepEqual(a.fileHashes,fileHashes);
  assert.equal(a.manifestSha256,manifestSha256);assert.equal(a.scheduler.account,"pi_jss233");assert.equal(a.scheduler.partition,"day");
  const records=decodeRecords(read(path.join(caseDir,a.stream.file)),a.stream),analysis=analyzeRecords(records,task,endpoint.evaluateLiteralBuildingUpdate);
  assert.deepEqual(analysis,a.analysis);rejectCompetitiveKeys(a);return a;
 };
 async function runCase(task,caseDir){
  Object.assign(progress,{phase:"case-setup",taskIndex:task.taskIndex,completedUpdates:0});
  const records=[],preparationEvents=[];let currentFrame=null,targetId=null,updates=0,stopReason="horizon",lastFinished=false,activeGame=null;
  const map=manifest.maps.find(m=>m.rubble===task.rubble);
  const ownUnits=(api,name)=>api.getVisibleUnits(name,"self").map(id=>api.getUnitData(id)).filter(Boolean).map(u=>({id:u.id,rule:u.rules.name,type:u.rules.type,hp:u.hitPoints,rx:u.tile.rx,ry:u.tile.ry})).sort((a,b)=>a.id-b.id);
  let api;
  const target=()=>{
   if(targetId===null)return null;const u=api.getGameObjectData(targetId);
   return u?{id:u.id,owner:u.owner,hp:u.hitPoints,rx:u.tile.rx,ry:u.tile.ry,inWorld:true}:null;
  };
  const snapshot=()=>({legacy:endpoint.snapshotCombatantBuildings(api,labels(task)),live:snapshotLiveOwnedBuildingsCandidate(api,labels(task)),target:target()});
  const observe=tag=>({tag,update:updates,gameTick:api.getCurrentTick(),target:target(),views:Object.fromEntries(Object.entries(ACTORS).map(([role,name])=>[role,{visible:api.getVisibleUnits(name,"hostile").includes(targetId),own:ownUnits(api,name)}]))});
  class Actor extends Bot{
   constructor(role,country){super(ACTORS[role],country);this.role=role;this.oneOff=false;this.expected=[];}
   onGameStart(gameApi){
    this.api=gameApi;const actionApi=this.player.actions;
    for(const method of Object.getOwnPropertyNames(Object.getPrototypeOf(actionApi))){
     if(method==="constructor"||typeof actionApi[method]!=="function")continue;const original=actionApi[method].bind(actionApi);
     Object.defineProperty(actionApi,method,{configurable:true,value:(...args)=>{
      const request=normalizeAction(method,args);assert.ok(currentFrame,"Action outside recorded update");
      assert.deepEqual(request,this.expected.shift(),"Non-declared actor action");
      currentFrame.actions.push({role:this.role,tick:gameApi.getCurrentTick(),...request});
      if(["sell","quit"].includes(request.kind))this.oneOff=true;
      return original(...args);
     }});
    }
   }
   onGameEvent(event){
    if(this.role!=="attacker"||!currentFrame)return;
    const e=endpoint.toEndpointEvent(event);if(e)currentFrame.events.push(e);
   }
   onGameTick(gameApi){
    assert.ok(currentFrame,"Tick outside recorded update");
    const view={role:this.role,tick:gameApi.getCurrentTick(),own:ownUnits(gameApi,this.name),target:target(),visible:gameApi.getVisibleUnits(this.name,"hostile").includes(targetId)};
    currentFrame.views.push(view);const requests=planActions(view,task.scenario,this.oneOff);
    this.expected=requests.slice();for(const r of requests)dispatchAction(this.player.actions,r);
    assert.equal(this.expected.length,0);
   }
  }
  const attacker=new Actor("attacker","Americans"),owner=new Actor("owner","Russians");
  attacker.chronoResearchStartPos=task.orientation;owner.chronoResearchStartPos=1-task.orientation;
  const settings={online:false,agents:task.orientation===0?[attacker,owner]:[owner,attacker],mapName:map.name,gameMode:cdapi.getAvailableGameModes(map.name)[0],
   shortGame:false,mcvRepacks:true,cratesAppear:false,superWeapons:false,gameSpeed:6,credits:10000,unitCount:10,buildOffAlly:false,multiEngineer:false};
  let stream;
  try{
   progress.phase="create-game";progress.gameCreateRequests++;
   await withSeededOfflineGame(cdapi,settings,task.seed,[{agent:attacker,identity:"fixture-attacker"},{agent:owner,identity:"fixture-owner"}],async game=>{
    activeGame=game;progress.gameCallbacksEntered++;api=attacker.api;assert.ok(api);assert.equal(api.getCurrentTick(),0);
    const starts=["37,63","62,39"],point=p=>p.x+","+p.y;
    assert.equal(point(api.getPlayerData(attacker.name).startLocation),starts[task.orientation]);assert.equal(point(api.getPlayerData(owner.name).startLocation),starts[1-task.orientation]);
    const targets=api.getNeutralUnits(r=>r.type===ObjectType.Building&&r.name==="GAPOWR");assert.equal(targets.length,1);targetId=targets[0];
    const targetUnit=api.getUnitData(targetId);assert.equal(targetUnit.owner,NEUTRAL);assert.equal(targetUnit.hitPoints,100);
    assert.equal(targetUnit.rules.capturable,true);assert.equal(targetUnit.rules.returnable,false);assert.equal(targetUnit.rules.leaveRubble,task.rubble);
    assert.equal(targetUnit.tile.rx,50);assert.equal(targetUnit.tile.ry,50);
    const initialUnits={attacker:ownUnits(api,attacker.name),owner:ownUnits(api,owner.name)};validateInitialUnits(initialUnits);
    records.push({kind:"initial",schemaVersion:1,update:0,gameTick:0,actors:ACTORS,targetId,seed:task.seed,scenario:task.scenario,initialUnits,
     targetRules:{capturable:true,returnable:false,leaveRubble:targetUnit.rules.leaveRubble},state:snapshot(),observation:observe("fixed")});
    while(updates<MAX_UPDATES){
     const beforeTick=api.getCurrentTick();progress.phase="pre-observation";const pre=snapshot();
     if(beforeTick===ACTION_TICK){
      const checks=readiness(pre,preparationEvents,targetId);records.push({kind:"readiness",update:updates,gameTick:beforeTick,state:pre,checks,observation:observe("action_boundary")});
      if(!Object.values(checks).every(Boolean)){stopReason="readiness_failed";break;}
     }
     if(game.isFinished()){lastFinished=true;stopReason="unexpected_finish";break;}
     currentFrame={kind:"update",update:updates+1,gameTickBefore:beforeTick,pre,views:[],actions:[],events:[]};
     progress.phase="game-update";await game.update();updates++;progress.completedUpdates=updates;
     progress.phase="post-observation";currentFrame.gameTickAfter=api.getCurrentTick();currentFrame.post=snapshot();lastFinished=game.isFinished();currentFrame.gameFinishedAfter=lastFinished;
     if(currentFrame.gameTickBefore<ACTION_TICK)preparationEvents.push(...currentFrame.events);
     const transition=isTargetTransition(currentFrame,targetId);
     if([120,300,600,1200,1799].includes(updates)||transition)currentFrame.observation=observe(transition?"transition_boundary":"fixed");
     records.push(currentFrame);currentFrame=null;
     if(transition){stopReason="target_transition";break;}
     if(lastFinished){stopReason="unexpected_finish";break;}
    }
    records.push({kind:"stop",update:updates,reason:stopReason,gameFinished:lastFinished});activeGame=null;
   });
   progress.phase="compress-stream";stream=encodeRecords(records);fs.writeFileSync(path.join(caseDir,"trace.jsonl.gz"),stream.compressed,{flag:"wx",mode:0o600});
   const streamMeta={file:"trace.jsonl.gz",encoding:"gzip-jsonl-v1",plainSha256:stream.plainSha256,gzipSha256:stream.gzipSha256,recordCount:stream.recordCount,plainBytes:stream.plain.length,gzipBytes:stream.compressed.length};
   const decoded=decodeRecords(read(path.join(caseDir,streamMeta.file)),streamMeta);
   progress.phase="replay-adjudication";const analysis=analyzeRecords(decoded,task,endpoint.evaluateLiteralBuildingUpdate);
   const artifact={kind:"combatant-owned-case-v1",complete:true,...context,task,map,settings:{...settings,agents:settings.agents.map(a=>a.name)},stream:streamMeta,analysis};
   write(path.join(caseDir,"case.json"),artifact);return artifact;
  }catch(error){
   if(records.length&&!stream){
    if(records.at(-1).kind!=="stop")records.push({kind:"stop",update:updates,reason:"technical_error",gameFinished:lastFinished});
    const partial=encodeRecords(records);fs.writeFileSync(path.join(caseDir,"partial-trace.jsonl.gz"),partial.compressed,{flag:"wx",mode:0o600});
   }
   throw error;
  }
 }
 if(mode==="smoke"){
  const cases=[];
  for(const index of SMOKE_INDICES){
   const dir=path.join(outDir,"case-"+String(index).padStart(3,"0"));assert.ok(!fs.existsSync(dir));fs.mkdirSync(dir,{mode:0o700});
   await runCase(tasks[index],dir);cases.push(verifyCase(dir,tasks[index]));
  }
  write(path.join(outDir,"smoke.json"),{kind:"combatant-owned-smoke-v1",complete:true,passed:cases.every(c=>c.analysis.passed),...context,cases});
  console.log(JSON.stringify({complete:true,passed:cases.every(c=>c.analysis.passed),cases:5}));return;
 }
 if(mode==="cell"){
  const index=Number(required("SLURM_ARRAY_TASK_ID"));assert.ok(Number.isSafeInteger(index)&&index>=0&&index<40);
  const result=await runCase(tasks[index],outDir);console.log(JSON.stringify({complete:true,caseIndex:index,passed:result.analysis.passed}));return;
 }
 const array=required("ARRAY_JOB_ID"),raw=execFileSync("/opt/slurm/current/bin/sacct",["-X","-j",array,"-n","-P","--format=JobID,JobIDRaw,Account,Partition,State,ExitCode,Restarts"],{encoding:"utf8"}).trim();
 const jobs=new Map();
 for(const line of raw.split("\n")){
  const [label,id,account,partition,state,exit,restarts]=line.split("|"),match=new RegExp("^"+array+"_(\\d+)$").exec(label);if(!match)continue;
  assert.equal(account,"pi_jss233");assert.equal(partition,"day");assert.equal(state,"COMPLETED");assert.equal(exit,"0:0");assert.equal(restarts,"0");
  assert.ok(!jobs.has(+match[1]));jobs.set(+match[1],id);
 }
 assert.equal(jobs.size,40);assert.equal(new Set(jobs.values()).size,40);
 const cases=tasks.map(task=>{
  const dir=path.join(root,"cells/task-"+String(task.taskIndex).padStart(3,"0"));
  const artifact=sealed(dir,"case","COMPLETE_OWNED_GATE_CELL_V1"),replayed=verifyCase(dir,task);assert.deepEqual(artifact,replayed);
  assert.equal(artifact.scheduler.jobId,jobs.get(task.taskIndex));assert.equal(artifact.scheduler.arrayJobId,array);return artifact;
 });
 const recordedSmoke=sealed(path.join(root,"smoke"),"smoke","COMPLETE_OWNED_GATE_SMOKE_V1");
 for(const c of recordedSmoke.cases){const replayed=verifyCase(path.join(root,"smoke/case-"+String(c.task.taskIndex).padStart(3,"0")),c.task);assert.deepEqual(c,replayed);}
 const smokeMatchesFull=recordedSmoke.cases.every(c=>c.stream.plainSha256===cases[c.task.taskIndex].stream.plainSha256);
 const groups=[];
 for(let i=0;i<40;i+=4){const group=cases.slice(i,i+4);groups.push({scenario:group[0].task.scenario,orientation:group[0].task.orientation,identicalAcrossLabelsAndRepeats:new Set(group.map(c=>c.stream.plainSha256)).size===1});}
 const passed=cases.every(c=>c.analysis.passed)&&groups.every(g=>g.identicalAcrossLabelsAndRepeats)&&smokeMatchesFull;
 write(path.join(outDir,"aggregate.json"),{kind:"combatant-owned-aggregate-v1",complete:true,passed,...context,arrayJobId:array,taskJobIds:Object.fromEntries(jobs),smokeMatchesFull,groups,cases});
 console.log(JSON.stringify({complete:true,passed,cases:40}));
}
main().catch(error=>{
 const failure={kind:"combatant-owned-technical-failure-v1",technicalError:error?.message??String(error),cause:error?.cause?.message??null,
  progress:{...progress},frames:String(error?.stack??"").split("\n").filter(l=>l.length<700&&/^\s*at /.test(l)).slice(0,10)};
 console.error(JSON.stringify(failure));
 if(process.env.OUT_DIR)try{write(path.join(process.env.OUT_DIR,"failure.json"),failure);}catch{}
 process.exitCode=1;
});
