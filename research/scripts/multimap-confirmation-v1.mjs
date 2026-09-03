import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import {fileURLToPath,pathToFileURL} from "node:url";
import {createRequire} from "node:module";
import {execFileSync} from "node:child_process";
import {buildScreenAllocation,CENSUS_SHA256} from "../runtime/multimap-screen-allocation-v3.mjs";
import {analyzeConfirmation,buildConfirmationPlan,confirmationAssignment,SCREEN_SHA256} from "../runtime/multimap-confirmation-v1.mjs";

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const driver=path.join(repo,"packages/chronodivide-bot-driver");
const project=path.dirname(repo);
const required=k=>{if(!process.env[k])throw Error(k+" required");return process.env[k];};
const hash=b=>crypto.createHash("sha256").update(b).digest("hex");
const read=p=>fs.readFileSync(p);
const json=p=>JSON.parse(read(p));
const digest=o=>hash(JSON.stringify(o));
const git=(...a)=>execFileSync("git",a,{cwd:repo,encoding:"utf8"}).trim();
const phase=process.argv[2];assert.ok(["cell","finalize"].includes(phase));
assert.equal(required("SLURM_JOB_ACCOUNT"),"pi_jss233");
assert.equal(git("branch","--show-current"),"main");assert.equal(git("status","--porcelain","--untracked-files=no"),"");
const sourceCommit=git("rev-parse","HEAD");assert.equal(git("rev-parse","fork/main"),sourceCommit);
const programSha256=hash(read(fileURLToPath(import.meta.url)));assert.equal(programSha256,required("PROGRAM_SHA256"));
const amendmentPath=path.join(repo,"research/protocols/maps/2026-09-02-multimap-screen-allocation-amendment-3.md");
const amendmentSha256=hash(read(amendmentPath));assert.equal(amendmentSha256,required("SCREEN_AMENDMENT_SHA256"));
const allocationModuleSha256=hash(read(path.join(repo,"research/runtime/multimap-screen-allocation-v3.mjs")));
const analysisModuleSha256=hash(read(path.join(repo,"research/runtime/multimap-screen-analysis-v3.mjs")));
assert.equal(allocationModuleSha256,required("ALLOCATION_MODULE_SHA256"));
assert.equal(analysisModuleSha256,required("ANALYSIS_MODULE_SHA256"));
const censusPath=path.join(project,"research-evidence/multimap-v2/explicit-census-amendment-2/finalizer/multimap-selection.json");
assert.equal(hash(read(censusPath)),CENSUS_SHA256);
const census=json(censusPath);assert.equal(census.complete,true);assert.equal(census.passed,true);
assert.equal(census.outcomeFree,true);
const screenPlan=buildScreenAllocation(census);
const priorScreenPath=path.join(project,"research-evidence/multimap-v2/screen-amendment-3/finalizer/screen.json");
assert.equal(hash(read(priorScreenPath)),SCREEN_SHA256);
const priorScreen=json(priorScreenPath),plan=buildConfirmationPlan(priorScreen,screenPlan);
const confirmationProtocolPath=path.join(repo,"research/protocols/maps/2026-09-03-multimap-unchanged-confirmation-v1.md");
const confirmationProtocolSha256=hash(read(confirmationProtocolPath));
assert.equal(confirmationProtocolSha256,required("CONFIRMATION_PROTOCOL_SHA256"));
const confirmationModuleSha256=hash(read(path.join(repo,"research/runtime/multimap-confirmation-v1.mjs")));
assert.equal(confirmationModuleSha256,required("CONFIRMATION_MODULE_SHA256"));
const inputIdentity={programSha256,amendmentSha256,allocationModuleSha256,analysisModuleSha256,censusSha256:CENSUS_SHA256,
    screenAggregateSha256:SCREEN_SHA256,confirmationProtocolSha256,confirmationModuleSha256,confirmationPlanSha256:digest(plan)};
const jobId=required("SLURM_JOB_ID");
const write=(file,artifact)=>{
    assert.ok(!fs.existsSync(file));fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
    fs.writeFileSync(file,JSON.stringify(artifact,null,2)+"\n",{flag:"wx",mode:0o600});
};
function inspectAllocation(){
    const file=required("ALLOCATION_PATH"),sha=required("ALLOCATION_SHA256");
    assert.equal(hash(read(file)),sha);const a=json(file);
    assert.equal(a.kind,"multimap-v2-screen-allocation-amendment-3");assert.equal(a.complete,true);assert.equal(a.passed,true);
    assert.equal(a.outcomeFree,true);assert.equal(a.schedulerAccount,"pi_jss233");
    assert.equal(a.amendmentSha256,amendmentSha256);assert.equal(a.allocationModuleSha256,allocationModuleSha256);
    assert.equal(a.censusSha256,CENSUS_SHA256);assert.deepEqual(a.plan,screenPlan);
    return sha;
}
async function runCell(){
    assert.equal(fs.realpathSync(process.cwd()),fs.realpathSync(driver));
    const taskIndex=Number(required("TASK_INDEX"));
    assert.equal(String(taskIndex),required("SLURM_ARRAY_TASK_ID"));
    const allocationSha256=inspectAllocation(),assignment=confirmationAssignment(plan,taskIndex);
    const map=census.maps[assignment.mapIndex].map,caseSpec=census.maps[assignment.mapIndex].cases[assignment.mapCaseIndex];
    assert.equal(caseSpec.mapCaseIndex,assignment.mapCaseIndex);
    const mixDir=required("MIX_DIR");
    assert.equal(hash(read(path.join(mixDir,map.fileName))),map.sha256);
    const assetPath=required("ASSET_MANIFEST_PATH");
    assert.equal(hash(read(assetPath)),"d942117f24363818977d573dbc87006a9b320c6861bddf939d5fc80db2217e67");
    assert.equal(json(assetPath).runtimeDirectory,mixDir);
    const require=createRequire(path.join(driver,"package.json"));
    const runtime=fs.realpathSync(require.resolve("@chronodivide/game-api"));
    assert.equal(hash(read(runtime)),census.interfaceIdentity.originalRuntimeSha256);
    assert.equal(hash(read(path.join(repo,"research/runtime/explicit-start-loader-v1.mjs"))),"9cd22887ab3ae3206b0c6cb8d91a15593dd2a2dd073ad36d9b5b9827dac46cac");
    assert.equal(hash(read(path.join(repo,"research/runtime/explicit-start-transform-v1.mjs"))),"d36371064697371a53ecece243ddc086db1b481d210d84c549dcd5d0eb9ea32a");
    const {Bot,cdapi}=await import(pathToFileURL(runtime).href);
    assert.equal(globalThis[Symbol.for("chrono.research.explicit-start.v1")]?.originalSha256,census.interfaceIdentity.originalRuntimeSha256);
    const {StrongBot}=await import(pathToFileURL(require.resolve("@supalosa/chronodivide-bot/dist/bot/strongBot.js")).href);
    const load=(relative)=>import(pathToFileURL(path.join(driver,"dist",relative)).href);
    const {loadBaselineFactory}=await load("benchmark/baselineLoader.js");
    const {createExperimentManifest}=await load("benchmark/provenance.js");
    const {withSeededOfflineGame}=await load("benchmark/seededOfflineGame.js");
    const endpoint=await load("training/literalBuildingEliminationEndpoint.js");
    assert.equal(endpoint.LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,5);
    const baseline=await loadBaselineFactory(path.join(repo,"packages/chronodivide-bot"));
    assert.equal(baseline.descriptor.kind,"external-package");
    const baseCommit=execFileSync("git",["-C",baseline.descriptor.packageRoot,"rev-parse","HEAD"],{encoding:"utf8"}).trim();
    assert.equal(baseCommit,"165b77a71d0cf5ebd27c65b19d0486bcbae78d0f");
    assert.equal(execFileSync("git",["-C",baseline.descriptor.packageRoot,"status","--porcelain","--untracked-files=no"],{encoding:"utf8"}).trim(),"");
    await cdapi.init(mixDir);
    const candidateName="MMCandidate_"+assignment.mapIndex+"_"+assignment.mapCaseIndex,
        opponentName="MMSupalosa_"+assignment.mapIndex+"_"+assignment.mapCaseIndex;
    const candidate=new StrongBot(candidateName,caseSpec.country,[],false),opponent=baseline.create(opponentName,caseSpec.country);
    assert.ok(candidate instanceof Bot&&opponent instanceof Bot);
    candidate.chronoResearchStartPos=caseSpec.candidateStartOrdinal;opponent.chronoResearchStartPos=caseSpec.opponentStartOrdinal;
    const adjudicator=new endpoint.LiteralBuildingEliminationAdjudicator({candidate:candidateName,baseline:opponentName});
    const {audit}=endpoint.installLiteralEndpointInstrumentation({candidate,baseline:opponent},adjudicator);
    const settings={buildOffAlly:false,cratesAppear:false,credits:10000,gameMode:cdapi.getAvailableGameModes(map.fileName)[0],
        gameSpeed:6,mapName:map.fileName,mcvRepacks:true,shortGame:false,superWeapons:false,unitCount:0,online:false,
        agents:caseSpec.candidateSlot===0?[candidate,opponent]:[opponent,candidate]};
    const result=await withSeededOfflineGame(cdapi,settings,caseSpec.requestedEngineSeed,
        [{agent:candidate,identity:"candidate"},{agent:opponent,identity:"opponent"}],async game=>{
            const api=candidate.lastGameApi;assert.ok(api);
            const point=p=>p.x+","+p.y;
            assert.equal(point(api.getPlayerData(candidateName).startLocation),caseSpec.candidateStart);
            assert.equal(point(api.getPlayerData(opponentName).startLocation),caseSpec.opponentStart);
            const trace=crypto.createHash("sha256");
            const snapshot=()=>api.getAllUnits().map(id=>api.getUnitData(id)).filter(Boolean).filter(u=>u.owner===candidateName||u.owner===opponentName)
                .map(u=>({owner:u.owner===candidateName?"candidate":"opponent",rule:u.rules.name,hp:u.hitPoints,x:u.tile.rx,y:u.tile.ry}))
                .sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
            let updates=0,terminal=null;
            trace.update(JSON.stringify(snapshot())+"\n");
            while(updates<90000&&!terminal){
                adjudicator.beginUpdate(api);await game.update();updates++;
                const stats=game.getPlayerStats(),cs=stats.find(x=>x.name===candidateName),bs=stats.find(x=>x.name===opponentName);
                assert.ok(cs&&bs);
                const state=adjudicator.completeUpdate(api,{finished:game.isFinished(),defeated:{candidate:cs.defeated,baseline:bs.defeated}});
                if(state.technicalFailure)throw Error("Multi-map literal endpoint technical failure");
                terminal=state.terminal;
                if(updates%60===0)trace.update(JSON.stringify(snapshot())+"\n");
            }
            if(terminal)assert.ok(["candidate","baseline","draw"].includes(terminal.winner));
            const winner=terminal?.winner==="candidate"?"candidate":terminal?.winner==="baseline"?"opponent":"draw",
                buildings=endpoint.snapshotCombatantBuildings(api,{candidate:candidateName,baseline:opponentName});
            assert.equal(audit.forwarded.candidate,0);assert.equal(audit.forwarded.baseline,0);
            return {...caseSpec,winner,updates,endpointStatus:terminal?.status??"tick_cap_draw",
                terminalBuildingCounts:{candidate:buildings.filter(b=>b.owner===candidateName).length,
                    baseline:buildings.filter(b=>b.owner===opponentName).length},
                terminalProof:terminal,quitAttempts:{...audit.attempts},quitForwarded:{...audit.forwarded},
                trajectorySha256:trace.digest("hex")};
        });
    const provenance=createExperimentManifest({runId:"multimap-confirmation-v1-"+taskIndex+"-"+jobId,mixDir,maps:[map.fileName],
        effectiveConfig:{assignment,caseSpec,allocationSha256,amendmentSha256,interfaceIdentity:census.interfaceIdentity,maxUpdates:90000},
        baseline:baseline.descriptor,gameSeedBase:caseSpec.requestedEngineSeed});
    write(required("OUT_PATH"),{kind:"multimap-v2-unchanged-confirmation-cell-v1",complete:true,taskIndex,assignment,map,provenance,
        result,...inputIdentity,allocationSha256,sourceCommit,schedulerJobId:jobId,schedulerAccount:"pi_jss233",
        interfaceIdentity:census.interfaceIdentity,assetManifestSha256:census.assetManifestSha256,
        baselineCommit:baseCommit,nodeVersion:process.version});
    console.log(JSON.stringify({complete:true,taskIndex,mapId:map.id}));
}
function finalize(){
    const allocationSha256=inspectAllocation(),array=required("ARRAY_JOB_ID");assert.match(array,/^\d+$/);
    const raw=execFileSync("/opt/slurm/current/bin/sacct",["-j",array,"-X","-n","-P","--format=JobID,JobIDRaw,State,ExitCode,Account"],{encoding:"utf8"});
    const tasks=new Map();
    for(const line of raw.trim().split("\n")){
        const [label,id,state,exit,account]=line.split("|"),match=new RegExp("^"+array+"_(\\d+)$").exec(label);
        if(!match)continue;
        assert.equal(state,"COMPLETED");assert.equal(exit,"0:0");assert.equal(account,"pi_jss233");
        assert.ok(!tasks.has(+match[1]));tasks.set(+match[1],id);
    }
    assert.equal(tasks.size,288);assert.equal(new Set(tasks.values()).size,288);
    fs.readdirSync(required("RESULTS_ROOT")); // Refresh the completed array directory before checking immutable outputs.
    const results=[];let runtimeIdentity=null;
    for(let i=0;i<288;i++){
        const taskRoot=path.join(required("RESULTS_ROOT"),"task-"+String(i).padStart(3,"0")),
            file=path.join(taskRoot,"cell.json"),assignment=confirmationAssignment(plan,i);
        fs.readdirSync(taskRoot); // Avoid treating a stale negative lookup as a failed simulation.
        assert.equal(fs.readFileSync(path.join(taskRoot,"COMPLETE"),"utf8").trim(),"COMPLETE_MULTIMAP_CONFIRMATION_CELL_V1");
        assert.equal(hash(read(file)),fs.readFileSync(path.join(taskRoot,"cell.sha256"),"utf8").trim().split(/\s+/)[0]);
        const cell=json(file),map=census.maps[assignment.mapIndex],spec=map.cases[assignment.mapCaseIndex];
        assert.equal(cell.kind,"multimap-v2-unchanged-confirmation-cell-v1");assert.equal(cell.complete,true);
        assert.equal(cell.taskIndex,i);assert.deepEqual(cell.assignment,assignment);assert.deepEqual(cell.map,map.map);
        assert.equal(String(cell.schedulerJobId),tasks.get(i));assert.equal(cell.schedulerAccount,"pi_jss233");
        assert.equal(cell.sourceCommit,sourceCommit);assert.equal(cell.allocationSha256,allocationSha256);
        for(const [k,v]of Object.entries(inputIdentity))assert.equal(cell[k],v);
        assert.deepEqual(cell.interfaceIdentity,census.interfaceIdentity);
        assert.equal(cell.baselineCommit,"165b77a71d0cf5ebd27c65b19d0486bcbae78d0f");
        assert.equal(cell.provenance.source.gitCommit,sourceCommit);assert.equal(cell.provenance.source.trackedDirty,false);
        assert.equal(cell.provenance.scheduler.account,"pi_jss233");
        assert.equal(cell.provenance.inputs.maps[0].sha256,map.map.sha256);
        const runtime={trees:cell.provenance.source.runtimeTrees,software:cell.provenance.software,
            environment:cell.provenance.inputs.capturedEnvironment};
        assert.deepEqual(runtime,priorScreen.runtimeIdentity);
        if(runtimeIdentity===null)runtimeIdentity=runtime;else assert.deepEqual(runtime,runtimeIdentity);
        for(const [k,v]of Object.entries(spec))assert.deepEqual(cell.result[k],v);
        const r=cell.result;assert.equal(r.quitForwarded.candidate,0);assert.equal(r.quitForwarded.baseline,0);
        assert.ok(Number.isInteger(r.updates)&&r.updates>=1&&r.updates<=90000);
        if(r.winner==="candidate"){assert.equal(r.endpointStatus,"candidate_win");assert.equal(r.terminalBuildingCounts.baseline,0);
            assert.equal(r.terminalProof.evaluation.candidatePhysicalWin,true);}
        else if(r.winner==="opponent"){assert.equal(r.endpointStatus,"baseline_win");assert.equal(r.terminalBuildingCounts.candidate,0);
            assert.equal(r.terminalProof.evaluation.baselinePhysicalWin,true);}
        else {assert.equal(r.winner,"draw");assert.ok(["tick_cap_draw","simultaneous_draw","engine_nonliteral_termination_draw"].includes(r.endpointStatus));
            if(r.endpointStatus==="tick_cap_draw")assert.equal(r.updates,90000);}
        results.push({mapIndex:assignment.mapIndex,taskIndex:i,...r});
    }
    const maps=plan.maps.map((planned)=>{
        const mapIndex=planned.mapIndex,entry=census.maps[mapIndex],rows=results.filter(r=>r.mapIndex===mapIndex);
        const expected=new Set(planned.caseIndices);assert.equal(rows.length,expected.size);
        assert.ok(rows.every(r=>expected.has(r.mapCaseIndex)&&r.repeatIndex>=1&&r.repeatIndex<=4));
        return {map:entry.map,allocation:planned,...analyzeConfirmation(rows,entry.map.startCount),
            nonliteralTerminationDrawCount:rows.filter(r=>r.endpointStatus==="engine_nonliteral_termination_draw").length,
            cells:rows.map(r=>({taskIndex:r.taskIndex,mapCaseIndex:r.mapCaseIndex,winner:r.winner,updates:r.updates,
                endpointStatus:r.endpointStatus,countryOrdinal:r.countryOrdinal,candidateSlot:r.candidateSlot,candidateStart:r.candidateStart}))};
    });
    write(required("OUT_PATH"),{kind:"multimap-v2-unchanged-confirmation-aggregate-v1",complete:true,technicalIntegrityPassed:true,
        ...inputIdentity,allocationSha256,sourceCommit,interfaceIdentity:census.interfaceIdentity,
        scheduler:{account:"pi_jss233",arrayJobId:array,finalizerJobId:jobId,taskJobIds:Object.fromEntries(tasks)},
        taskCount:288,runtimeIdentity,maps,positiveMapIds:maps.filter(m=>m.positive).map(m=>m.map.id),
        dominanceMapIds:maps.filter(m=>m.dominanceCriteriaMet).map(m=>m.map.id)});
    console.log(JSON.stringify({complete:true,maps:2,positiveMapCount:maps.filter(m=>m.positive).length}));
}
try{if(phase==="cell")await runCell();else finalize();}catch(error){console.error(error);process.exitCode=1;}
