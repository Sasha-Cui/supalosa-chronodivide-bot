import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {fileURLToPath,pathToFileURL} from "node:url";
import {hash,rejectOutcomeKeys,validatePlan} from "../runtime/fresh-dual-endpoint-plan-v1.mjs";
import {REPO,ROOT,ASSETS,loadPlanInputs,read,json} from "../runtime/fresh-dual-inputs-v1.mjs";
const required=k=>{assert.ok(process.env[k],k+" required");return process.env[k];};
const git=(...a)=>execFileSync("git",a,{cwd:REPO,encoding:"utf8"}).trim();
const progress={phase:"startup",blockIndex:null,caseIndex:null,createdGames:0,updateCalls:0};
const write=(p,a)=>{rejectOutcomeKeys(a);fs.writeFileSync(p,JSON.stringify(a,null,2)+"\n",{flag:"wx",mode:0o600});};
async function main(){
 const mode=process.argv[2];assert.ok(["cell","finalize"].includes(mode));
 assert.equal(required("SLURM_JOB_ACCOUNT"),"pi_jss233");assert.equal(process.version,"v20.13.1");
 assert.equal(git("branch","--show-current"),"main");assert.equal(git("status","--porcelain"),"");
 const sourceCommit=git("rev-parse","HEAD");assert.equal(sourceCommit,git("rev-parse","fork/main"));assert.equal(sourceCommit,required("SOURCE_COMMIT"));
 const programSha256=hash(read(fileURLToPath(import.meta.url)));assert.equal(programSha256,required("PROGRAM_SHA256"));
 const preparedPath=path.join(ROOT,"plan.json"),planFileSha256=hash(read(preparedPath));assert.equal(planFileSha256,required("PLAN_FILE_SHA256"));
 const prepared=json(preparedPath);assert.equal(prepared.sourceCommit,sourceCommit);assert.equal(prepared.complete,true);assert.equal(prepared.outcomeFree,true);
 const {plan,runtime,fileHashes,assetEntries}=loadPlanInputs();validatePlan(plan);assert.deepEqual(prepared.plan,plan);assert.deepEqual(prepared.fileHashes,fileHashes);assert.deepEqual(prepared.assetEntries,assetEntries);
 const auditDir=path.join(ROOT,"audit");fs.readdirSync(ROOT);fs.readdirSync(auditDir);
 assert.equal(read(path.join(auditDir,"COMPLETE")).toString().trim(),"COMPLETE_FRESH_DUAL_SEED_AUDIT_V1");
 const auditPath=path.join(auditDir,"seed-audit.json"),auditSha256=hash(read(auditPath));assert.equal(auditSha256,required("AUDIT_SHA256"));
 assert.equal(auditSha256,read(path.join(auditDir,"seed-audit.sha256")).toString().trim().split(/\s+/)[0]);
 const audit=json(auditPath);assert.equal(audit.complete,true);assert.equal(audit.passed,true);assert.equal(audit.outcomeFree,true);
 assert.equal(audit.sourceCommit,sourceCommit);assert.equal(audit.planFileSha256,planFileSha256);assert.equal(audit.planSha256,prepared.planSha256);
 assert.equal(audit.collisions.length,0);assert.equal(audit.errors.length,0);assert.deepEqual(audit.exactPlannedSeeds,plan.uniqueSeeds);
 const ar=execFileSync("/opt/slurm/current/bin/sacct",["-X","-j",String(audit.schedulerJobId),"-n","-P","--format=JobID,Account,Partition,State,ExitCode,Restarts"],{encoding:"utf8"}).trim().split("|");
 assert.equal(ar[0],String(audit.schedulerJobId));assert.deepEqual(ar.slice(1,6),["pi_jss233","day","COMPLETED","0:0","0"]);
 const outDir=required("OUT_DIR"),jobId=required("SLURM_JOB_ID");
 const context={sourceCommit,programSha256,planFileSha256,planSha256:prepared.planSha256,auditSha256,fileHashes,
  scheduler:{jobId,account:"pi_jss233",partition:"day",arrayJobId:process.env.SLURM_ARRAY_JOB_ID??null},nodeVersion:process.version};
 if(mode==="cell"){
  const blockIndex=Number(required("SLURM_ARRAY_TASK_ID"));assert.ok(Number.isInteger(blockIndex)&&blockIndex>=0&&blockIndex<16);progress.blockIndex=blockIndex;
  const block=plan.blocks[blockIndex],map=plan.maps.find(m=>m.id===block.mapId);
  const {Bot,cdapi}=await import(pathToFileURL(runtime));
  assert.equal(globalThis[Symbol.for("chrono.research.explicit-start.v1")]?.originalSha256,fileHashes.runtime);
  const {transformExplicitStartRuntime}=await import("../runtime/explicit-start-transform-v1.mjs");
  assert.equal(hash(transformExplicitStartRuntime(read(runtime))),"4ad4a5dd7a6a8ae53a7e671a29d7dd0a5fbad1916d94e52c69c9eda133a30f0c");
  const {withSeededOfflineGame}=await import(pathToFileURL(path.join(REPO,"packages/chronodivide-bot-driver/dist/benchmark/seededOfflineGame.js")));
  progress.phase="asset-init";await cdapi.init(ASSETS);
  const modes=cdapi.getAvailableGameModes(map.fileName);assert.ok(modes.length>0);
  const selected=[];
  class Passive extends Bot{onGameStart(api){this.api=api;}}
  for(const caseIndex of block.caseIndices){
   const c=plan.cases[caseIndex];progress.caseIndex=caseIndex;progress.phase="create-zero-update-game";
   const candidate=new Passive("FreshSelectCandidate_"+caseIndex,c.country),opponent=new Passive("FreshSelectOpponent_"+caseIndex,c.country);
   candidate.chronoResearchStartPos=c.candidateStartOrdinal;opponent.chronoResearchStartPos=c.opponentStartOrdinal;
   const settings={online:false,agents:c.candidateSlot===0?[candidate,opponent]:[opponent,candidate],mapName:map.fileName,gameMode:modes[0],
    shortGame:false,mcvRepacks:true,cratesAppear:false,superWeapons:false,gameSpeed:6,credits:10000,unitCount:0,buildOffAlly:false,multiEngineer:false};
   await withSeededOfflineGame(cdapi,settings,c.requestedEngineSeed,[{agent:candidate,identity:"candidate"},{agent:opponent,identity:"opponent"}],async game=>{
    progress.createdGames++;assert.equal(game.getCurrentTick(),0);assert.equal(game.isFinished(),false);
    const api=candidate.api;assert.ok(api);const point=p=>p.x+","+p.y;
    const observedCandidate=point(api.getPlayerData(candidate.name).startLocation),observedOpponent=point(api.getPlayerData(opponent.name).startLocation);
    assert.equal(observedCandidate,c.candidateStart);assert.equal(observedOpponent,c.opponentStart);
    selected.push({...c,observedCandidateStart:observedCandidate,observedOpponentStart:observedOpponent,updates:0});
   });
  }
  assert.equal(selected.length,block.caseCount);assert.equal(progress.createdGames,block.caseCount);assert.equal(progress.updateCalls,0);
  write(path.join(outDir,"selection.json"),{kind:"fresh-dual-zero-update-selection-cell-v1",complete:true,passed:true,outcomeFree:true,...context,block,map,
   createdGameCount:progress.createdGames,updateCalls:0,selected});
  console.log(JSON.stringify({complete:true,blockIndex,cases:selected.length,updates:0}));return;
 }
 const array=required("ARRAY_JOB_ID"),raw=execFileSync("/opt/slurm/current/bin/sacct",["-X","-j",array,"-n","-P","--format=JobID,JobIDRaw,Account,Partition,State,ExitCode,Restarts"],{encoding:"utf8"}).trim();
 const jobs=new Map;
 for(const line of raw.split("\n")){
  const [label,id,account,partition,state,exit,restarts]=line.split("|"),match=new RegExp("^"+array+"_(\\d+)$").exec(label);if(!match)continue;
  assert.equal(account,"pi_jss233");assert.equal(partition,"day");assert.equal(state,"COMPLETED");assert.equal(exit,"0:0");assert.equal(restarts,"0");assert.ok(!jobs.has(+match[1]));jobs.set(+match[1],id);
 }
 assert.equal(jobs.size,16);assert.equal(new Set(jobs.values()).size,16);
 const selected=[],cellHashes={};
 for(let i=0;i<16;i++){
  const dir=path.join(ROOT,"selection/cells/block-"+String(i).padStart(2,"0"));fs.readdirSync(dir);
  assert.equal(read(path.join(dir,"COMPLETE")).toString().trim(),"COMPLETE_FRESH_DUAL_SELECTION_CELL_V1");
  const p=path.join(dir,"selection.json"),sha=hash(read(p));assert.equal(sha,read(path.join(dir,"selection.sha256")).toString().trim().split(/\s+/)[0]);
  const a=json(p);assert.equal(a.complete,true);assert.equal(a.passed,true);assert.equal(a.outcomeFree,true);rejectOutcomeKeys(a);
  for(const k of ["sourceCommit","programSha256","planFileSha256","planSha256","auditSha256"])assert.equal(a[k],context[k]);
  assert.deepEqual(a.fileHashes,fileHashes);assert.deepEqual(a.block,plan.blocks[i]);assert.deepEqual(a.map,plan.maps.find(m=>m.id===a.block.mapId));
  assert.equal(a.scheduler.jobId,jobs.get(i));assert.equal(a.scheduler.account,"pi_jss233");assert.equal(a.scheduler.partition,"day");assert.equal(a.scheduler.arrayJobId,array);
  assert.equal(a.createdGameCount,a.block.caseCount);assert.equal(a.updateCalls,0);assert.equal(a.selected.length,a.block.caseCount);
  for(const [j,c]of a.selected.entries()){
   const {observedCandidateStart,observedOpponentStart,updates,...spec}=c;assert.deepEqual(spec,plan.cases[a.block.caseIndices[j]]);
   assert.equal(updates,0);assert.equal(observedCandidateStart,spec.candidateStart);assert.equal(observedOpponentStart,spec.opponentStart);selected.push(c);
  }
  cellHashes[i]=sha;
 }
 selected.sort((a,b)=>a.caseIndex-b.caseIndex);assert.equal(selected.length,2160);assert.deepEqual(selected.map(c=>c.caseIndex),plan.cases.map(c=>c.caseIndex));
 write(path.join(outDir,"selection.json"),{kind:"fresh-dual-zero-update-selection-aggregate-v1",complete:true,passed:true,outcomeFree:true,...context,
  arrayJobId:array,taskJobIds:Object.fromEntries(jobs),cellHashes,selectedCaseCount:2160,createdGameCount:2160,updateCalls:0,selected,
  competitiveGameCount:2700,competitiveRunAuthorized:false,remainingPrerequisites:["policy-runtime-freeze","new-competitive-driver","noninterference-canaries"]});
 console.log(JSON.stringify({complete:true,passed:true,cases:2160,updates:0,competitiveRunAuthorized:false}));
}
main().catch(error=>{
 const failure={technicalError:error?.message??String(error),progress:{...progress},frames:String(error?.stack??"").split("\n").filter(s=>s.length<700&&/^\s*at /.test(s)).slice(0,10)};
 console.error(JSON.stringify(failure));if(process.env.OUT_DIR)try{write(path.join(process.env.OUT_DIR,"failure.json"),failure);}catch{}process.exitCode=1;
});
