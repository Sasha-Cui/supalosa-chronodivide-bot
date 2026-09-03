import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import {fileURLToPath,pathToFileURL} from "node:url";
import {execFileSync} from "node:child_process";
import {tasks,probeChecks,rejectCompetitiveKeys} from "../runtime/neutral-building-ledger-probe-v1.mjs";
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../.."),project=path.dirname(repo);
const root=path.join(project,"research-evidence/live-building-ledger/neutral-probe-v1-scouting-a3");
const output=path.join(repo,"research/results/2026-09-03-neutral-ledger-a3-audit");
const read=p=>fs.readFileSync(p),hash=b=>crypto.createHash("sha256").update(b).digest("hex");
const sealed=(dir,name,marker)=>{
 fs.readdirSync(dir);assert.equal(read(path.join(dir,"COMPLETE")).toString().trim(),marker);
 const bytes=read(path.join(dir,name+".json")),sha=hash(bytes);
 assert.equal(sha,read(path.join(dir,name+".sha256")).toString().trim().split(/\s+/)[0]);
 return {value:JSON.parse(bytes),sha256:sha};
};
const manifestBytes=read(path.join(root,"manifest.json")),manifest=JSON.parse(manifestBytes),manifestSha256=hash(manifestBytes);
assert.equal(manifestSha256,"26575cb72a7733c179a7f35c1c39506d84f0b062c5c55ed61faa35d0c2f0f7fb");
const aggregate=sealed(path.join(root,"finalizer"),"aggregate","COMPLETE_NEUTRAL_LEDGER_AGGREGATE_V1");
assert.equal(aggregate.sha256,"9e3d788a97e1b078ce93b03fc20af9af065e83fe60a78fcc20ddf733a750581a");
const a=aggregate.value;
assert.equal(a.complete,true);assert.equal(a.passed,true);assert.equal(a.deterministic,true);
assert.deepEqual(manifest.tasks,tasks);assert.equal(a.traces.length,8);
const keys=["sourceCommit","programSha256","protocolSha256","runtimeSha256","candidatesSha256","legacySha256","coreSha256","assetManifestSha256","assetEntriesSha256"];
const verifyIdentity=t=>{assert.equal(t.manifestSha256,manifestSha256);for(const k of keys)assert.equal(t[k],manifest[k]);};
verifyIdentity(a);rejectCompetitiveKeys(a);
const bind={
 programSha256:"research/scripts/neutral-building-ledger-probe-v1.mjs",
 protocolSha256:"research/protocols/maps/2026-09-03-neutral-building-lifecycle-probe-scouting-a3.md",
 coreSha256:"research/runtime/neutral-building-ledger-probe-v1.mjs",
 candidatesSha256:"packages/chronodivide-bot-driver/dist/training/liveOwnedBuildingSnapshotCandidate.js",
 legacySha256:"packages/chronodivide-bot-driver/dist/training/literalBuildingEliminationEndpoint.js",
 runtimeSha256:"packages/chronodivide-bot-driver/node_modules/@chronodivide/game-api/dist/index.js",
};
for(const [key,file]of Object.entries(bind))assert.equal(hash(read(path.join(repo,file))),manifest[key]);
for(const item of [...manifest.assetEntries,...manifest.maps.map(m=>({name:m.name,sha256:m.sha256}))]){
 const file=path.join(manifest.assets,item.name);assert.ok(fs.lstatSync(file).isFile());assert.equal(hash(read(file)),item.sha256);
}
const init=sealed(path.join(root,"compatibility-init"),"init","COMPLETE_NEUTRAL_LEDGER_INIT_A1"),smoke=sealed(path.join(root,"compatibility-smoke"),"smoke","COMPLETE_NEUTRAL_LEDGER_SMOKE_A2");
verifyIdentity(init.value);verifyIdentity(smoke.value);
assert.equal(init.value.passed,true);assert.equal(init.value.gameInstances,0);assert.equal(init.value.updates,0);
assert.equal(smoke.value.passed,true);assert.deepEqual(smoke.value.traces.map(t=>t.task.taskIndex),[0,2]);
const raw=execFileSync("/opt/slurm/current/bin/sacct",["-X","-j","24643667,24643668,24643854,24643855","-n","-P","--format=JobID,JobIDRaw,Account,Partition,State,ExitCode,Restarts"],{encoding:"utf8"}).trim();
const scheduler=raw.split("\n").map(line=>{const [label,jobId,account,partition,state,exit,restarts]=line.split("|");return {label,jobId,account,partition,state,exit,restarts};});
assert.equal(scheduler.length,11);assert.equal(new Set(scheduler.map(x=>x.jobId)).size,11);
for(const s of scheduler){assert.equal(s.account,"pi_jss233");assert.equal(s.partition,"day");assert.equal(s.state,"COMPLETED");assert.equal(s.exit,"0:0");assert.equal(s.restarts,"0");}
const jobFor=i=>scheduler.find(s=>s.label==="24643854_"+i)?.jobId;
assert.equal(a.scheduler.arrayJobId,"24643854");assert.equal(a.scheduler.finalizerJobId,"24643855");assert.equal(a.scheduler.account,"pi_jss233");
const endpoint=await import(pathToFileURL(path.join(repo,bind.legacySha256)));
const rows=[],cellHashes={};
for(let i=0;i<8;i++){
 const cell=sealed(path.join(root,"cells/task-"+i),"trace","COMPLETE_NEUTRAL_LEDGER_TRACE_V1"),t=cell.value,r=t.result;
 assert.deepEqual(t,a.traces[i]);assert.equal(t.complete,true);verifyIdentity(t);rejectCompetitiveKeys(t);
 assert.deepEqual(t.task,tasks[i]);assert.deepEqual(t.map,manifest.maps.find(m=>m.rubble===t.task.rubble));
 assert.equal(t.jobId,jobFor(i));assert.equal(t.jobId,a.scheduler.taskJobIds[i]);assert.equal(t.schedulerAccount,"pi_jss233");assert.equal(t.nodeVersion,"v20.13.1");
 assert.equal(r.updates,6000);assert.equal(r.boundaries.length,1);const b=r.boundaries[0];
 const target=b.pre.live.find(x=>x.rulesName==="GAPOWR"&&x.owner==="@@NEUTRAL@@");assert.ok(target);assert.ok(target.hitPoints>0);
 assert.equal(b.updates,i<4?399:350);assert.equal(b.events.length,2);
 assert.ok(b.events.some(e=>e.type===3&&e.target===target.id&&e.attackerPlayerName==="FixtureAttacker"));
 assert.ok(b.events.some(e=>e.type===2&&e.target===target.id));
 const opts={tick:b.updates,combatants:{candidate:"FixtureAttacker",baseline:"@@NEUTRAL@@"},events:b.events,establishedBeforeUpdate:{candidate:true,baseline:true}};
 const live=endpoint.evaluateLiteralBuildingUpdate({...opts,pre:b.pre.live,post:b.post.live});
 const legacy=endpoint.evaluateLiteralBuildingUpdate({...opts,pre:b.pre.legacy,post:b.post.legacy});
 assert.equal(live.candidatePhysicalWin,b.strictAttributionRecognized);assert.equal(legacy.candidatePhysicalWin,b.legacyAttributionRecognized);
 assert.equal(live.candidatePhysicalWin,true);assert.equal(legacy.candidatePhysicalWin,!t.task.rubble);
 const checks=probeChecks({updates:r.updates,earlyFinish:false,attacks:r.attackActions,destroyEvents:r.destroyEvents,boundaries:r.boundaries,task:t.task,targetId:target.id,initialOwner:target.owner,attackerName:"FixtureAttacker",destroyType:3,unspawnType:2});
 checks.visibleBeforeAttack=r.firstTargetVisibleTick!==null&&r.firstAttackTick!==null&&r.firstTargetVisibleTick<=r.firstAttackTick;
 checks.noHiddenAttackRequest=r.hiddenAttackRequests===0;checks.fixedObservations=r.observations.length===8;
 assert.deepEqual(checks,r.checks);assert.ok(Object.values(checks).every(v=>v===true));
 assert.deepEqual(r.observations.map(o=>o.updates),[0,120,180,300,600,1200,2400,6000]);
 assert.equal(r.observations[0].targetVisible,false);assert.equal(r.observations[3].targetVisible,true);
 assert.ok(r.firstTargetVisibleTick<r.firstAttackTick&&r.firstAttackTick<b.updates);
 for(const o of r.observations.filter(o=>o.updates>b.updates)){
  if(t.task.rubble){assert.equal(o.target.id,target.id);assert.equal(o.target.hp,0);}else assert.equal(o.target,null);
 }
 cellHashes[i]=cell.sha256;
 rows.push({taskIndex:i,orientation:t.task.orientation,rubble:t.task.rubble,repeat:t.task.repeat,seed:t.task.seed,jobId:t.jobId,updates:r.updates,firstVisibleTick:r.firstTargetVisibleTick,firstAttackTick:r.firstAttackTick,destructionUpdate:b.updates,scoutRequests:r.scoutActions,attackRequests:r.attackActions,targetInWorldAfter:b.targetInWorld,targetInOwnedAfter:b.targetInOwned,targetHealthAfter:b.targetHealth,legacyRecognized:b.legacyAttributionRecognized,candidateRecognized:b.strictAttributionRecognized,cellSha256:cell.sha256,traceSha256:r.traceSha256});
}
for(const i of [0,2,4,6])assert.equal(rows[i].traceSha256,rows[i+1].traceSha256);
for(const t of smoke.value.traces)assert.equal(t.result.traceSha256,rows[t.task.taskIndex].traceSha256);
const csv=rows=>{const keys=Object.keys(rows[0]),q=v=>'"'+String(v??"").replaceAll('"','""')+'"';return [keys,...rows.map(r=>keys.map(k=>r[k]))].map(r=>r.map(q).join(",")).join("\n")+"\n";};
fs.mkdirSync(output,{recursive:true});
const outputs={"cases.csv":csv(rows),"scheduler.csv":csv(scheduler)};
for(const [file,value]of Object.entries(outputs))fs.writeFileSync(path.join(output,file),value);
const validation={complete:true,passed:true,sourceCommit:manifest.sourceCommit,aggregateSha256:aggregate.sha256,manifestSha256,initSha256:init.sha256,smokeSha256:smoke.sha256,auditScriptSha256:hash(read(fileURLToPath(import.meta.url))),schedulerRecords:11,exactFullStageCases:8,allCellsAndMarkersVerified:true,allRuntimeAndAssetBytesVerified:true,allEventBoundaryAdjudicationsRecomputed:true,allStoredTechnicalChecksRecomputed:true,repeatHashesMatch:true,smokeMatchesFullStage:true,rawCellSha256:cellHashes,traceHashLimitation:"Full per-update streams were hashed during execution but not retained; their hashes are compared across repetitions, not independently rebuilt from the saved sparse observations.",scope:"Controlled neutral buildings only; no historical incidence estimate, rescoring, competitive strength result, or production endpoint promotion",outputs:Object.fromEntries(Object.entries(outputs).map(([f,s])=>[f,hash(s)]))};
fs.writeFileSync(path.join(output,"validation.json"),JSON.stringify(validation,null,2)+"\n");
console.log(JSON.stringify({complete:true,passed:true,cases:8,accountingRecords:11,aggregateSha256:aggregate.sha256,output}));
