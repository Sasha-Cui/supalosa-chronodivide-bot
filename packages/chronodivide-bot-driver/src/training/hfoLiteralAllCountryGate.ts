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
const MAP={name:"cd_chrono_4_heck_freezes_over_le.map",sha256:"e4dfc736a6355e0e68d4681e4d67419516e6bb94549e2d42880c9414e95e2e8d"} as const;
const SEED_BASE=4_229_990_000,MAX_TICKS=12_000,TRACE_INTERVAL=600;
const SHA=/^[0-9a-f]{64}$/;const isRecord=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
const fh=(p:string)=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const hv=(v:unknown)=>crypto.createHash("sha256").update(JSON.stringify(v)).digest("hex");
const reqP=(n:string)=>{const v=process.env[n];if(!v)throw new Error(`${n} required`);return path.resolve(v)};
const reqT=(n:string,r:RegExp)=>{const v=process.env[n];if(!v||!r.test(v))throw new Error(`${n} invalid`);return v};
const settings=(candidate:Bot,baseline:Bot,slot:0|1):CreateOfflineOpts=>{const mode=cdapi.getAvailableGameModes(MAP.name)[0];if(!mode)throw new Error("mode missing");
 return{buildOffAlly:false,cratesAppear:false,credits:10_000,gameMode:mode,gameSpeed:6,mapName:MAP.name,mcvRepacks:true,
 shortGame:false,superWeapons:false,unitCount:0,online:false,agents:slot===0?[candidate,baseline]:[baseline,candidate]};};
const api=(b:InspectableDeployedStrongBot):GameApi=>{if(!b.lastGameApi)throw new Error("candidate api missing");return b.lastGameApi};
const snapshot=(game:GameApi,player:string)=>game.getAllUnits().map(id=>game.getUnitData(id)).filter(u=>!!u)
 .filter(u=>u!.owner===player||(!game.areAlliedPlayers(player,u!.owner)&&game.getPlayerData(u!.owner).isCombatant))
 .map(u=>({id:u!.id,name:u!.name,owner:u!.owner===player?"self":"enemy",type:u!.type===ObjectType.Building?"building":"unit",
 hp:u!.hitPoints,x:u!.tile.rx,y:u!.tile.ry})).sort((a,b)=>a.id-b.id);

const trace=async(factory:Awaited<ReturnType<typeof loadBaselineFactory>>,country:Countries,ordinal:number,slot:0|1)=>{
 const cn=`HfoGateCandidate_${ordinal}_${slot}`,bn=`HfoGateBaseline_${ordinal}_${slot}`;
 const candidate=createDeployedStrongBotCandidate(cn,country),baseline=factory.create(bn,country);
 const adjudicator=new LiteralBuildingEliminationAdjudicator({candidate:cn,baseline:bn});
 const {audit}=installLiteralEndpointInstrumentation({candidate,baseline},adjudicator);const rows:unknown[]=[];
 return withSeededOfflineGame(cdapi,settings(candidate,baseline,slot),SEED_BASE+ordinal,
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
 const out=reqP("OUT_FILE"),program=reqP("PROGRAM_PATH"),protocol=reqP("PROTOCOL_PATH"),mixDir=reqP("MIX_DIR"),
  assetManifestPath=reqP("ASSET_MANIFEST_PATH"),ph=reqT("PROGRAM_SHA256",SHA),rh=reqT("PROTOCOL_SHA256",SHA),
  assetManifestSha256=reqT("ASSET_MANIFEST_SHA256",SHA);
 if(task<0||task>=18||process.env.SLURM_ARRAY_TASK_ID!==String(task)||fs.existsSync(out)||fh(program)!==ph||fh(protocol)!==rh||
 !process.env.BASELINE_PACKAGE_ROOT||process.env.REQUIRE_EXTERNAL_BASELINE!=="true")throw new Error("input drift");
 const repo=execFileSync("git",["rev-parse","--show-toplevel"],{encoding:"utf8"}).trim(),driver=path.join(repo,"packages","chronodivide-bot-driver");
 const commit=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();if(execFileSync("git",["branch","--show-current"],{encoding:"utf8"}).trim()!=="main"||
 execFileSync("git",["status","--short","--untracked-files=no"],{encoding:"utf8"}).trim()!==""||execFileSync("git",["rev-parse","fork/main"],{encoding:"utf8"}).trim()!==commit)throw new Error("source");
 const assetManifest=JSON.parse(fs.readFileSync(assetManifestPath,"utf8")) as unknown;
 if(!isRecord(assetManifest)||assetManifest.kind!=="private-ra2-snow-runtime"||assetManifest.releaseEligible!==false||
  path.resolve(String(assetManifest.runtimeDirectory))!==mixDir||!isRecord(assetManifest.asset)||
  path.basename(String(assetManifest.asset.path)).toLowerCase()!=="isosnow.mix"||
  fh(String(assetManifest.asset.path))!==assetManifest.asset.sha256||!fs.existsSync(path.join(mixDir,"isosnow.mix")))throw new Error("private asset manifest drifted");
 const mapPath=path.join(mixDir,MAP.name);if(fh(mapPath)!==MAP.sha256)throw new Error("map");await cdapi.init(mixDir);
 const factory=await loadBaselineFactory(path.join(repo,"packages","chronodivide-bot"));const ordinal=Math.floor(task/2),slot=task%2 as 0|1,country=COUNTRIES[ordinal];
 const manifest=createExperimentManifest({runId:`hfo-literal-gate-${task}-${process.env.SLURM_JOB_ID}`,mixDir,maps:[MAP.name],
 effectiveConfig:{task,country,slot,seed:SEED_BASE+ordinal,repeats:2,maxTicks:MAX_TICKS,outcomeFieldsWritten:false,
  assetManifestSha256},baseline:factory.descriptor,gameSeedBase:SEED_BASE+ordinal});
 if(manifest.scheduler.account!=="pi_jss233"||manifest.source.gitCommit!==commit||manifest.source.trackedDirty!==false||manifest.software.baseline.kind!=="external-package"||manifest.software.baseline.trackedDirty!==false)throw new Error("provenance");
 const first=await trace(factory,country,ordinal,slot),second=await trace(factory,country,ordinal,slot);if(JSON.stringify(first)!==JSON.stringify(second))throw new Error("nondeterministic");
 const artifact={schemaVersion:1,kind:"hfo-literal-outcome-blind-cell",status:"PASS_HFO_LITERAL_CELL",complete:true,passed:true,outcomeFree:true,
 taskIndex:task,country,candidateSlot:slot,mapName:MAP.name,mapSha256:fh(mapPath),launchedGameCount:2,schedulerAccount:"pi_jss233",schedulerJobId:process.env.SLURM_JOB_ID,
 sourceGitCommit:commit,programSha256:ph,protocolSha256:rh,assetManifestSha256,...first,provenance:manifest};fs.writeFileSync(out,JSON.stringify(artifact,null,2)+"\n",{flag:"wx",mode:0o600});
 console.log(JSON.stringify({status:artifact.status,task,start:first.candidateStart}));};
const finalize=()=>{if(process.env.SLURM_JOB_ACCOUNT!=="pi_jss233")throw new Error("account");const root=reqP("RESULTS_ROOT"),out=reqP("OUT_FILE"),array=reqT("ARRAY_JOB_ID",/^\d+$/),ph=reqT("PROGRAM_SHA256",SHA),rh=reqT("PROTOCOL_SHA256",SHA),assetManifestSha256=reqT("ASSET_MANIFEST_SHA256",SHA);if(fs.existsSync(out))throw new Error("exists");
 const raw=execFileSync("/opt/slurm/current/bin/sacct",["-j",array,"-n","-P","-X","--format=JobID,JobIDRaw,State,ExitCode,Account"],{encoding:"utf8"}),tasks=new Map<number,string>();
 for(const line of raw.split("\n").filter(Boolean)){const [l,j,s,e,a]=line.split("|"),m=new RegExp(`^${array}_(\\d+)$`).exec(l);if(m&&s==="COMPLETED"&&e==="0:0"&&a==="pi_jss233")tasks.set(Number(m[1]),j);}if(tasks.size!==18)throw new Error(`tasks ${tasks.size}`);
 const cells:Record<string,unknown>[]=[];for(let i=0;i<18;i++){const v=JSON.parse(fs.readFileSync(path.join(root,`task-${String(i).padStart(2,"0")}`,"cell.json"),"utf8")) as unknown;
 if(!isRecord(v)||v.kind!=="hfo-literal-outcome-blind-cell"||v.status!=="PASS_HFO_LITERAL_CELL"||v.passed!==true||v.outcomeFree!==true||v.taskIndex!==i||String(v.schedulerJobId)!==tasks.get(i)||v.programSha256!==ph||v.protocolSha256!==rh||v.assetManifestSha256!==assetManifestSha256)throw new Error(`cell ${i}`);cells.push(v);}
 const starts=[...new Set(cells.map(c=>`${(c.candidateStart as any).x},${(c.candidateStart as any).y}`))].sort();const passed=starts.length===4;
 const artifact={schemaVersion:1,kind:"hfo-literal-outcome-blind-gate",status:passed?"PASS_HFO_LITERAL_ALL_COUNTRY_GATE":"FAIL_HFO_LITERAL_ALL_COUNTRY_GATE",complete:true,passed,outcomeFree:true,
 schedulerAccount:"pi_jss233",arrayJobId:array,controllerJobId:process.env.SLURM_JOB_ID,launchedGameCount:36,countryCount:9,reciprocalSlotCount:2,startLocations:starts,sourceGitCommit:cells[0].sourceGitCommit,programSha256:ph,protocolSha256:rh,assetManifestSha256,schedulerJobIds:[...tasks.values()],cells};
 fs.writeFileSync(out,JSON.stringify(artifact,null,2)+"\n",{flag:"wx",mode:0o600});console.log(JSON.stringify({status:artifact.status,startLocations:starts}));if(!passed)process.exitCode=2;};
const main=async()=>{const m=reqT("MODE",/^(cell|finalize)$/);if(m==="cell")await cell();else finalize();};const invoked=process.argv[1]?pathToFileURL(path.resolve(process.argv[1])).href:null;if(import.meta.url===invoked)main().catch(e=>{console.error(e);process.exitCode=1;});
