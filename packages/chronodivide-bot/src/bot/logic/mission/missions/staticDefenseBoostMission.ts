import { QueueType, SideType, TechnoRules, Vector2 } from "@chronodivide/game-api";
import { BUILDING_NAME_TO_RULES, getDefaultPlacementLocation } from "../../building/buildingRules.js";
import { DebugLogger } from "../../common/utils.js";
import { buildStructureAtLocation, Mission, MissionAction, noop } from "../mission.js";
import { MissionController } from "../missionController.js";
import { MissionContext, SupabotContext } from "../../common/context.js";

const STATIC_DEFENSE_BOOST_MISSION_NAME = "staticDefenseBoost";

export type StaticDefenseBoostOptions = {
    enabled?: boolean;
    hfoBottomOnly?: boolean;
    startTick?: number;
    targetCount?: number;
    priority?: number;
    placementAnchors?: Array<{ x: number; y: number }>;
};

const DEFAULT_OPTIONS: Required<StaticDefenseBoostOptions> = {
    enabled: false,
    hfoBottomOnly: false,
    startTick: 3600,
    targetCount: 4,
    priority: 28,
    placementAnchors: [],
};

const HFO_STARTS = new Set(["39,82", "88,34", "88,157", "151,119"]);

const isHeckFreezesOver = (context: SupabotContext): boolean => {
    const starts = context.game.mapApi.getStartingLocations().map((start) => `${start.x},${start.y}`).sort();
    return starts.length === HFO_STARTS.size && starts.every((start) => HFO_STARTS.has(start));
};

const isHfoBottomStart = (context: SupabotContext): boolean => {
    if (!isHeckFreezesOver(context)) {
        return false;
    }
    const ownStart = context.game.getPlayerData(context.player.name).startLocation;
    return `${ownStart.x},${ownStart.y}` === "88,157";
};

const getStaticDefenseName = (side: SideType | undefined): string | undefined => {
    switch (side) {
        case SideType.Nod:
            return "NALASR";
        case SideType.GDI:
            return "GAPILL";
        default:
            return undefined;
    }
};

class StaticDefenseBoostMission extends Mission {
    constructor(
        logger: DebugLogger,
        private options: Required<StaticDefenseBoostOptions>,
    ) {
        super(STATIC_DEFENSE_BOOST_MISSION_NAME, logger);
    }

    public _onAiUpdate(context: MissionContext): MissionAction {
        if (context.game.getCurrentTick() < this.options.startTick) {
            return noop();
        }

        const playerData = context.game.getPlayerData(context.player.name);
        const defenseName = getStaticDefenseName(playerData.country?.side);
        if (!defenseName) {
            return noop();
        }

        const owned = context.game.getVisibleUnits(context.player.name, "self", (rules) => rules.name === defenseName)
            .length;
        if (owned >= this.options.targetCount) {
            return noop();
        }

        const availableObjects = [
            ...context.player.production.getAvailableObjects(QueueType.Structures),
            ...context.player.production.getAvailableObjects(QueueType.Armory),
        ];
        const rules = availableObjects.find((item) => item.name === defenseName);
        if (!rules) {
            return noop();
        }

        const location = this.getPlacementLocation(context, rules, owned);
        if (!location) {
            return noop();
        }
        return buildStructureAtLocation(defenseName, this.options.priority, location.rx, location.ry);
    }

    public getGlobalDebugText(): string | undefined {
        return "static defense boost";
    }

    public getPriority(): number {
        return 0;
    }

    private getPlacementLocation(
        context: MissionContext,
        rules: TechnoRules,
        owned: number,
    ): { rx: number; ry: number } | undefined {
        const playerData = context.game.getPlayerData(context.player.name);
        if (this.options.placementAnchors.length > 0) {
            const anchor = this.options.placementAnchors[owned % this.options.placementAnchors.length];
            return getDefaultPlacementLocation(context.game, playerData, new Vector2(anchor.x, anchor.y), rules);
        }
        const customRules = BUILDING_NAME_TO_RULES.get(rules.name);
        return customRules?.getPlacementLocation(context.game, playerData, rules) ??
            getDefaultPlacementLocation(context.game, playerData, playerData.startLocation, rules);
    }
}

export class StaticDefenseBoostMissionFactory {
    private options: Required<StaticDefenseBoostOptions>;

    constructor(options: StaticDefenseBoostOptions = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    maybeCreateMissions(context: SupabotContext, missionController: MissionController, logger: DebugLogger): void {
        if (!this.options.enabled) {
            return;
        }
        if (this.options.hfoBottomOnly && !isHfoBottomStart(context)) {
            return;
        }
        missionController.addMission(new StaticDefenseBoostMission(logger, this.options));
    }
}
