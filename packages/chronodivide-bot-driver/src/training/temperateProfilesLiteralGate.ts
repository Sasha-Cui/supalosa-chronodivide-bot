import { Bot, CreateOfflineOpts, GameApi, ObjectType, cdapi } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { withSeededOfflineGame } from "../benchmark/seededOfflineGame.js";
import { createDeployedStrongBotCandidate, InspectableDeployedStrongBot } from "./deployedStrongBotCandidate.js";
import { LiteralBuildingEliminationAdjudicator, installLiteralEndpointInstrumentation } from "./literalBuildingEliminationEndpoint.js";

const COUNTRIES=[Countries.USA,Countries.KOREA,Countries.FRANCE,Countries.GERMANY,Countries.GREAT_BRITAIN,
 Countries.LIBYA,Countries.IRAQ,Countries.CUBA,Countries.RUSSIA] as const;
const MAPS=[
 {name:"cd_2_tikal.map",sha256:"c4bf8d58d93957aaf7ee1708a956e67bd89e9021b32c240c7bba5cc953ac8ca6"},
 {name:"cd_2_peak_of_perfection.map",sha256:"440715dc154ac10b4b922159824140d40c48990311c6838345b66958f3b3a442"},
] as const;
const SEED_BASE=4_230_090_000,MAX_TICKS=12_000,TRACE_INTERVAL=600;
const SHA=/^[0-9a-f]{64}$/;const isRecord=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
const fh=(p:string)=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const hv=(v:unknown)=>crypto.createHash("sha256").update(JSON.stringify(v)).digest("hex");
const reqP=(n:string)=>{const v=process.env[n];if(!v)throw new Error(`${n} required`);return path.resolve(v)};
const reqT=(n:string,r:RegExp)=>{const v=process.env[n];if(!v||!r.test(v))throw new Error(`${n} invalid`);return v};
const settings=(mapName:string,candidate:Bot,baseline:Bot,slot:0|1):CreateOfflineOpts=>{const mode=cdapi.getAvailableGameModes(mapName)[0];if(!mode)throw new Error("mode missing");
 return{buildOffAlly:false,cratesAppear:false,credits:10_000,gameMode:mode,gameSpeed:6,mapName,mcvRepacks:true,
 shortGame:false,superWeapons:false,unitCount:0,online:false,agents:slot===0?[candidate,baseline]:[baseline,candidate]};};
const api=(b:InspectableDeployedStrongBot):GameApi=>{if(!b.lastGameApi)throw new Error("candidate api missing");return b.lastGameApi};
const snapshot=(game:GameApi,player:string)=>game.getAllUnits().map(id=>game.getUnitData(id)).filter(u=>!!u)
 .filter(u=>u!.owner===player||(!game.areAlliedPlayers(player,u!.owner)&&game.getPlayerData(u!.owner).isCombatant))
 .map(u=>({id:u!.id,name:u!.name,owner:u!.owner===player?"self":"enemy",type:u!.type===ObjectType.Building?"building":"unit",
 hp:u!.hitPoints,x:u!.tile.rx,y:u!.tile.ry})).sort((a,b)=>a.id-b.id);

const trace=async(factory:Awaited<ReturnType<typeof loadBaselineFactory>>,mapName:string,country:Countries,ordinal:number,slot:0|1,seed:number)=>{
 const cn=`HfoGateCandidate_${ordinal}_${slot}`,bn=`HfoGateBaseline_${ordinal}_${slot}`;
 const candidate=createDeployedStrongBotCandidate(cn,country),baseline=factory.create(bn,country);
 const adjudicator=new LiteralBuildingEliminationAdjudicator({candidate:cn,baseline:bn});
 const {audit}=installLiteralEndpointInstrumentation({candidate,baseline},adjudicator);const rows:unknown[]=[];
 return withSeededOfflineGame(cdapi,settings(mapName,candidate,baseline,slot),seed,
 [{agent:candidate,identity:"candidate"},{agent:baseline,identity:"baseline"}],async game=>{
  const g=api(candidate);const cs=g.getPlayerData(cn).startLocation,bs=g.getPlayerData(bn).startLocation;let ticks=0;
  while(ticks<MAX_TICKS&&!game.isFinished()){
   adjudicator.beginUpdate(g);await game.update();ticks++;
   const stats=game.getPlayerStats(),c=stats.find(x=>x.name===cn),b=stats.find(x=>x.name===bn);if(!c||!b)throw new Error("stats missing");
   adjudicator.completeUpdate(g,{finished:game.isFinished(),defeated:{candidate:c.defeated,baseline:b.defeated}});
   if(ticks%TRACE_INTERVAL===0)rows.push({tick:ticks,units:snapshot(g,cn)});
  }
  if(audit.forwarded.candidate!==0||audit.forwarded.baseline!==0)throw new Error("quit forwarded");
  return{traceSha256:hv(rows),candidateStart:{x:cs.x,y:cs.y},baselineStart:{x:bs.x,y:bs.y}};
 });
};
const cell=async()=>{if(process.env.SLURM_JOB_ACCOUNT!=="pi_jss233")throw new Error("account");const task=Number(reqT("TASK_INDEX",/^\d+$/));
 const out=reqP("OUT_FILE"),program=reqP("PROGRAM_PATH"),protocol=reqP("PROTOCOL_PATH"),ph=reqT("PROGRAM_SHA256",SHA),rh=reqT("PROTOCOL_SHA256",SHA);
 if(task<0||task>=36||process.env.SLURM_ARRAY_TASK_ID!==String(task)||fs.existsSync(out)||fh(program)!==ph||fh(protocol)!==rh||
 !process.env.BASELINE_PACKAGE_ROOT||process.env.REQUIRE_EXTERNAL_BASELINE!=="true")throw new Error("input drift");
 const repo=execFileSync("git",["rev-parse","--show-toplevel"],{encoding:"utf8"}).trim(),driver=path.join(repo,"packages","chronodivide-bot-driver");
 const commit=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();if(execFileSync("git",["branch","--show-current"],{encoding:"utf8"}).trim()!=="main"||
 execFileSync("git",["status","--short","--untracked-files=no"],{encoding:"utf8"}).trim()!==""||execFileSync("git",["rev-parse","fork/main"],{encoding:"utf8"}).trim()!==commit)throw new Error("source");
 const mapOrdinal=Math.floor(task/18),within=task%18,ordinal=Math.floor(within/2),slot=within%2 as 0|1;
 const map=MAPS[mapOrdinal],country=COUNTRIES[ordinal],seed=SEED_BASE+mapOrdinal*9+ordinal;
 const mapPath=path.join(driver,"data",map.name);if(fh(mapPath)!==map.sha256)throw new Error("map");await cdapi.init(path.join(driver,"data"));
 const factory=await loadBaselineFactory(path.join(repo,"packages","chronodivide-bot"));
 const manifest=createExperimentManifest({runId:`temperate-profiles-literal-gate-${task}-${process.env.SLURM_JOB_ID}`,mixDir:path.join(driver,"data"),maps:[map.name],
 effectiveConfig:{task,mapOrdinal,country,slot,seed,repeats:2,maxTicks:MAX_TICKS,outcomeFieldsWritten:false},baseline:factory.descriptor,gameSeedBase:seed});
 if(manifest.scheduler.account!=="pi_jss233"||manifest.source.gitCommit!==commit||manifest.source.trackedDirty!==false||manifest.software.baseline.kind!=="external-package"||manifest.software.baseline.trackedDirty!==false)throw new Error("provenance");
 const first=await trace(factory,map.name,country,ordinal,slot,seed),second=await trace(factory,map.name,country,ordinal,slot,seed);if(JSON.stringify(first)!==JSON.stringify(second))throw new Error("nondeterministic");
 const artifact={schemaVersion:1,kind:"temperate-profiles-literal-outcome-blind-cell",status:"PASS_HFO_LITERAL_CELL",complete:true,passed:true,outcomeFree:true,
 taskIndex:task,mapOrdinal,country,candidateSlot:slot,mapName:map.name,mapSha256:fh(mapPath),launchedGameCount:2,schedulerAccount:"pi_jss233",schedulerJobId:process.env.SLURM_JOB_ID,
 sourceGitCommit:commit,programSha256:ph,protocolSha256:rh,...first,provenance:manifest};fs.writeFileSync(out,JSON.stringify(artifact,null,2)+"\n",{flag:"wx",mode:0o600});
 console.log(JSON.stringify({status:artifact.status,task,start:first.candidateStart}));};
const finalize=()=>{if(process.env.SLURM_JOB_ACCOUNT!=="pi_jss233")throw new Error("account");const root=reqP("RESULTS_ROOT"),out=reqP("OUT_FILE"),array=reqT("ARRAY_JOB_ID",/^\d+$/),ph=reqT("PROGRAM_SHA256",SHA),rh=reqT("PROTOCOL_SHA256",SHA);if(fs.existsSync(out))throw new Error("exists");
 const raw=execFileSync("/opt/slurm/current/bin/sacct",["-j",array,"-n","-P","-X","--format=JobID,JobIDRaw,State,ExitCode,Account"],{encoding:"utf8"}),tasks=new Map<number,string>();
 for(const line of raw.split("\n").filter(Boolean)){const [l,j,s,e,a]=line.split("|"),m=new RegExp(`^${array}_(\\d+)$`).exec(l);if(m&&s==="COMPLETED"&&e==="0:0"&&a==="pi_jss233")tasks.set(Number(m[1]),j);}if(tasks.size!==36)throw new Error(`tasks ${tasks.size}`);
 const cells:Record<string,unknown>[]=[];for(let i=0;i<36;i++){const v=JSON.parse(fs.readFileSync(path.join(root,`task-${String(i).padStart(2,"0")}`,"cell.json"),"utf8")) as unknown;
 if(!isRecord(v)||v.kind!=="temperate-profiles-literal-outcome-blind-cell"||v.status!=="PASS_HFO_LITERAL_CELL"||v.passed!==true||v.outcomeFree!==true||v.taskIndex!==i||String(v.schedulerJobId)!==tasks.get(i)||v.programSha256!==ph||v.protocolSha256!==rh)throw new Error(`cell ${i}`);cells.push(v);}
 const startLocations=Object.fromEntries(MAPS.map((map,mapOrdinal)=>[map.name,[...new Set(cells.filter(c=>c.mapOrdinal===mapOrdinal)
  .map(c=>`${(c.candidateStart as any).x},${(c.candidateStart as any).y}`))].sort()]));
 const passed=Object.values(startLocations).every(starts=>starts.length===2);
 const artifact={schemaVersion:1,kind:"temperate-profiles-literal-outcome-blind-gate",status:passed?"PASS_TEMPERATE_PROFILES_LITERAL_GATE":"FAIL_TEMPERATE_PROFILES_LITERAL_GATE",complete:true,passed,outcomeFree:true,
 schedulerAccount:"pi_jss233",arrayJobId:array,controllerJobId:process.env.SLURM_JOB_ID,launchedGameCount:72,countryCount:9,mapCount:2,reciprocalSlotCount:2,startLocations,sourceGitCommit:cells[0].sourceGitCommit,programSha256:ph,protocolSha256:rh,schedulerJobIds:[...tasks.values()],cells};
 fs.writeFileSync(out,JSON.stringify(artifact,null,2)+"\n",{flag:"wx",mode:0o600});console.log(JSON.stringify({status:artifact.status,startLocations}));if(!passed)process.exitCode=2;};
const main=async()=>{const m=reqT("MODE",/^(cell|finalize)$/);if(m==="cell")await cell();else finalize();};const invoked=process.argv[1]?pathToFileURL(path.resolve(process.argv[1])).href:null;if(import.meta.url===invoked)main().catch(e=>{console.error(e);process.exitCode=1;});
