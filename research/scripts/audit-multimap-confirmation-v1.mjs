import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {buildScreenAllocation} from "../runtime/multimap-screen-allocation-v3.mjs";
import {analyzeConfirmation,buildConfirmationPlan,confirmationAssignment} from "../runtime/multimap-confirmation-v1.mjs";

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../.."),project=path.dirname(repo);
const evidence=path.join(project,"research-evidence/multimap-v2");
const out=path.join(repo,"research/results/2026-09-03-multimap-confirmation-audit");
const hash=b=>crypto.createHash("sha256").update(b).digest("hex");
const read=p=>fs.readFileSync(p),json=p=>JSON.parse(read(p));
const expected={
 sourceCommit:"355770ce1dd6d5236d50776546de0a0d7cbff5ed",
 aggregate:"59b7b217b6d6bf38759d16bb12cda8a275d3c3b37ca159aa9ed3455c8712d393",
 census:"5715eef27a8dc0b4b24f3ea2909c83ef2d15c3ea546a7c16b9b3a61b1583d1c5",
 screen:"8e760c72605cbe6c67fcc088cba5a3e460fecf53f28b4b614158abe050bef341",
 allocation:"5a838bd9cb3edf06df288914ad5cea60b61983f29d183a1efdeb5a3c90e3295e",
};
const sealed=(relative,sha)=>{const file=path.join(evidence,relative);assert.equal(hash(read(file)),sha);return json(file);};
const aggregate=sealed("unchanged-confirmation-v1/finalizer/confirmation.json",expected.aggregate);
const census=sealed("explicit-census-amendment-2/finalizer/multimap-selection.json",expected.census);
const screen=sealed("screen-amendment-3/finalizer/screen.json",expected.screen);
const allocation=sealed("screen-amendment-3/allocation/allocation.json",expected.allocation);
assert.equal(read(path.join(evidence,"unchanged-confirmation-v1/finalizer/COMPLETE")).toString().trim(),"COMPLETE_MULTIMAP_CONFIRMATION_AGGREGATE_V1");
assert.equal(aggregate.complete,true);assert.equal(aggregate.technicalIntegrityPassed,true);
assert.equal(aggregate.sourceCommit,expected.sourceCommit);assert.equal(aggregate.taskCount,288);
const screenPlan=buildScreenAllocation(census);assert.deepEqual(allocation.plan,screenPlan);
const plan=buildConfirmationPlan(screen,screenPlan);
assert.equal(hash(JSON.stringify(plan)),aggregate.confirmationPlanSha256);
assert.deepEqual(aggregate.runtimeIdentity,screen.runtimeIdentity);
const bindings={
 programSha256:"research/scripts/multimap-confirmation-v1.mjs",
 amendmentSha256:"research/protocols/maps/2026-09-02-multimap-screen-allocation-amendment-3.md",
 allocationModuleSha256:"research/runtime/multimap-screen-allocation-v3.mjs",
 analysisModuleSha256:"research/runtime/multimap-screen-analysis-v3.mjs",
 confirmationProtocolSha256:"research/protocols/maps/2026-09-03-multimap-unchanged-confirmation-v1.md",
 confirmationModuleSha256:"research/runtime/multimap-confirmation-v1.mjs",
};
for(const [key,file] of Object.entries(bindings))assert.equal(hash(read(path.join(repo,file))),aggregate[key]);
const accountingText=execFileSync("/opt/slurm/current/bin/sacct",["-X","-j","24634133,24634134","-n","-P","--format=JobID,JobIDRaw,Account,Partition,State,ExitCode,Restarts"],{encoding:"utf8"});
const accounting=accountingText.trim().split("\n").map(line=>{
 const [label,jobId,account,partition,state,exitCode,restarts]=line.split("|");
 return {label,jobId,account,partition,state,exitCode,restarts:Number(restarts)};
});
assert.equal(accounting.length,289);assert.equal(new Set(accounting.map(r=>r.jobId)).size,289);
for(const row of accounting){assert.equal(row.account,"pi_jss233");assert.equal(row.partition,"day");assert.equal(row.state,"COMPLETED");assert.equal(row.exitCode,"0:0");assert.equal(row.restarts,0);}
const tasks=new Map(accounting.filter(r=>/^24634133_\d+$/.test(r.label)).map(r=>[Number(r.label.split("_")[1]),r]));
assert.equal(tasks.size,288);
assert.equal(accounting.filter(r=>r.label==="24634134").length,1);
const cells=[],audits=[];
for(let i=0;i<288;i++){
 const dir=path.join(evidence,"unchanged-confirmation-v1/cells/task-"+String(i).padStart(3,"0")),file=path.join(dir,"cell.json");
 fs.readdirSync(dir);
 assert.equal(read(path.join(dir,"COMPLETE")).toString().trim(),"COMPLETE_MULTIMAP_CONFIRMATION_CELL_V1");
 const sha=hash(read(file));assert.equal(sha,read(path.join(dir,"cell.sha256")).toString().trim().split(/\s+/)[0]);
 const c=json(file),a=confirmationAssignment(plan,i),entry=census.maps[a.mapIndex],spec=entry.cases[a.mapCaseIndex],r=c.result;
 assert.equal(c.complete,true);assert.equal(c.taskIndex,i);assert.deepEqual(c.assignment,a);assert.deepEqual(c.map,entry.map);
 assert.equal(c.sourceCommit,expected.sourceCommit);assert.equal(c.schedulerJobId,tasks.get(i).jobId);
 assert.equal(c.schedulerJobId,aggregate.scheduler.taskJobIds[i]);assert.equal(c.schedulerAccount,"pi_jss233");
 for(const key of [...Object.keys(bindings),"censusSha256","screenAggregateSha256","confirmationPlanSha256","allocationSha256"])assert.equal(c[key],aggregate[key]);
 assert.deepEqual(c.interfaceIdentity,census.interfaceIdentity);assert.equal(c.assetManifestSha256,census.assetManifestSha256);
 assert.equal(c.baselineCommit,"165b77a71d0cf5ebd27c65b19d0486bcbae78d0f");
 assert.equal(c.provenance.source.gitCommit,expected.sourceCommit);assert.equal(c.provenance.source.trackedDirty,false);
 assert.equal(c.provenance.scheduler.account,"pi_jss233");assert.equal(c.provenance.scheduler.partition,"day");
 assert.equal(c.provenance.scheduler.arrayJobId,"24634133");assert.equal(c.provenance.scheduler.arrayTaskId,String(i));
 assert.equal(c.provenance.inputs.maps[0].sha256,entry.map.sha256);
 assert.deepEqual({trees:c.provenance.source.runtimeTrees,software:c.provenance.software,environment:c.provenance.inputs.capturedEnvironment},screen.runtimeIdentity);
 for(const [key,value] of Object.entries(spec))assert.deepEqual(r[key],value);
 assert.equal(r.quitForwarded.candidate,0);assert.equal(r.quitForwarded.baseline,0);
 assert.ok(Number.isInteger(r.updates)&&r.updates>=1&&r.updates<=90000);
 if(r.winner==="candidate"){assert.equal(r.endpointStatus,"candidate_win");assert.equal(r.terminalBuildingCounts.baseline,0);assert.equal(r.terminalProof.evaluation.candidatePhysicalWin,true);}
 else if(r.winner==="opponent"){assert.equal(r.endpointStatus,"baseline_win");assert.equal(r.terminalBuildingCounts.candidate,0);assert.equal(r.terminalProof.evaluation.baselinePhysicalWin,true);}
 else{assert.equal(r.winner,"draw");assert.ok(["tick_cap_draw","engine_nonliteral_termination_draw","simultaneous_draw"].includes(r.endpointStatus));if(r.endpointStatus==="tick_cap_draw")assert.equal(r.updates,90000);}
 assert.ok(!screenPlan.maps.find(m=>m.mapIndex===a.mapIndex).screenIndices.includes(a.mapCaseIndex));
 cells.push({mapIndex:a.mapIndex,taskIndex:i,...r});
 audits.push({taskIndex:i,mapId:c.map.id,mapCaseIndex:a.mapCaseIndex,jobId:c.schedulerJobId,country:r.country,countryOrdinal:r.countryOrdinal,candidateSlot:r.candidateSlot,candidateStart:r.candidateStart,opponentStart:r.opponentStart,repeatIndex:r.repeatIndex,requestedEngineSeed:r.requestedEngineSeed,winner:r.winner,updates:r.updates,endpointStatus:r.endpointStatus,cellSha256:sha,trajectorySha256:r.trajectorySha256,rawPath:path.relative(project,file)});
}
const summaries=[],strata=[],gates=[];
for(const m of aggregate.maps){
 const rows=cells.filter(r=>r.mapIndex===m.allocation.mapIndex),recomputed=analyzeConfirmation(rows,2);
 for(const [k,v]of Object.entries(recomputed))assert.deepEqual(m[k],v);
 assert.equal(new Set(rows.map(r=>r.mapCaseIndex)).size,144);
 const combos=new Map();
 for(const r of rows){const key=[r.countryOrdinal,r.candidateStart,r.candidateSlot,r.repeatIndex].join("|");combos.set(key,(combos.get(key)||0)+1);assert.ok(r.repeatIndex>=1&&r.repeatIndex<=4);}
 assert.equal(combos.size,144);assert.ok([...combos.values()].every(n=>n===1));
 assert.deepEqual(rows.map(r=>({taskIndex:r.taskIndex,mapCaseIndex:r.mapCaseIndex,winner:r.winner,updates:r.updates,endpointStatus:r.endpointStatus,countryOrdinal:r.countryOrdinal,candidateSlot:r.candidateSlot,candidateStart:r.candidateStart})),m.cells);
 summaries.push({mapId:m.map.id,...m.summary,clusteredOneSided95Lower:m.clustered.oneSided95Lower,positiveCells:m.positiveCells,noninferiorCells:m.noninferiorCells,positive:m.positive,dominanceCriteriaMet:m.dominanceCriteriaMet,nonliteralTerminationDrawCount:m.nonliteralTerminationDrawCount});
 for(const [dimension,values]of Object.entries(m.strata))for(const [key,s]of Object.entries(values))strata.push({mapId:m.map.id,dimension,stratum:key,...s});
 for(const [gate,passed]of Object.entries(m.gates))gates.push({mapId:m.map.id,gate,passed,applicable:gate!=="pairedAdaptationGateApplicable"});
}
assert.deepEqual(aggregate.positiveMapIds,[]);assert.deepEqual(aggregate.dominanceMapIds,[]);
const csv=(rows)=>{const keys=Object.keys(rows[0]);const quote=v=>'"'+String(v??"").replaceAll('"','""')+'"';return [keys,...rows.map(r=>keys.map(k=>r[k]))].map(r=>r.map(quote).join(",")).join("\n")+"\n";};
fs.mkdirSync(out,{recursive:true});
const outputs={"maps.csv":csv(summaries),"strata.csv":csv(strata),"gates.csv":csv(gates),"cells.csv":csv(audits),"scheduler.csv":csv(accounting.sort((a,b)=>a.jobId.localeCompare(b.jobId)))};
for(const [file,text]of Object.entries(outputs))fs.writeFileSync(path.join(out,file),text);
const validation={complete:true,sourceCommit:expected.sourceCommit,aggregateSha256:expected.aggregate,scriptSha256:hash(read(fileURLToPath(import.meta.url))),all288CellHashesVerified:true,accountingRecords:289,allCompletedWithoutRestart:true,allAccountPiJss233Day:true,exactAssignedCasesAndStrata:true,zeroScreenOverlap:true,sourceRuntimeProtocolBindingsVerified:true,literalCertificatesAsRunVerified:true,allFrozenStatisticsAndGatesReproduced:true,allOriginalOutcomesUnchanged:true,independentMapSuccesses:0,measurementCaveat:"Legacy world-building ledger may retain destroyed rubble; live fixture validation is pending. This audit does not correct or rescue any score.",outputs:Object.fromEntries(Object.entries(outputs).map(([p,t])=>[p,hash(t)]))};
fs.writeFileSync(path.join(out,"validation.json"),JSON.stringify(validation,null,2)+"\n");
console.log(JSON.stringify({complete:true,cells:audits.length,maps:summaries,output:out}));
