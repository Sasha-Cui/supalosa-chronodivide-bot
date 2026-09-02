import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { ORIGINAL_GAME_API_SHA256, EXPLICIT_START_SYMBOL, sha256, transformExplicitStartRuntime } from
    "../runtime/explicit-start-transform-v1.mjs";

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const driver=path.join(repo,"packages/chronodivide-bot-driver");
const require=createRequire(path.join(driver,"package.json"));
const load=(relative)=>import(pathToFileURL(path.join(driver,"dist",relative)).href);
const required=(key)=>{if(!process.env[key])throw Error(key+" required");return process.env[key];};
const read=(file)=>fs.readFileSync(file);
const digest=(object)=>sha256(JSON.stringify(object));
const phase=process.argv[2];
assert.ok(["reference","shim"].includes(phase));
assert.equal(required("SLURM_JOB_ACCOUNT"),"pi_jss233");
assert.equal(execFileSync("git",["branch","--show-current"],{cwd:repo,encoding:"utf8"}).trim(),"main");
assert.equal(execFileSync("git",["status","--porcelain","--untracked-files=no"],{cwd:repo,encoding:"utf8"}).trim(),"");
const sourceCommit=execFileSync("git",["rev-parse","HEAD"],{cwd:repo,encoding:"utf8"}).trim();
assert.equal(execFileSync("git",["rev-parse","fork/main"],{cwd:repo,encoding:"utf8"}).trim(),sourceCommit);
const runtimePath=fs.realpathSync(require.resolve("@chronodivide/game-api"));
assert.equal(runtimePath,fs.realpathSync(required("CHRONO_GAME_API_PATH")));
assert.equal(sha256(read(runtimePath)),ORIGINAL_GAME_API_SHA256);
const inventoryPath=path.join(repo,"research/MAP_SUITE_V2_INVENTORY.md");
assert.equal(sha256(read(inventoryPath)),"43c157c8b7263dd9eb56f1257b5a725e912178802722a3a585365f3584ba3a25");
const amendmentPath=path.join(repo,"research/protocols/maps/2026-09-02-multimap-explicit-start-interface-amendment-1.md");
assert.equal(sha256(read(amendmentPath)),required("AMENDMENT_SHA256"));
assert.equal(sha256(read(fileURLToPath(import.meta.url))),required("SMOKE_PROGRAM_SHA256"));
assert.equal(sha256(read(path.join(repo,"research/runtime/explicit-start-loader-v1.mjs"))),required("LOADER_SHA256"));
assert.equal(sha256(read(path.join(repo,"research/runtime/explicit-start-transform-v1.mjs"))),required("TRANSFORM_SHA256"));
const maps=read(inventoryPath).toString().split("\n").filter(line=>line.startsWith("|"))
    .map(line=>line.split("|").map(x=>x.trim())).filter(parts=>/^\d+$/.test(parts[3])&&parts[4]?.startsWith("`"))
    .map(parts=>({label:parts[1],startCount:Number(parts[3]),fileName:parts[4].replaceAll("`",""),sha256:parts[5].replaceAll("`","")}))
    .filter(map=>!["cd_chrono_4_heck_freezes_over_le.map","cd_2_peak_of_perfection.map"].includes(map.fileName));
assert.equal(maps.length,13);
const mixDir=required("MIX_DIR");
const assetPath=required("ASSET_MANIFEST_PATH");
assert.equal(sha256(read(assetPath)),"d942117f24363818977d573dbc87006a9b320c6861bddf939d5fc80db2217e67");
assert.equal(JSON.parse(read(assetPath)).runtimeDirectory,mixDir);
for(const map of maps)assert.equal(sha256(read(path.join(mixDir,map.fileName))),map.sha256);
const {Bot,cdapi}=await import(pathToFileURL(runtimePath).href);
const {StrongBot}=await import(pathToFileURL(require.resolve("@supalosa/chronodivide-bot/dist/bot/strongBot.js")).href);
const {Countries}=await import(pathToFileURL(require.resolve("@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js")).href);
const {loadBaselineFactory}=await load("benchmark/baselineLoader.js");
const {withSeededOfflineGame}=await load("benchmark/seededOfflineGame.js");
const {LiteralBuildingEliminationAdjudicator,installLiteralEndpointInstrumentation}=await load("training/literalBuildingEliminationEndpoint.js");
const countries=[Countries.USA,Countries.KOREA,Countries.FRANCE,Countries.GERMANY,Countries.GREAT_BRITAIN,
    Countries.LIBYA,Countries.IRAQ,Countries.CUBA,Countries.RUSSIA];
const baseline=await loadBaselineFactory(path.join(repo,"packages/chronodivide-bot"));
assert.equal(baseline.descriptor.kind,"external-package");
assert.equal(execFileSync("git",["-C",baseline.descriptor.packageRoot,"rev-parse","HEAD"],{encoding:"utf8"}).trim(),
    "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f");
assert.equal(execFileSync("git",["-C",baseline.descriptor.packageRoot,"status","--porcelain","--untracked-files=no"],{encoding:"utf8"}).trim(),"");
if(phase==="reference")assert.equal(globalThis[Symbol.for(EXPLICIT_START_SYMBOL)],undefined);
else assert.equal(globalThis[Symbol.for(EXPLICIT_START_SYMBOL)]?.originalSha256,ORIGINAL_GAME_API_SHA256);
await cdapi.init(mixDir);
const point=(value)=>[value.x,value.y];
const snapshot=(api,names)=>({
    update:api.getCurrentTick(),
    players:names.map(name=>({name: name===names[0]?"candidate":"opponent",
        credits:api.getPlayerData(name).credits,start:point(api.getPlayerData(name).startLocation)})),
    units:api.getAllUnits().map(id=>api.getUnitData(id)).filter(Boolean).map(unit=>({
        id:unit.id,owner:unit.owner===names[0]?"candidate":unit.owner===names[1]?"opponent":"neutral",
        rule:unit.rules.name,hp:unit.hitPoints,x:unit.tile.rx,y:unit.tile.ry,
    })).sort((a,b)=>a.id-b.id),
});
function auditActions(bot,events){
    const start=bot.onGameStart.bind(bot);
    bot.onGameStart=(api)=>{
        const actions=bot.player.actions;
        for(const method of ["queueForProduction","unqueueFromProduction","pauseProduction","resumeProduction",
            "orderUnits","placeBuilding","sellBuilding"]){
            if(typeof actions[method]!=="function")continue;
            const original=actions[method].bind(actions);
            actions[method]=(...args)=>{events.push({update:api.getCurrentTick(),method,argsSha256:digest(args)});return original(...args);};
        }
        return start(api);
    };
}
let initialized=0;
async function runOne(mapIndex,countryOrdinal,slot,seed,positions=null){
    const map=maps[mapIndex],country=countries[countryOrdinal],
        candidateName="MMExplicitCandidate_"+mapIndex+"_"+countryOrdinal+"_"+slot,
        opponentName="MMExplicitOpponent_"+mapIndex+"_"+countryOrdinal+"_"+slot,
        candidate=new StrongBot(candidateName,country,[],false),opponent=baseline.create(opponentName,country);
    assert.ok(candidate instanceof Bot);assert.ok(opponent instanceof Bot);
    if(positions){
        assert.equal(phase,"shim");assert.notEqual(positions[0],positions[1]);
        for(const index of positions)assert.ok(Number.isInteger(index)&&index>=0&&index<map.startCount);
        candidate.chronoResearchStartPos=positions[0];opponent.chronoResearchStartPos=positions[1];
    }
    const adjudicator=new LiteralBuildingEliminationAdjudicator({candidate:candidateName,baseline:opponentName});
    const {audit}=installLiteralEndpointInstrumentation({candidate,baseline:opponent},adjudicator);
    const actions={candidate:[],opponent:[]};
    auditActions(candidate,actions.candidate);auditActions(opponent,actions.opponent);
    const settings={buildOffAlly:false,cratesAppear:false,credits:10000,gameMode:cdapi.getAvailableGameModes(map.fileName)[0],
        gameSpeed:6,mapName:map.fileName,mcvRepacks:true,shortGame:false,superWeapons:false,unitCount:0,
        online:false,agents:slot===0?[candidate,opponent]:[opponent,candidate]};
    initialized++;
    return withSeededOfflineGame(cdapi,settings,seed,[{agent:candidate,identity:"candidate"},{agent:opponent,identity:"opponent"}],
        async game=>{
            const api=candidate.lastGameApi,other=opponent.lastGameApi,names=[candidateName,opponentName];
            assert.ok(api&&other);assert.equal(api.getCurrentTick(),0);
            const starts=api.map.getStartingLocations().map(point);
            assert.equal(starts.length,map.startCount);
            const actual=names.map(name=>point(api.getPlayerData(name).startLocation));
            if(positions)assert.deepEqual(actual,positions.map(index=>starts[index]));
            const before={candidate:digest(snapshot(api,names)),opponent:digest(snapshot(other,names))};
            await game.update();assert.equal(api.getCurrentTick(),1);assert.equal(other.getCurrentTick(),1);
            const after={candidate:digest(snapshot(api,names)),opponent:digest(snapshot(other,names))};
            assert.equal(audit.forwarded.candidate,0);assert.equal(audit.forwarded.baseline,0);
            return {seed,countryOrdinal,slot,starts,actual,updateCount:1,before,after,
                actionHashes:{candidate:digest(actions.candidate),opponent:digest(actions.opponent)},
                quitAttempts:{...audit.attempts},quitForwarded:{...audit.forwarded}};
        });
}
const referencePath=required("REFERENCE_PATH"),out=required("OUT_PATH");
assert.ok(!fs.existsSync(out));
let reference=null;
if(phase==="shim"){
    assert.equal(sha256(read(referencePath)),required("REFERENCE_SHA256"));
    reference=JSON.parse(read(referencePath));
    assert.equal(reference.complete,true);assert.equal(reference.sourceCommit,sourceCommit);
    assert.equal(reference.phase,"reference");assert.equal(reference.maps.length,13);
}
const mapResults=[];
for(let mapIndex=0;mapIndex<maps.length;mapIndex++){
    const map=maps[mapIndex],base=3_009_000_000+mapIndex*10000,natural=[];
    for(const slot of [0,1]){
        const trace=await runOne(mapIndex,0,slot,base+slot);
        natural.push(trace);
        if(reference){
            assert.deepEqual(trace,reference.maps[mapIndex].natural[slot]);
            const positions=trace.actual.map(coordinates=>trace.starts.findIndex(p=>JSON.stringify(p)===JSON.stringify(coordinates)));
            assert.deepEqual(await runOne(mapIndex,0,slot,base+slot,positions),trace);
        }
    }
    let pairCases=0,countryCases=0;
    const pairHashes=[],countryHashes=[];
    if(phase==="shim"){
        for(let a=0;a<map.startCount;a++)for(let b=0;b<map.startCount;b++)if(a!==b)for(const slot of [0,1]){
            const seed=base+1000+2*(a*map.startCount+b)+slot;
            const first=await runOne(mapIndex,0,slot,seed,[a,b]),second=await runOne(mapIndex,0,slot,seed,[a,b]);
            assert.deepEqual(first,second);pairHashes.push({a,b,slot,seed,traceSha256:digest(first)});pairCases++;
        }
        for(let country=0;country<9;country++)for(const slot of [0,1]){
            const seed=base+2000+2*country+slot;
            const first=await runOne(mapIndex,country,slot,seed,[0,1]),second=await runOne(mapIndex,country,slot,seed,[0,1]);
            assert.deepEqual(first,second);countryHashes.push({country,slot,seed,traceSha256:digest(first)});countryCases++;
        }
        assert.equal(pairCases,2*map.startCount*(map.startCount-1));assert.equal(countryCases,18);
    }
    mapResults.push({map,natural,pairCases,countryCases,pairHashes,countryHashes});
}
assert.equal(initialized, phase === "reference" ? 26 : 1264);
const artifact={kind:"multimap-v2-explicit-start-compatibility-v1",phase,complete:true,passed:true,outcomeFree:true,
    sourceCommit,schedulerAccount:required("SLURM_JOB_ACCOUNT"),schedulerJobId:required("SLURM_JOB_ID"),
    programSha256:required("SMOKE_PROGRAM_SHA256"),amendmentSha256:required("AMENDMENT_SHA256"),
    loaderSha256:required("LOADER_SHA256"),transformSha256:required("TRANSFORM_SHA256"),
    originalRuntimeSha256:ORIGINAL_GAME_API_SHA256,
    effectiveRuntimeSha256:phase==="reference"?ORIGINAL_GAME_API_SHA256:sha256(transformExplicitStartRuntime(read(runtimePath))),
    initializedGameCount:initialized,updatesPerInitialization:1,maps:mapResults};
const forbidden=/^(winner|wins|loss|losses|draw|draws|score|defeated|terminal|terminalBuildingCounts|finished)$/i;
function check(value){if(!value||typeof value!=="object")return;for(const [key,child]of Object.entries(value)){
    if(forbidden.test(key))throw Error("Prohibited competitive field "+key);check(child);}}
check(artifact);assert.equal(sha256(read(runtimePath)),ORIGINAL_GAME_API_SHA256);
fs.writeFileSync(out,JSON.stringify(artifact,null,2)+"\n",{flag:"wx",mode:0o600});
console.log(JSON.stringify({phase,complete:true,mapCount:mapResults.length,initializedGameCount:initialized}));
