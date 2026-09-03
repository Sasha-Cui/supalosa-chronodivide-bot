import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {fileURLToPath,pathToFileURL} from "node:url";
import {execFileSync} from "node:child_process";
import {hash,tasks,SMOKE_INDICES,decodeRecords,analyzeRecords,rejectCompetitiveKeys} from "../runtime/combatant-owned-ledger-gate-v1.mjs";
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../.."),project=path.dirname(repo);
const root=path.join(project,"research-evidence/live-building-ledger/combatant-owned-gate-v1-callback-a1");
const output=path.join(repo,"research/results/2026-09-03-combatant-owned-gate-a1-audit"),read=p=>fs.readFileSync(p);
const sealed=(dir,name,marker)=>{
 fs.readdirSync(dir);assert.equal(read(path.join(dir,"COMPLETE")).toString().trim(),marker);
 const bytes=read(path.join(dir,name+".json")),sha=hash(bytes);assert.equal(sha,read(path.join(dir,name+".sha256")).toString().trim().split(/\s+/)[0]);
 return {data:JSON.parse(bytes),sha};
};
const manifestBytes=read(path.join(root,"manifest.json")),m=JSON.parse(manifestBytes),manifestSha256=hash(manifestBytes);
assert.equal(manifestSha256,"b5416fccaef433d6d07376c49c51b987b78a11eacf6a7be2020d4ce7c43f1e0f");
assert.equal(m.sourceCommit,"7dc09b2ada90cb896d0de58f18f935d861cbf12c");assert.deepEqual(m.tasks,tasks);assert.deepEqual(m.smokeIndices,SMOKE_INDICES);
const aggregate=sealed(path.join(root,"finalizer"),"aggregate","COMPLETE_OWNED_GATE_AGGREGATE_V1");
assert.equal(aggregate.sha,"0f8525c2874c8fc99c04ba121687e03c76a1a3a86675b80d95b4af75c79034ba");
const a=aggregate.data;assert.equal(a.complete,true);assert.equal(a.passed,true);assert.equal(a.cases.length,40);
assert.equal(a.arrayJobId,"24647816");assert.equal(a.scheduler.jobId,"24647817");assert.equal(a.smokeMatchesFull,true);
const bindings={
 program:"research/scripts/combatant-owned-ledger-gate-v1.mjs",core:"research/runtime/combatant-owned-ledger-gate-v1.mjs",
 protocol:"research/protocols/maps/2026-09-03-combatant-owned-lifecycle-gate-v1.md",
 timingProtocol:"research/protocols/maps/2026-09-03-combatant-owned-lifecycle-callback-amendment-a1.md",
 runtime:"packages/chronodivide-bot-driver/node_modules/@chronodivide/game-api/dist/index.js",
 loader:"research/runtime/explicit-start-loader-v1.mjs",transform:"research/runtime/explicit-start-transform-v1.mjs",
 seedHelper:"packages/chronodivide-bot-driver/dist/benchmark/seededOfflineGame.js",
 candidate:"packages/chronodivide-bot-driver/dist/training/liveOwnedBuildingSnapshotCandidate.js",
 legacy:"packages/chronodivide-bot-driver/dist/training/literalBuildingEliminationEndpoint.js",
 package:"packages/chronodivide-bot-driver/package.json",lockfile:"packages/chronodivide-bot-driver/pnpm-lock.yaml",
};
for(const [k,p]of Object.entries(bindings))assert.equal(hash(read(path.join(repo,p))),m.fileHashes[k]);
for(const item of [...m.assetEntries,...m.maps]){const p=path.join(m.assets,item.name);assert.ok(fs.lstatSync(p).isFile());assert.equal(hash(read(p)),item.sha256);}
const sameIdentity=c=>{
 assert.equal(c.complete,true);assert.equal(c.sourceCommit,m.sourceCommit);assert.deepEqual(c.fileHashes,m.fileHashes);assert.equal(c.manifestSha256,manifestSha256);
 for(const key of ["parentA3Sha256","parentAssetManifestSha256","parentFailedAttemptManifestSha256"])assert.equal(c[key],m[key]);
 assert.equal(c.scheduler.account,"pi_jss233");assert.equal(c.scheduler.partition,"day");assert.equal(c.nodeVersion,"v20.13.1");rejectCompetitiveKeys(c);
};
sameIdentity(a);
const init=sealed(path.join(root,"init"),"init","COMPLETE_OWNED_GATE_INIT_V1"),smoke=sealed(path.join(root,"smoke"),"smoke","COMPLETE_OWNED_GATE_SMOKE_V1");
sameIdentity(init.data);sameIdentity(smoke.data);assert.equal(init.data.passed,true);assert.equal(smoke.data.passed,true);
assert.equal(init.data.scheduler.jobId,"24647674");assert.equal(smoke.data.scheduler.jobId,"24647675");
assert.equal(init.data.gameCreateRequests,0);assert.equal(init.data.gameCallbacksEntered,0);assert.equal(init.data.updates,0);
assert.deepEqual(smoke.data.cases.map(c=>c.task.taskIndex),SMOKE_INDICES);
const raw=execFileSync("/opt/slurm/current/bin/sacct",["-X","-j","24647674,24647675,24647816,24647817","-n","-P","--format=JobID,JobIDRaw,Account,Partition,State,ExitCode,Restarts,ElapsedRaw,AllocCPUS"],{encoding:"utf8"}).trim();
const scheduler=raw.split("\n").map(line=>{const [label,jobId,account,partition,state,exit,restarts,elapsedSeconds,cpus]=line.split("|");return {label,jobId,account,partition,state,exit,restarts:Number(restarts),elapsedSeconds:Number(elapsedSeconds),cpus:Number(cpus)};});
assert.equal(scheduler.length,43);assert.equal(new Set(scheduler.map(s=>s.jobId)).size,43);
for(const s of scheduler){assert.equal(s.account,"pi_jss233");assert.equal(s.partition,"day");assert.equal(s.state,"COMPLETED");assert.equal(s.exit,"0:0");assert.equal(s.restarts,0);assert.equal(s.cpus,1);}
const jobFor=i=>scheduler.find(s=>s.label==="24647816_"+i)?.jobId;
const endpoint=await import(pathToFileURL(path.join(repo,bindings.legacy)));
const replay=(dir,c)=>{
 sameIdentity(c);assert.deepEqual(c.task,tasks[c.task.taskIndex]);assert.deepEqual(c.map,m.maps.find(p=>p.rubble===c.task.rubble));
 const bytes=read(path.join(dir,c.stream.file));assert.equal(bytes.length,c.stream.gzipBytes);
 const records=decodeRecords(bytes,c.stream);assert.equal(records[0].schemaVersion,2);
 const calculated=analyzeRecords(records,c.task,endpoint.evaluateLiteralBuildingUpdate);assert.deepEqual(calculated,c.analysis);assert.equal(calculated.passed,true);
 return {records:records.length,analysis:calculated};
};
for(const c of smoke.data.cases){const dir=path.join(root,"smoke/case-"+String(c.task.taskIndex).padStart(3,"0"));assert.deepEqual(JSON.parse(read(path.join(dir,"case.json"))),c);replay(dir,c);}
const cases=[];
for(let i=0;i<40;i++){
 const dir=path.join(root,"cells/task-"+String(i).padStart(3,"0")),cell=sealed(dir,"case","COMPLETE_OWNED_GATE_CELL_V1"),c=cell.data;
 assert.deepEqual(c,a.cases[i]);assert.equal(c.task.taskIndex,i);assert.equal(c.scheduler.jobId,jobFor(i));assert.equal(c.scheduler.jobId,a.taskJobIds[i]);assert.equal(c.scheduler.arrayJobId,"24647816");
 const result=replay(dir,c),e=result.analysis.attributionAtTransition;
 cases.push({taskIndex:i,scenario:c.task.scenario,orientation:c.task.orientation,attackerLabelIndex:c.task.attackerLabelIndex,repeat:c.task.repeat,seed:c.task.seed,
  jobId:c.scheduler.jobId,passed:result.analysis.passed,updates:result.analysis.updates,transitionUpdate:result.analysis.transitionUpdate,
  attackerAttributed:e.attackerAttributed,ownerAttributed:e.ownerAttributed,legacyAttackerAttributed:e.legacyAttackerAttributed,legacyOwnerAttributed:e.legacyOwnerAttributed,
  recordCount:result.records,plainBytes:c.stream.plainBytes,gzipBytes:c.stream.gzipBytes,caseSha256:cell.sha,streamPlainSha256:c.stream.plainSha256,streamGzipSha256:c.stream.gzipSha256});
}
const groups=[];
for(let i=0;i<40;i+=4){const g=cases.slice(i,i+4);const identical=new Set(g.map(c=>c.streamPlainSha256)).size===1;assert.equal(identical,true);
 groups.push({scenario:g[0].scenario,orientation:g[0].orientation,identicalAcrossLabelsAndRepeats:identical});}
assert.deepEqual(groups,a.groups);
for(const c of smoke.data.cases)assert.equal(c.stream.plainSha256,cases[c.task.taskIndex].streamPlainSha256);
const summaries=[...new Set(cases.map(c=>c.scenario))].map(scenario=>{
 const rows=cases.filter(c=>c.scenario===scenario);assert.equal(rows.length,8);
 return {scenario,cases:rows.length,passed:rows.filter(c=>c.passed).length,strictAttackerAttributions:rows.filter(c=>c.attackerAttributed).length,
  strictOwnerAttributions:rows.filter(c=>c.ownerAttributed).length,legacyAttackerAttributions:rows.filter(c=>c.legacyAttackerAttributed).length,
  legacyOwnerAttributions:rows.filter(c=>c.legacyOwnerAttributed).length,transitionUpdates:[...new Set(rows.map(c=>c.transitionUpdate))].join(";")};
});
const csv=rows=>{const keys=Object.keys(rows[0]),q=v=>'"'+String(v??"").replaceAll('"','""')+'"';return [keys,...rows.map(r=>keys.map(k=>r[k]))].map(r=>r.map(q).join(",")).join("\n")+"\n";};
fs.mkdirSync(output,{recursive:true});
const outputs={"cases.csv":csv(cases),"scenarios.csv":csv(summaries),"scheduler.csv":csv(scheduler)};
for(const [file,text]of Object.entries(outputs))fs.writeFileSync(path.join(output,file),text);
const validation={complete:true,passed:true,sourceCommit:m.sourceCommit,aggregateSha256:aggregate.sha,manifestSha256,initSha256:init.sha,smokeSha256:smoke.sha,
 auditScriptSha256:hash(read(fileURLToPath(import.meta.url))),fullCases:40,smokeCases:5,schedulerRecords:43,allStreamsDecompressedAndReplayed:true,
 allIdentitiesAndAssetBytesChecked:true,allMarkersAndChecksumsChecked:true,allGatesRecomputed:true,allTenLabelRepeatGroupsIdentical:true,smokeMatchesFull:true,
 cpuSeconds:scheduler.reduce((n,s)=>n+s.elapsedSeconds*s.cpus,0),fullCaseUpdates:cases.reduce((n,c)=>n+c.updates,0),
 compressedBytesFullCases:cases.reduce((n,c)=>n+c.gzipBytes,0),plainBytesFullCases:cases.reduce((n,c)=>n+c.plainBytes,0),
 limitation:"Controlled fixtures, two countries, two reciprocal start/slot orientations, deterministic repetitions. No policy-strength or historical incidence inference; no prior score changes.",
 outputs:Object.fromEntries(Object.entries(outputs).map(([file,text])=>[file,hash(text)]))};
fs.writeFileSync(path.join(output,"validation.json"),JSON.stringify(validation,null,2)+"\n");
console.log(JSON.stringify({complete:true,passed:true,aggregateSha256:aggregate.sha,summaries,cpuSeconds:validation.cpuSeconds,compressedBytes:validation.compressedBytesFullCases,output}));
