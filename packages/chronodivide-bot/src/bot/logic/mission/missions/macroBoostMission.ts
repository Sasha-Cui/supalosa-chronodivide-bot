import { QueueType, SideType, TechnoRules } from "@chronodivide/game-api";
import { BUILDING_NAME_TO_RULES, getDefaultPlacementLocation } from "../../building/buildingRules.js";
import { DebugLogger } from "../../common/utils.js";
import { buildStructureAtLocation, Mission, MissionAction, noop } from "../mission.js";
import { MissionController } from "../missionController.js";
import { MissionContext, SupabotContext } from "../../common/context.js";

const MACRO_BOOST_MISSION_NAME = "macroBoost";
const MACRO_BOOST_START_TICK = 2400;

type BuildPlanItem = {
    name: string;
    targetCount: number;
    priority: number;
};

const getPlanForSide = (side: SideType | undefined): BuildPlanItem[] => {
    switch (side) {
        case SideType.Nod:
            return [
                { name: "NAPOWR", targetCount: 6, priority: 24 },
                { name: "NAREFN", targetCount: 4, priority: 24 },
                { name: "NAWEAP", targetCount: 4, priority: 32 },
                { name: "NAHAND", targetCount: 1, priority: 12 },
            ];
        case SideType.GDI:
            return [
                { name: "GAPOWR", targetCount: 6, priority: 24 },
                { name: "GAREFN", targetCount: 4, priority: 24 },
                { name: "GAWEAP", targetCount: 4, priority: 32 },
                { name: "GAPILE", targetCount: 1, priority: 12 },
            ];
        default:
            return [];
    }
};

class MacroBoostMission extends Mission {
    constructor(logger: DebugLogger) {
        super(MACRO_BOOST_MISSION_NAME, logger);
    }

    public _onAiUpdate(context: MissionContext): MissionAction {
        if (context.game.getCurrentTick() < MACRO_BOOST_START_TICK) {
            return noop();
        }

        const playerData = context.game.getPlayerData(context.player.name);
        const availableObjects = [
            ...context.player.production.getAvailableObjects(QueueType.Structures),
            ...context.player.production.getAvailableObjects(QueueType.Armory),
        ];
        const availableByName = new Map(availableObjects.map((rules) => [rules.name, rules]));

        for (const item of getPlanForSide(playerData.country?.side)) {
            const owned = context.game.getVisibleUnits(context.player.name, "self", (rules) => rules.name === item.name).length;
            if (owned >= item.targetCount) {
                continue;
            }
            const rules = availableByName.get(item.name);
            if (!rules) {
                continue;
            }
            const location = this.getPlacementLocation(context, rules);
            if (!location) {
                continue;
            }
            return buildStructureAtLocation(item.name, item.priority, location.rx, location.ry);
        }

        return noop();
    }

    public getGlobalDebugText(): string | undefined {
        return "macro boost";
    }

    public getPriority(): number {
        return 0;
    }

    private getPlacementLocation(context: MissionContext, rules: TechnoRules): { rx: number; ry: number } | undefined {
        const playerData = context.game.getPlayerData(context.player.name);
        const customRules = BUILDING_NAME_TO_RULES.get(rules.name);
        return customRules?.getPlacementLocation(context.game, playerData, rules) ??
            getDefaultPlacementLocation(context.game, playerData, playerData.startLocation, rules);
    }
}

export class MacroBoostMissionFactory {
    maybeCreateMissions(_context: SupabotContext, missionController: MissionController, logger: DebugLogger): void {
        missionController.addMission(new MacroBoostMission(logger));
    }
}
