import { GameApi, ObjectType, QueueType, TechnoRules, Tile } from "@chronodivide/game-api";
import { Countries, DebugLogger } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { MissionContext, SupabotContext } from "@supalosa/chronodivide-bot/dist/bot/logic/common/context.js";
import { Mission, MissionAction, buildStructureAtLocation, noop, releaseUnits, requestUnits } from
    "@supalosa/chronodivide-bot/dist/bot/logic/mission/mission.js";
import { MissionController } from "@supalosa/chronodivide-bot/dist/bot/logic/mission/missionController.js";
import crypto from "node:crypto";
import { BaselineFactory, InspectableBaselineBot } from "../benchmark/baselineLoader.js";
import { ProgressCertifiedConversionPolicyV5 } from "./progressCertifiedConversionPolicyV5.js";
import {
    ProgressTriggeredReplacementPolicy,
    ProgressTriggeredReplacementTelemetry,
    createProgressTriggeredAttackReplacementCandidate,
} from "./progressTriggeredAttackReplacementCandidate.js";
import { TerminalObjectiveTelemetry } from "./terminalObjectiveStrategy.js";
import { AttackMissionFactoryTelemetry } from
    "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/attackMission.js";

export type ProgressTriggeredCapabilityPolicy = {
    schemaVersion: 1;
    enabled: boolean;
    airTargetCount: 0 | 2 | 4;
    productionPriority: 180;
    prerequisitePriority: 170;
};
export const buildProgressTriggeredCapabilityPolicy = (airTargetCount: 0 | 2 | 4): ProgressTriggeredCapabilityPolicy =>
    ({ schemaVersion: 1, enabled: airTargetCount > 0, airTargetCount,
        productionPriority: 180, prerequisitePriority: 170 });
export const validateProgressTriggeredCapabilityPolicy = (p: ProgressTriggeredCapabilityPolicy): ProgressTriggeredCapabilityPolicy => {
    if (p.schemaVersion !== 1 || typeof p.enabled !== "boolean" || !([0,2,4] as const).includes(p.airTargetCount) ||
        p.enabled !== (p.airTargetCount > 0) || p.productionPriority !== 180 || p.prerequisitePriority !== 170)
        throw new Error("Progress-triggered capability policy is invalid");
    return structuredClone(p);
};
export const progressTriggeredCapabilityPolicySha256 = (p: ProgressTriggeredCapabilityPolicy): string => crypto
    .createHash("sha256").update(JSON.stringify(validateProgressTriggeredCapabilityPolicy(p))).digest("hex");
export const progressTriggeredAirUnit = (country: Countries): "JUMPJET" | "ZEP" => new Set([
    Countries.USA,Countries.KOREA,Countries.FRANCE,Countries.GERMANY,Countries.GREAT_BRITAIN,
]).has(country) ? "JUMPJET" : "ZEP";
export const progressTriggeredAirStructures = (country: Countries): string[] => progressTriggeredAirUnit(country)==="JUMPJET"
    ? ["GAAIRC","AMRADR","GATECH"] : ["NARADR","NATECH"];

export type ProgressTriggeredCapabilityTelemetry = {
    schemaVersion: 1;
    event: "capability_missions_added" | "capability_structure_request" | "capability_unit_request" | "capability_unit_release";
    informationBoundary: "public_complete_state";
    tick: number;
    country: Countries;
    unitName: "JUMPJET" | "ZEP";
    targetCount: 2 | 4;
    structureName: string | null;
    releasedUnitIds: number[];
    forbiddenFieldsEmitted: [];
};

type Sink=(e:ProgressTriggeredCapabilityTelemetry)=>void;
const placementFor=(game:GameApi,playerName:string,rulesName:string):Tile|null=>{
    const anchors=game.getVisibleUnits(playerName,"self",r=>r.type===ObjectType.Building)
        .map(id=>game.getUnitData(id)).filter((u):u is NonNullable<typeof u>=>!!u).map(u=>u.tile);
    const start=game.getPlayerData(playerName).startLocation;
    const points=anchors.length?anchors:[game.map.getTile(start.x,start.y)].filter((t):t is Tile=>!!t);
    for(const a of points) for(let radius=2;radius<=12;radius++){
        for(let dx=-radius;dx<=radius;dx++) for(const dy of [-radius,radius]){
            const t=game.map.getTile(a.rx+dx,a.ry+dy); if(t&&game.canPlaceBuilding(playerName,rulesName,t))return t;
        }
        for(let dy=-radius+1;dy<radius;dy++) for(const dx of [-radius,radius]){
            const t=game.map.getTile(a.rx+dx,a.ry+dy); if(t&&game.canPlaceBuilding(playerName,rulesName,t))return t;
        }
    }
    return null;
};

class CapabilityStructureMission extends Mission {
    constructor(private country:Countries,private policy:ProgressTriggeredCapabilityPolicy,private sink:Sink,logger:DebugLogger){
        super("progressTriggeredCapabilityStructures",logger);
    }
    _onAiUpdate(context:MissionContext):MissionAction{
        const unitName=progressTriggeredAirUnit(this.country);
        const availableUnits=new Set(context.player.production.getAvailableObjects().map((r:TechnoRules)=>r.name));
        if(availableUnits.has(unitName))return noop();
        const owned=new Set(context.game.getVisibleUnits(context.player.name,"self",r=>r.type===ObjectType.Building)
            .map(id=>context.game.getUnitData(id)?.rules.name).filter((n):n is string=>!!n));
        const available=new Set([...context.player.production.getAvailableObjects(QueueType.Structures),
            ...context.player.production.getAvailableObjects(QueueType.Armory)].map((r:TechnoRules)=>r.name));
        const requested=progressTriggeredAirStructures(this.country).find(n=>available.has(n)&&!owned.has(n));
        if(!requested)return noop(); const tile=placementFor(context.game,context.player.name,requested); if(!tile)return noop();
        this.sink({schemaVersion:1,event:"capability_structure_request",informationBoundary:"public_complete_state",
            tick:context.game.getCurrentTick(),country:this.country,unitName,targetCount:this.policy.airTargetCount as 2|4,
            structureName:requested,releasedUnitIds:[],forbiddenFieldsEmitted:[]});
        return buildStructureAtLocation(requested,this.policy.prerequisitePriority,tile.rx,tile.ry);
    }
    getGlobalDebugText(){return undefined;} getPriority(){return this.policy.prerequisitePriority;}
}
class CapabilityUnitMission extends Mission {
    constructor(private country:Countries,private policy:ProgressTriggeredCapabilityPolicy,private sink:Sink,logger:DebugLogger){
        super("progressTriggeredCapabilityUnits",logger);
    }
    _onAiUpdate(context:MissionContext):MissionAction{
        const unitName=progressTriggeredAirUnit(this.country); const ids=this.getUnitIds().slice().sort((a,b)=>a-b);
        if(ids.length){this.sink({schemaVersion:1,event:"capability_unit_release",informationBoundary:"public_complete_state",
            tick:context.game.getCurrentTick(),country:this.country,unitName,targetCount:this.policy.airTargetCount as 2|4,
            structureName:null,releasedUnitIds:ids,forbiddenFieldsEmitted:[]});return releaseUnits(ids);}
        const current=context.game.getVisibleUnits(context.player.name,"self",r=>r.name===unitName).length;
        if(current>=this.policy.airTargetCount)return noop();
        this.sink({schemaVersion:1,event:"capability_unit_request",informationBoundary:"public_complete_state",
            tick:context.game.getCurrentTick(),country:this.country,unitName,targetCount:this.policy.airTargetCount as 2|4,
            structureName:null,releasedUnitIds:[],forbiddenFieldsEmitted:[]});
        return requestUnits({[unitName]:this.policy.productionPriority});
    }
    getGlobalDebugText(){return undefined;} getPriority(){return this.policy.productionPriority;} isUnitsLocked(){return false;}
}

export const createProgressTriggeredCapabilityCandidate=(factory:BaselineFactory,name:string,country:Countries,
    v5:ProgressCertifiedConversionPolicyV5,replacement:ProgressTriggeredReplacementPolicy,
    rawCapability:ProgressTriggeredCapabilityPolicy,telemetry:{v5:(e:TerminalObjectiveTelemetry)=>void;
    replacement:(e:ProgressTriggeredReplacementTelemetry)=>void;attackFactory:(e:AttackMissionFactoryTelemetry)=>void;
    capability:Sink;}):InspectableBaselineBot=>{
    const capability=validateProgressTriggeredCapabilityPolicy(rawCapability);
    return createProgressTriggeredAttackReplacementCandidate(factory,name,country,v5,replacement,
        {v5:telemetry.v5,replacement:telemetry.replacement,attackFactory:telemetry.attackFactory},
        (context:SupabotContext,controller:MissionController,logger:DebugLogger)=>{
            if(!capability.enabled)return;
            const structure=new CapabilityStructureMission(country,capability,telemetry.capability,logger);
            const units=new CapabilityUnitMission(country,capability,telemetry.capability,logger);
            if(!controller.addMission(structure)||!controller.addMission(units))throw new Error("Capability mission name collision");
            telemetry.capability({schemaVersion:1,event:"capability_missions_added",informationBoundary:"public_complete_state",
                tick:context.game.getCurrentTick(),country,unitName:progressTriggeredAirUnit(country),
                targetCount:capability.airTargetCount as 2|4,structureName:null,releasedUnitIds:[],forbiddenFieldsEmitted:[]});
        });
};
