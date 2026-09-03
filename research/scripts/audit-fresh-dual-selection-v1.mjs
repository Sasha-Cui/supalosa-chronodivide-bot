import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {fileURLToPath} from "node:url";
import {execFileSync} from "node:child_process";
import {hash,rejectOutcomeKeys} from "../runtime/fresh-dual-endpoint-plan-v1.mjs";
import {ROOT,REPO,read,json,loadPlanInputs} from "../runtime/fresh-dual-inputs-v1.mjs";
const prepared=json(path.join(ROOT,"plan.json")),current=loadPlanInputs();
assert.equal(hash(read(path.join(ROOT,"plan.json"))),"bd48c7d71d7eafe236d7747646c3c5a634976213affae1cef273526ace912f2b");
assert.deepEqual(prepared.plan,current.plan);assert.deepEqual(prepared.fileHashes,current.fileHashes);
const sealed=(dir,name,marker)=>{
 fs.readdirSync(dir);assert.equal(read(path.join(dir,"COMPLETE")).toString().trim(),marker);
 const bytes=read(path.join(dir,name+".json")),sha=hash(bytes);assert.equal(sha,read(path.join(dir,name+".sha256")).toString().trim().split(/\s+/)[0]);
 return {value:JSON.parse(bytes),sha};
};
const a=sealed(path.join(ROOT,"selection/finalizer"),"selection","COMPLETE_FRESH_DUAL_SELECTION_AGGREGATE_V1");
assert.equal(a.sha,"ca1641860595e7a15f1d6651e7ddc6a8f4f6f9e64382829c34d3f8f7efde7189");
const selection=a.value;assert.equal(selection.complete,true);assert.equal(selection.passed,true);assert.equal(selection.outcomeFree,true);
assert.equal(selection.selectedCaseCount,2160);assert.equal(selection.createdGameCount,2160);assert.equal(selection.updateCalls,0);assert.equal(selection.competitiveRunAuthorized,false);
assert.equal(selection.sourceCommit,"85762309a400cba376367b0f7799f3fce6b11c1c");assert.equal(selection.planningSourceCommit,prepared.sourceCommit);
const audit=sealed(path.join(ROOT,"audit"),"seed-audit","COMPLETE_FRESH_DUAL_SEED_AUDIT_V1");
assert.equal(audit.sha,"b3efca5e170585ec4c501cb11a7589ff8ec48fb99790c6a47d77d59fc6a32e4d");assert.equal(audit.value.passed,true);assert.equal(audit.value.errors.length,0);assert.equal(audit.value.collisions.length,0);
assert.equal(selection.auditSha256,audit.sha);assert.equal(selection.planFileSha256,hash(read(path.join(ROOT,"plan.json"))));assert.equal(selection.planSha256,prepared.planSha256);assert.deepEqual(selection.fileHashes,prepared.fileHashes);
assert.equal(selection.scheduler.jobId,"24651416");assert.equal(selection.arrayJobId,"24651415");rejectOutcomeKeys(selection);
const raw=execFileSync("/opt/slurm/current/bin/sacct",["-X","-j","24650637,24651415,24651416","-n","-P","--format=JobID,JobIDRaw,Account,Partition,State,ExitCode,Restarts,ElapsedRaw,AllocCPUS"],{encoding:"utf8"}).trim();
const scheduler=raw.split("\n").map(s=>{const [label,jobId,account,partition,state,exit,restarts,elapsedSeconds,cpus]=s.split("|");return {label,jobId,account,partition,state,exit,restarts:+restarts,elapsedSeconds:+elapsedSeconds,cpus:+cpus};});
assert.equal(scheduler.length,18);assert.equal(new Set(scheduler.map(s=>s.jobId)).size,18);
for(const s of scheduler){assert.equal(s.account,"pi_jss233");assert.equal(s.partition,"day");assert.equal(s.state,"COMPLETED");assert.equal(s.exit,"0:0");assert.equal(s.restarts,0);assert.equal(s.cpus,1);}
const blocks=[],cases=[];
for(let i=0;i<16;i++){
 const cell=sealed(path.join(ROOT,"selection/cells/block-"+String(i).padStart(2,"0")),"selection","COMPLETE_FRESH_DUAL_SELECTION_CELL_V1"),c=cell.value;
 assert.equal(c.complete,true);assert.equal(c.passed,true);assert.equal(c.outcomeFree,true);rejectOutcomeKeys(c);
 assert.equal(c.scheduler.jobId,scheduler.find(s=>s.label==="24651415_"+i)?.jobId);assert.equal(c.scheduler.jobId,selection.taskJobIds[i]);assert.equal(c.scheduler.arrayJobId,"24651415");
 assert.equal(cell.sha,selection.cellHashes[i]);assert.deepEqual(c.block,current.plan.blocks[i]);assert.equal(c.selected.length,c.block.caseCount);assert.equal(c.createdGameCount,c.block.caseCount);assert.equal(c.updateCalls,0);
 for(const key of ["sourceCommit","planningSourceCommit","programSha256","planFileSha256","planSha256","auditSha256"])assert.equal(c[key],selection[key]);assert.deepEqual(c.fileHashes,selection.fileHashes);
 for(const [j,r]of c.selected.entries()){
  const {observedCandidateStart,observedOpponentStart,updates,...spec}=r;assert.deepEqual(spec,current.plan.cases[c.block.caseIndices[j]]);
  assert.equal(observedCandidateStart,r.candidateStart);assert.equal(observedOpponentStart,r.opponentStart);assert.equal(updates,0);
  cases.push({...r,selectorJobId:c.scheduler.jobId,cellSha256:cell.sha});
 }
 blocks.push({blockIndex:i,cohort:c.block.cohort,mapId:c.map.id,cases:c.createdGameCount,updates:c.updateCalls,jobId:c.scheduler.jobId,cellSha256:cell.sha});
}
cases.sort((a,b)=>a.caseIndex-b.caseIndex);assert.equal(cases.length,2160);
assert.deepEqual(cases.map(({selectorJobId,cellSha256,...r})=>r),selection.selected);
assert.equal(new Set(cases.map(c=>c.caseId)).size,2160);
const csv=rows=>{const keys=Object.keys(rows[0]),q=v=>'"'+String(v??"").replaceAll('"','""')+'"';return [keys,...rows.map(r=>keys.map(k=>r[k]))].map(r=>r.map(q).join(",")).join("\n")+"\n";};
const out=path.join(REPO,"research/results/2026-09-03-fresh-dual-selection-audit");fs.mkdirSync(out,{recursive:true});
const outputs={"blocks.csv":csv(blocks),"cases.csv":csv(cases),"scheduler.csv":csv(scheduler)};
for(const [file,text]of Object.entries(outputs))fs.writeFileSync(path.join(out,file),text);
const validation={complete:true,passed:true,selectionSha256:a.sha,auditSha256:audit.sha,planFileSha256:selection.planFileSha256,planSha256:selection.planSha256,
 executionSourceCommit:selection.sourceCommit,planningSourceCommit:selection.planningSourceCommit,programSha256:hash(read(fileURLToPath(import.meta.url))),
 selectedCases:2160,createdGames:2160,updates:0,selectorBlocks:16,schedulerRecordsIncludingAudit:18,allExactCasesAndBindingsVerified:true,allCompletionMarkersAndHashesVerified:true,
 noReplacements:true,noOutcomeFields:true,competitiveRunAuthorized:false,
 cpuSeconds:scheduler.reduce((n,r)=>n+r.elapsedSeconds*r.cpus,0),outputs:Object.fromEntries(Object.entries(outputs).map(([k,v])=>[k,hash(v)]))};
fs.writeFileSync(path.join(out,"validation.json"),JSON.stringify(validation,null,2)+"\n");
console.log(JSON.stringify({...validation,blocks}));
