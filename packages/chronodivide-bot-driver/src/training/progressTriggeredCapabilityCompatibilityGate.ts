import { Bot, CreateOfflineOpts, cdapi } from "@chronodivide/game-api";
import { AttackMissionFactoryTelemetry } from "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/attackMission.js";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadBaselineFactory } from "../benchmark/baselineLoader.js";
import { createExperimentManifest } from "../benchmark/provenance.js";
import { withSeededOfflineGame } from "../benchmark/seededOfflineGame.js";
import { buildProgressCertifiedConversionPolicyV5 } from "./progressCertifiedConversionPolicyV5.js";
import {
    ProgressTriggeredCapabilityPolicy,
    ProgressTriggeredCapabilityTelemetry,
    buildProgressTriggeredCapabilityPolicy,
    createProgressTriggeredCapabilityCandidate,
    progressTriggeredAirUnit,
    progressTriggeredCapabilityPolicySha256,
} from "./progressTriggeredCapabilityCandidate.js";
import {
    ProgressTriggeredReplacementPolicy,
    ProgressTriggeredReplacementTelemetry,
    buildProgressTriggeredReplacementPolicy,
    createProgressTriggeredAttackReplacementCandidate,
    progressTriggeredReplacementPolicySha256,
} from "./progressTriggeredAttackReplacementCandidate.js";

const COUNTRIES = [Countries.USA, Countries.KOREA, Countries.FRANCE, Countries.GERMANY,
    Countries.GREAT_BRITAIN, Countries.LIBYA, Countries.IRAQ, Countries.CUBA, Countries.RUSSIA] as const;
const ALLIED = new Set<Countries>(COUNTRIES.slice(0, 5));
const VARIANTS = [
    { id: "early_distance", replacement: buildProgressTriggeredReplacementPolicy({ activationNotBeforeTick: 9_000,
        stagnationWindowTicks: 3_000, targetPriority: "distance" }), capability: buildProgressTriggeredCapabilityPolicy(0) },
    { id: "early_distance_air2", replacement: buildProgressTriggeredReplacementPolicy({ activationNotBeforeTick: 9_000,
        stagnationWindowTicks: 3_000, targetPriority: "distance" }), capability: buildProgressTriggeredCapabilityPolicy(2) },
    { id: "conservative_distance_air2", replacement: buildProgressTriggeredReplacementPolicy({ activationNotBeforeTick: 12_000,
        stagnationWindowTicks: 3_600, targetPriority: "distance" }), capability: buildProgressTriggeredCapabilityPolicy(2) },
    { id: "conservative_distance_air4", replacement: buildProgressTriggeredReplacementPolicy({ activationNotBeforeTick: 12_000,
        stagnationWindowTicks: 3_600, targetPriority: "distance" }), capability: buildProgressTriggeredCapabilityPolicy(4) },
] as const;
const MAPS = [
    { name: "cd_chrono_offensedefense.map", sha256: "94043927a79a30df9394ac6d6195e0d2926863fdad9c412556d0cc7af409f11a" },
    { name: "cd_chrono_mp25mw.map", sha256: "4b90f4eb66bdc19721b9033a268cbafd1b839ea93ed0ad35d6728485e8a177bf" },
] as const;
const SEED_BASE = 4_227_490_000;
const MAX_TICKS = 18_000;
const SHA256 = /^[0-9a-f]{64}$/;
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const fileHash = (p: string): string => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const hash = (v: unknown): string => crypto.createHash("sha256").update(JSON.stringify(v)).digest("hex");
const requiredPath = (n: string): string => { const v=process.env[n]; if(!v) throw new Error(`${n} is required`); return path.resolve(v); };
const requiredText = (n: string, r: RegExp): string => { const v=process.env[n]; if(!v||!r.test(v)) throw new Error(`${n} is invalid`); return v; };
const settings = (mapName:string,candidate:Bot,baseline:Bot,slot:0|1):CreateOfflineOpts => {
    const gameMode=cdapi.getAvailableGameModes(mapName)[0]; if(!gameMode) throw new Error("No game mode");
    return {buildOffAlly:false,cratesAppear:false,credits:10_000,gameMode,gameSpeed:6,mapName,mcvRepacks:true,
        shortGame:false,superWeapons:false,unitCount:0,online:false,agents:slot===0?[candidate,baseline]:[baseline,candidate]};
};

type Trace = { replacement: ProgressTriggeredReplacementTelemetry[]; factory: AttackMissionFactoryTelemetry[];
    capability: ProgressTriggeredCapabilityTelemetry[] };
const validateTrace = (trace:Trace, policy:ProgressTriggeredReplacementPolicy, capabilityPolicy:ProgressTriggeredCapabilityPolicy,
    country:Countries):void => {
    if(trace.replacement.length>1) throw new Error("Replacement occurred more than once");
    for(const e of trace.replacement){
        if(e.schemaVersion!==1||e.event!=="attack_factory_replaced"||e.informationBoundary!=="public_complete_state"||
            e.targetPriority!==policy.targetPriority||e.tick<policy.activationNotBeforeTick||
            e.ticksSinceBuildingProgress<policy.stagnationWindowTicks||
            JSON.stringify(e.existingMissionNamesBefore)!==JSON.stringify(e.existingMissionNamesAfter)||
            !Array.isArray(e.forbiddenFieldsEmitted)||e.forbiddenFieldsEmitted.length!==0||
            /(winner|loser|score|outcome|endpoint|resignation|evaluator)/i.test(JSON.stringify(e)))
            throw new Error("Replacement telemetry is invalid");
    }
    const swapTick=trace.replacement[0]?.tick??Number.POSITIVE_INFINITY;
    const names=new Set<string>();
    for(const e of trace.factory){
        if(e.schemaVersion!==1||e.event!=="attack_mission_created"||e.informationBoundary!=="public_complete_state"||
            e.targetPriority!==policy.targetPriority||e.tick<swapTick||names.has(e.missionName)||
            !isRecord(e.composition)||!isRecord(e.composition.composition)||!isRecord(e.target)||
            !Array.isArray(e.forbiddenFieldsEmitted)||e.forbiddenFieldsEmitted.length!==0||
            /(winner|loser|score|outcome|endpoint|resignation|evaluator)/i.test(JSON.stringify(e)))
            throw new Error("Post-replacement factory telemetry is invalid");
        names.add(e.missionName);
    }
    for(const e of trace.capability){
        if(e.schemaVersion!==1||e.informationBoundary!=="public_complete_state"||e.country!==country||
            e.unitName!==progressTriggeredAirUnit(country)||e.targetCount!==capabilityPolicy.airTargetCount||
            !Array.isArray(e.releasedUnitIds)||!Array.isArray(e.forbiddenFieldsEmitted)||e.forbiddenFieldsEmitted.length!==0||
            /(winner|loser|score|outcome|endpoint|resignation|evaluator)/i.test(JSON.stringify(e)))
            throw new Error("Capability telemetry is invalid");
    }
};

const runTrace=async(args:{factory:Awaited<ReturnType<typeof loadBaselineFactory>>;country:Countries;ordinal:number;
    slot:0|1;mapName:string;variant:{id:string;replacement:ProgressTriggeredReplacementPolicy;
    capability:ProgressTriggeredCapabilityPolicy}}):Promise<Trace>=>{
    const replacement:ProgressTriggeredReplacementTelemetry[]=[]; const factoryEvents:AttackMissionFactoryTelemetry[]=[];
    const capabilityEvents:ProgressTriggeredCapabilityTelemetry[]=[];
    const candidateName=`DeferredGateCandidate_${args.ordinal}_${args.slot}_${args.variant.id}`;
    const baselineName=`DeferredGateBaseline_${args.ordinal}_${args.slot}_${args.variant.id}`;
    const v5={...buildProgressCertifiedConversionPolicyV5(),enabled:false};
    const candidate=createProgressTriggeredCapabilityCandidate(args.factory,candidateName,args.country,v5,
        args.variant.replacement,args.variant.capability,
        {v5:()=>undefined,replacement:e=>replacement.push(e),attackFactory:e=>factoryEvents.push(e),
            capability:e=>capabilityEvents.push(e)});
    const baseline=args.factory.create(baselineName,args.country); const task=args.ordinal*2+args.slot;
    await withSeededOfflineGame(cdapi,settings(args.mapName,candidate,baseline,args.slot),SEED_BASE+task,
        [{agent:candidate,identity:"candidate"},{agent:baseline,identity:"baseline"}],async game=>{
            for(let tick=0;tick<MAX_TICKS&&!game.isFinished();tick++) await game.update();
        });
    const trace={replacement,factory:factoryEvents,capability:capabilityEvents};
    validateTrace(trace,args.variant.replacement,args.variant.capability,args.country); return trace;
};

const cell=async():Promise<void>=>{
    if(process.env.SLURM_JOB_ACCOUNT!=="pi_jss233") throw new Error("Cell requires pi_jss233");
    const task=Number(requiredText("TASK_INDEX",/^\d+$/)); const out=requiredPath("OUT_FILE");
    const program=requiredPath("PROGRAM_PATH"), protocol=requiredPath("PROTOCOL_PATH");
    const ph=requiredText("PROGRAM_SHA256",SHA256), rh=requiredText("PROTOCOL_SHA256",SHA256);
    if(task<0||task>=18||process.env.SLURM_ARRAY_TASK_ID!==String(task)||fs.existsSync(out)||fileHash(program)!==ph||
        fileHash(protocol)!==rh||!process.env.BASELINE_PACKAGE_ROOT||process.env.REQUIRE_EXTERNAL_BASELINE!=="true")
        throw new Error("Cell input drifted");
    const repo=execFileSync("git",["rev-parse","--show-toplevel"],{encoding:"utf8"}).trim();
    const driver=path.join(repo,"packages","chronodivide-bot-driver"); const commit=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
    if(execFileSync("git",["branch","--show-current"],{encoding:"utf8"}).trim()!=="main"||
        execFileSync("git",["status","--short","--untracked-files=no"],{encoding:"utf8"}).trim()!==""||
        execFileSync("git",["rev-parse","fork/main"],{encoding:"utf8"}).trim()!==commit) throw new Error("Source is not clean pushed main");
    const ordinal=Math.floor(task/2), slot=task%2 as 0|1, country=COUNTRIES[ordinal], map=MAPS[task%2];
    if(fileHash(path.join(driver,"data",map.name))!==map.sha256) throw new Error("Map drifted");
    await cdapi.init(path.join(driver,"data")); const factory=await loadBaselineFactory(path.join(repo,"packages","chronodivide-bot"));
    const manifest=createExperimentManifest({runId:`deferred-gate-${task}-${process.env.SLURM_JOB_ID}`,mixDir:path.join(driver,"data"),
        maps:[map.name],effectiveConfig:{task,country,slot,variants:VARIANTS.map(v=>({id:v.id,replacement:v.replacement,capability:v.capability})),repeats:2,
        seed:SEED_BASE+task,maxTicks:MAX_TICKS,outcomeFieldsWritten:false},baseline:factory.descriptor,gameSeedBase:SEED_BASE+task});
    if(manifest.scheduler.account!=="pi_jss233"||manifest.source.gitCommit!==commit||manifest.source.trackedDirty!==false||
        manifest.software.baseline.kind!=="external-package"||manifest.software.baseline.trackedDirty!==false||manifest.inputs.maps[0]?.sha256!==map.sha256)
        throw new Error("Provenance failed");
    const variants=[];
    for(const variant of VARIANTS){
        const first=await runTrace({factory,country,ordinal,slot,mapName:map.name,variant});
        const second=await runTrace({factory,country,ordinal,slot,mapName:map.name,variant});
        if(JSON.stringify(first)!==JSON.stringify(second)) throw new Error(`${variant.id} is nondeterministic`);
        variants.push({id:variant.id,
            replacementPolicySha256:progressTriggeredReplacementPolicySha256(variant.replacement),
            capabilityPolicySha256:progressTriggeredCapabilityPolicySha256(variant.capability),
            traceSha256:hash(first),replacementCount:first.replacement.length,missionCount:first.factory.length,
            capabilityEventCount:first.capability.length,
            capabilityRequestCount:first.capability.filter(e=>e.event==="capability_structure_request"||e.event==="capability_unit_request").length,
            capabilityReleaseCount:first.capability.filter(e=>e.event==="capability_unit_release").length,
            replacementTick:first.replacement[0]?.tick??null});
    }
    const artifact={schemaVersion:1,kind:"progress-triggered-capability-outcome-blind-cell",
        status:"PASS_PROGRESS_TRIGGERED_CAPABILITY_CELL",complete:true,passed:true,outcomeFree:true,taskIndex:task,
        country,candidateSlot:slot,map,launchedGameCount:8,schedulerAccount:"pi_jss233",schedulerJobId:process.env.SLURM_JOB_ID,
        sourceGitCommit:commit,programSha256:ph,protocolSha256:rh,variants,provenance:manifest};
    fs.writeFileSync(out,JSON.stringify(artifact,null,2)+"\n",{flag:"wx",mode:0o600});
    console.log(JSON.stringify({status:artifact.status,taskIndex:task,variants}));
};

const finalize=():void=>{
    if(process.env.SLURM_JOB_ACCOUNT!=="pi_jss233") throw new Error("Controller requires pi_jss233");
    const root=requiredPath("RESULTS_ROOT"), out=requiredPath("OUT_FILE"), array=requiredText("ARRAY_JOB_ID",/^\d+$/);
    const ph=requiredText("PROGRAM_SHA256",SHA256),rh=requiredText("PROTOCOL_SHA256",SHA256); if(fs.existsSync(out)) throw new Error("Output exists");
    const raw=execFileSync("/opt/slurm/current/bin/sacct",["-j",array,"-n","-P","-X","--format=JobID,JobIDRaw,State,ExitCode,Account"],{encoding:"utf8"});
    const tasks=new Map<number,string>(); for(const line of raw.split("\n").filter(Boolean)){const [logical,scheduler,state,exit,account]=line.split("|");
        const m=new RegExp(`^${array}_(\\d+)$`).exec(logical); if(m&&state==="COMPLETED"&&exit==="0:0"&&account==="pi_jss233")tasks.set(Number(m[1]),scheduler);}
    if(tasks.size!==18) throw new Error(`Found ${tasks.size}/18 tasks`);
    const cells:Record<string,unknown>[]=[]; for(let task=0;task<18;task++){const p=path.join(root,`task-${String(task).padStart(2,"0")}`,"cell.json");
        const v=JSON.parse(fs.readFileSync(p,"utf8")) as unknown; if(!isRecord(v)||v.kind!=="progress-triggered-capability-outcome-blind-cell"||
        v.status!=="PASS_PROGRESS_TRIGGERED_CAPABILITY_CELL"||v.passed!==true||v.outcomeFree!==true||v.taskIndex!==task||v.launchedGameCount!==8||
        v.schedulerAccount!=="pi_jss233"||String(v.schedulerJobId)!==tasks.get(task)||v.programSha256!==ph||v.protocolSha256!==rh||!Array.isArray(v.variants))
        throw new Error(`Cell ${task} drifted`); cells.push(v);}
    const exposure=Object.fromEntries(VARIANTS.map(variant=>[variant.id,{replacement:0,missions:0,capabilityRequests:0,
        allied:0,soviet:0,slot0:0,slot1:0,alliedCapability:0,sovietCapability:0,slot0Capability:0,slot1Capability:0}]));
    for(const cell of cells){for(const row of cell.variants as any[]){const e=exposure[row.id as keyof typeof exposure];
        e.replacement+=row.replacementCount;e.missions+=row.missionCount;e.capabilityRequests+=row.capabilityRequestCount;
        if(row.replacementCount>0){if(ALLIED.has(cell.country as Countries))e.allied++;else e.soviet++;if(cell.candidateSlot===0)e.slot0++;else e.slot1++;}
        if(row.capabilityRequestCount>0){if(ALLIED.has(cell.country as Countries))e.alliedCapability++;else e.sovietCapability++;
            if(cell.candidateSlot===0)e.slot0Capability++;else e.slot1Capability++;}}}
    const passed=VARIANTS.every(v=>{const e=exposure[v.id];const base=e.replacement>0&&e.missions>0&&e.allied>0&&e.soviet>0&&e.slot0>0&&e.slot1>0;
        return v.capability.airTargetCount===0?base:base&&e.capabilityRequests>0&&e.alliedCapability>0&&e.sovietCapability>0&&e.slot0Capability>0&&e.slot1Capability>0;});
    const artifact={schemaVersion:1,kind:"progress-triggered-capability-outcome-blind-gate",status:passed?"PASS_PROGRESS_TRIGGERED_CAPABILITY_GATE":"FAIL_PROGRESS_TRIGGERED_CAPABILITY_GATE",
        complete:true,passed,outcomeFree:true,schedulerAccount:"pi_jss233",arrayJobId:array,controllerJobId:process.env.SLURM_JOB_ID,
        launchedGameCount:144,countryCount:9,reciprocalSlotCount:2,sourceGitCommit:cells[0].sourceGitCommit,programSha256:ph,protocolSha256:rh,
        schedulerJobIds:[...tasks.values()].sort((a,b)=>Number(a)-Number(b)),exposure,cells};
    fs.writeFileSync(out,JSON.stringify(artifact,null,2)+"\n",{flag:"wx",mode:0o600});console.log(JSON.stringify({status:artifact.status,exposure}));if(!passed)process.exitCode=2;
};
const main=async()=>{const mode=requiredText("MODE",/^(cell|finalize)$/);if(mode==="cell")await cell();else finalize();};
const invoked=process.argv[1]?pathToFileURL(path.resolve(process.argv[1])).href:null;
if(import.meta.url===invoked)main().catch(e=>{console.error(e);process.exitCode=1;});
