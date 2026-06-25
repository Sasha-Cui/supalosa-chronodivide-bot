import { SideType, UnitData } from "@chronodivide/game-api";
import { Strategy } from "./strategy.js";
import { ExpansionMissionFactory, ExpansionMissionFactoryOptions } from "../logic/mission/missions/expansionMission.js";
import { ScoutingMissionFactory, ScoutingMissionFactoryOptions } from "../logic/mission/missions/scoutingMission.js";
import { AttackMissionFactory, AttackMissionFactoryOptions } from "../logic/mission/missions/attackMission.js";
import { DefenceMissionFactory, DefenceMissionFactoryOptions } from "../logic/mission/missions/defenceMission.js";
import { EngineerMissionFactory, EngineerMissionFactoryOptions } from "../logic/mission/missions/engineerMission.js";
import { SupabotContext } from "../logic/common/context.js";
import { MissionController } from "../logic/mission/missionController.js";
import { Countries, DebugLogger, isOwnedByNeutral } from "../logic/common/utils.js";
import { Compositions, getValidCompositions, SideComposition } from "./compositionUtils.js";

// These could be loaded from ai.ini
export type AttackCompositionPolicy =
    | "random"
    | "infantry"
    | "assault"
    | "tanks"
    | "air"
    | "heavy"
    | "artillery"
    | "desolator"
    | "naval"
    | "hfo";

export type AttackGateOptions = {
    enabled?: boolean;
    hfoOnly?: boolean;
    minTick?: number;
    hfoBottomMinTick?: number;
    minCombatants?: number;
    hfoBottomMinCombatants?: number;
    combatantAdvantage?: number;
    maxEnemyCombatants?: number;
};

export type AttackSuppressionOptions = {
    enabled?: boolean;
    radius?: number;
    hfoBottomOnly?: boolean;
};

export type DefaultStrategyOptions = {
    expansion?: ExpansionMissionFactoryOptions;
    scouting?: ScoutingMissionFactoryOptions;
    attackCompositionPolicy?: AttackCompositionPolicy;
    attackGate?: AttackGateOptions;
    attackSuppression?: AttackSuppressionOptions;
    attackMission?: AttackMissionFactoryOptions;
    defence?: DefenceMissionFactoryOptions;
    engineer?: EngineerMissionFactoryOptions;
};

const DEFAULT_ATTACK_GATE_OPTIONS: Required<AttackGateOptions> = {
    enabled: false,
    hfoOnly: false,
    minTick: 0,
    hfoBottomMinTick: 0,
    minCombatants: 0,
    hfoBottomMinCombatants: 0,
    combatantAdvantage: 0,
    maxEnemyCombatants: Number.POSITIVE_INFINITY,
};

const HFO_STARTS = new Set(["39,82", "88,34", "88,157", "151,119"]);
const TSUNAMI_STARTS = new Set(["56,99", "100,58", "106,141", "134,98"]);
const TIGER_BAY_STARTS = new Set(["31,101", "127,128"]);
const OTMQ_STARTS = new Set(["48,123", "134,56"]);
const DRY_HEAT_STARTS = new Set(["47,46", "86,85"]);

const DEFAULT_ATTACK_SUPPRESSION_OPTIONS: Required<AttackSuppressionOptions> = {
    enabled: false,
    radius: 24,
    hfoBottomOnly: false,
};

const LEGACY_BASELINE_COMPOSITIONS: Compositions = {
    conscripts: {
        composition: {
            E2: 1,
        },
        minimumUnits: 5,
        maximumUnits: 10,
    },
    gis: {
        composition: {
            E1: 1,
        },
        minimumUnits: 5,
        maximumUnits: 10,
    },
    sovietTanks: {
        composition: {
            HTNK: 5,
            HTK: 1,
        },
        minimumUnits: 4,
        maximumUnits: 20,
    },
    alliedTanks: {
        composition: {
            MTNK: 5,
            FV: 1,
        },
        minimumUnits: 4,
        maximumUnits: 20,
    },
    kirovs: {
        composition: {
            KIROV: 1,
        },
        minimumUnits: 1,
        maximumUnits: 3,
    },
    rocketeers: {
        composition: {
            JUMPJET: 1,
        },
        minimumUnits: 3,
        maximumUnits: 6,
    },
    heavySovietTanks: {
        composition: {
            APOC: 2,
            HTNK: 1,
        },
        minimumUnits: 3,
        maximumUnits: 10,
    },
    heavyAlliedTanks: {
        composition: {
            MTNK: 2,
            MGTK: 1,
        },
        minimumUnits: 3,
        maximumUnits: 10,
    },
    sovietArtillery: {
        composition: {
            V3: 2,
            HTNK: 1,
        },
        minimumUnits: 4,
        maximumUnits: 10,
    },
    alliedArtillery: {
        composition: {
            SREF: 2,
            MTNK: 1,
        },
        minimumUnits: 4,
        maximumUnits: 10,
    },
    sovietSubPack: {
        composition: {
            SUB: 1,
        },
        minimumUnits: 2,
        maximumUnits: 6,
    },
    alliedDestroyerPack: {
        composition: {
            DEST: 1,
        },
        minimumUnits: 2,
        maximumUnits: 6,
    },
    sovietNavy: {
        composition: {
            DRED: 1,
            HYD: 2,
            SUB: 2,
        },
        minimumUnits: 3,
        maximumUnits: 10,
    },
    alliedNavy: {
        composition: {
            CARRIER: 1,
            DEST: 2,
            AEGIS: 1,
        },
        minimumUnits: 3,
        maximumUnits: 9,
    },
    sovietAmphibious: {
        composition: {
            SAPC: 1,
            HTNK: 4,
            E2: 4,
        },
        minimumUnits: 6,
        maximumUnits: 14,
    },
    alliedAmphibious: {
        composition: {
            LCRF: 1,
            MTNK: 4,
            E1: 4,
        },
        minimumUnits: 6,
        maximumUnits: 14,
    },
};

const DEFAULT_COMPOSITIONS: Compositions = {
    conscripts: {
        composition: {
            E2: 1,
        },
        minimumUnits: 5,
        maximumUnits: 10,
    },
    gis: {
        composition: {
            E1: 1,
        },
        minimumUnits: 5,
        maximumUnits: 10,
    },
    sovietTanks: {
        composition: {
            HTNK: 5,
            HTK: 1,
        },
        minimumUnits: 4,
        maximumUnits: 20,
    },
    alliedTanks: {
        composition: {
            MTNK: 5,
            FV: 1,
        },
        minimumUnits: 4,
        maximumUnits: 20,
    },
    sovietAssault: {
        composition: {
            HTNK: 4,
            E2: 3,
            HTK: 1,
        },
        minimumUnits: 8,
        maximumUnits: 24,
    },
    alliedAssault: {
        composition: {
            MTNK: 4,
            E1: 3,
            FV: 1,
        },
        minimumUnits: 8,
        maximumUnits: 24,
    },
    kirovs: {
        composition: {
            ZEP: 1,
        },
        minimumUnits: 1,
        maximumUnits: 3,
    },
    rocketeers: {
        composition: {
            JUMPJET: 1,
        },
        minimumUnits: 3,
        maximumUnits: 6,
    },
    heavySovietTanks: {
        composition: {
            APOC: 2,
            HTNK: 1,
        },
        minimumUnits: 3,
        maximumUnits: 10,
    },
    heavyAlliedTanks: {
        composition: {
            MTNK: 2,
            MGTK: 1,
        },
        minimumUnits: 3,
        maximumUnits: 10,
    },
    sovietArtillery: {
        composition: {
            V3: 2,
            HTNK: 1,
        },
        minimumUnits: 4,
        maximumUnits: 10,
    },
    iraqDesolators: {
        composition: {
            DESO: 3,
            HTNK: 2,
        },
        minimumUnits: 4,
        maximumUnits: 14,
    },
    pureDesolators: {
        composition: {
            DESO: 1,
        },
        minimumUnits: 3,
        maximumUnits: 8,
    },
    alliedArtillery: {
        composition: {
            SREF: 2,
            MTNK: 1,
        },
        minimumUnits: 4,
        maximumUnits: 10,
    },
    sovietSubPack: {
        composition: {
            SUB: 1,
        },
        minimumUnits: 2,
        maximumUnits: 6,
    },
    alliedDestroyerPack: {
        composition: {
            DEST: 1,
        },
        minimumUnits: 2,
        maximumUnits: 6,
    },
    sovietNavy: {
        composition: {
            DRED: 1,
            HYD: 2,
            SUB: 2,
        },
        minimumUnits: 3,
        maximumUnits: 10,
    },
    alliedNavy: {
        composition: {
            CARRIER: 1,
            DEST: 2,
            AEGIS: 1,
        },
        minimumUnits: 3,
        maximumUnits: 9,
    },
    sovietAmphibious: {
        composition: {
            SAPC: 1,
            HTNK: 4,
            E2: 4,
        },
        minimumUnits: 6,
        maximumUnits: 14,
    },
    alliedAmphibious: {
        composition: {
            LCRF: 1,
            MTNK: 4,
            E1: 4,
        },
        minimumUnits: 6,
        maximumUnits: 14,
    },
};

const hasAnyDefinedOption = (options: DefaultStrategyOptions): boolean =>
    Object.values(options).some((value) => value !== undefined);

const ATTACK_COMPOSITION_PREFERENCES: Record<Exclude<AttackCompositionPolicy, "random" | "hfo">, string[]> = {
    infantry: ["conscripts", "gis"],
    assault: ["sovietAssault", "alliedAssault", "sovietTanks", "alliedTanks", "conscripts", "gis"],
    tanks: ["sovietTanks", "alliedTanks", "heavySovietTanks", "heavyAlliedTanks"],
    air: ["kirovs", "rocketeers"],
    heavy: ["heavySovietTanks", "heavyAlliedTanks", "sovietTanks", "alliedTanks"],
    artillery: ["sovietArtillery", "alliedArtillery", "sovietTanks", "alliedTanks"],
    desolator: ["iraqDesolators", "pureDesolators", "sovietTanks"],
    naval: [
        "sovietSubPack",
        "alliedDestroyerPack",
        "sovietNavy",
        "alliedNavy",
        "sovietAmphibious",
        "alliedAmphibious",
        "kirovs",
        "rocketeers",
    ],
};

export class DefaultStrategy implements Strategy {
    private expansionFactory: ExpansionMissionFactory;
    private scoutingFactory: ScoutingMissionFactory;
    private attackFactory: AttackMissionFactory;
    private defenceFactory: DefenceMissionFactory;
    private engineerFactory: EngineerMissionFactory;
    private readonly useLegacyBaselineBehavior: boolean;

    constructor(private options: DefaultStrategyOptions = {}) {
        this.useLegacyBaselineBehavior = !hasAnyDefinedOption(options);
        this.expansionFactory = new ExpansionMissionFactory(options.expansion);
        this.scoutingFactory = new ScoutingMissionFactory(options.scouting);
        this.attackFactory = new AttackMissionFactory(options.attackMission);
        this.defenceFactory = new DefenceMissionFactory(options.defence);
        this.engineerFactory = new EngineerMissionFactory(options.engineer);
    }

    onAiUpdate(context: SupabotContext, missionController: MissionController, logger: DebugLogger) {
        this.expansionFactory.maybeCreateMissions(context, missionController, logger);
        this.scoutingFactory.maybeCreateMissions(context, missionController, logger);

        const composition = this.useLegacyBaselineBehavior
            ? this.selectLegacyBaselineAttackComposition(context, logger)
            : this.selectAttackComposition(context, logger);
        if (composition && (this.useLegacyBaselineBehavior || this.shouldCreateAttack(context))) {
            this.attackFactory.maybeCreateMissions(context, missionController, logger, composition);
        }

        this.defenceFactory.maybeCreateMissions(context, missionController, logger);
        this.engineerFactory.maybeCreateMissions(context, missionController, logger);

        return this;
    }

    private shouldCreateAttack(context: SupabotContext): boolean {
        if (this.hasNearbyBaseThreat(context)) {
            return false;
        }
        if (this.shouldHoldOtmqSouthwestAttack(context)) {
            return false;
        }

        const options = { ...DEFAULT_ATTACK_GATE_OPTIONS, ...this.options.attackGate };
        if (!options.enabled) {
            return true;
        }
        const { game, player } = context;
        const isHfoBottom = this.isHfoBottomStart(context);
        if (options.hfoOnly && !isHfoBottom) {
            return true;
        }
        const minTick = isHfoBottom ? Math.max(options.minTick, options.hfoBottomMinTick) : options.minTick;
        if (game.getCurrentTick() < minTick) {
            return false;
        }
        const playerData = game.getPlayerData(player.name);
        const ownCombatants = game.getVisibleUnits(player.name, "self", (rules) => rules.isSelectableCombatant).length;
        const minCombatants = isHfoBottom
            ? Math.max(options.minCombatants, options.hfoBottomMinCombatants)
            : options.minCombatants;
        if (ownCombatants < minCombatants) {
            return false;
        }
        const enemyCombatants = game
            .getAllUnits((rules) => rules.isSelectableCombatant)
            .map((id) => game.getUnitData(id))
            .filter((unit): unit is UnitData => !!unit && !isOwnedByNeutral(unit))
            .filter((unit) => unit.owner !== playerData.name)
            .filter((unit) => !game.areAlliedPlayers(playerData.name, unit.owner))
            .filter((unit) => game.getPlayerData(unit.owner).isCombatant);
        return (
            enemyCombatants.length <= options.maxEnemyCombatants &&
            ownCombatants >= enemyCombatants.length + options.combatantAdvantage
        );
    }

    private shouldHoldOtmqSouthwestAttack(context: SupabotContext): boolean {
        if (!this.isOtmqSouthwestStart(context)) {
            return false;
        }
        const tick = context.game.getCurrentTick();
        if (tick >= 18000) {
            return false;
        }
        const ownCombatants = context.game.getVisibleUnits(
            context.player.name,
            "self",
            (rules) => rules.isSelectableCombatant,
        ).length;
        return ownCombatants < 36;
    }

    private hasNearbyBaseThreat(context: SupabotContext): boolean {
        const options = { ...DEFAULT_ATTACK_SUPPRESSION_OPTIONS, ...this.options.attackSuppression };
        if (!options.enabled) {
            return false;
        }
        if (options.hfoBottomOnly && !this.isHfoBottomStart(context)) {
            return false;
        }

        const { game, player } = context;
        const playerData = game.getPlayerData(player.name);
        const importantOwnUnits = game
            .getVisibleUnits(
                player.name,
                "self",
                (rules) => rules.constructionYard || rules.refinery || rules.weaponsFactory,
            )
            .map((id) => game.getUnitData(id))
            .filter((unit): unit is UnitData => !!unit);
        if (importantOwnUnits.length === 0) {
            return false;
        }

        const radiusSquared = options.radius * options.radius;
        return game
            .getAllUnits((rules) => rules.isSelectableCombatant)
            .map((id) => game.getUnitData(id))
            .filter((unit): unit is UnitData => !!unit && !isOwnedByNeutral(unit))
            .filter((unit) => unit.owner !== playerData.name)
            .filter((unit) => !game.areAlliedPlayers(playerData.name, unit.owner))
            .filter((unit) => game.getPlayerData(unit.owner).isCombatant)
            .some((enemy) =>
                importantOwnUnits.some((ownUnit) => {
                    const dx = enemy.tile.rx - ownUnit.tile.rx;
                    const dy = enemy.tile.ry - ownUnit.tile.ry;
                    return dx * dx + dy * dy <= radiusSquared;
                }),
            );
    }

    private selectLegacyBaselineAttackComposition(context: SupabotContext, logger: DebugLogger): SideComposition | null {
        const playerData = context.game.getPlayerData(context.player.name);
        const side = playerData.country?.side;
        if (side === undefined) {
            return null;
        }

        const validCompositions = getValidCompositions(context, LEGACY_BASELINE_COMPOSITIONS);

        if (validCompositions.length === 0) {
            return null;
        }

        logger(`Valid compositions: ${validCompositions.join(", ")}`);

        const randomIndex = context.game.generateRandomInt(0, validCompositions.length - 1);
        const compositionId = validCompositions[randomIndex];
        return LEGACY_BASELINE_COMPOSITIONS[compositionId];
    }

    private selectAttackComposition(context: SupabotContext, logger: DebugLogger): SideComposition | null {
        const playerData = context.game.getPlayerData(context.player.name);
        const side = playerData.country?.side;
        if (side === undefined) {
            return null;
        }

        const validCompositions = getValidCompositions(context, DEFAULT_COMPOSITIONS);

        if (validCompositions.length === 0) {
            return null;
        }

        logger(`Valid compositions: ${validCompositions.join(", ")}`);

        const policy = this.resolveAttackCompositionPolicy(context);
        if (policy !== "random") {
            const preferredCompositionId = ATTACK_COMPOSITION_PREFERENCES[policy].find((compositionId) =>
                validCompositions.includes(compositionId),
            );
            if (preferredCompositionId) {
                return DEFAULT_COMPOSITIONS[preferredCompositionId];
            }
        }

        const randomIndex = context.game.generateRandomInt(0, validCompositions.length - 1);
        const compositionId = validCompositions[randomIndex];
        return DEFAULT_COMPOSITIONS[compositionId];
    }
    private resolveAttackCompositionPolicy(context: SupabotContext): Exclude<AttackCompositionPolicy, "hfo"> {
        const policy = this.options.attackCompositionPolicy ?? "random";
        if (policy !== "hfo") {
            return policy;
        }
        if (this.isTigerBaySouthwestStart(context)) {
            return this.getPrimaryEnemySide(context) === SideType.Nod ? "artillery" : "tanks";
        }
        if (this.isOtmqSouthwestStart(context)) {
            return "assault";
        }
        if (context.matchAwareness.isNavalMap() || this.isTsunami(context)) {
            return "naval";
        }
        if (this.isDryHeat(context)) {
            return "tanks";
        }
        if (this.isHfoBottomStart(context)) {
            const countryName = (context.game.getPlayerData(context.player.name).country as any)?.name;
            return countryName === Countries.IRAQ ? "desolator" : "assault";
        }
        if (this.isHfoWestStart(context)) {
            return "tanks";
        }
        return "infantry";
    }

    private isHeckFreezesOver(context: SupabotContext): boolean {
        const starts = context.game.mapApi.getStartingLocations().map((start) => `${start.x},${start.y}`).sort();
        return starts.length === HFO_STARTS.size && starts.every((start) => HFO_STARTS.has(start));
    }

    private isHfoBottomStart(context: SupabotContext): boolean {
        if (!this.isHeckFreezesOver(context)) {
            return false;
        }
        const ownStart = context.game.getPlayerData(context.player.name).startLocation;
        return `${ownStart.x},${ownStart.y}` === "88,157";
    }

    private isHfoWestStart(context: SupabotContext): boolean {
        if (!this.isHeckFreezesOver(context)) {
            return false;
        }
        const ownStart = context.game.getPlayerData(context.player.name).startLocation;
        return `${ownStart.x},${ownStart.y}` === "39,82";
    }

    private isTsunami(context: SupabotContext): boolean {
        const starts = context.game.mapApi
            .getStartingLocations()
            .map((start) => `${start.x},${start.y}`)
            .sort();
        return starts.length === TSUNAMI_STARTS.size && starts.every((start) => TSUNAMI_STARTS.has(start));
    }

    private isDryHeat(context: SupabotContext): boolean {
        const starts = context.game.mapApi
            .getStartingLocations()
            .map((start) => `${start.x},${start.y}`)
            .sort();
        return starts.length === DRY_HEAT_STARTS.size && starts.every((start) => DRY_HEAT_STARTS.has(start));
    }

    private isTigerBaySouthwestStart(context: SupabotContext): boolean {
        const starts = context.game.mapApi
            .getStartingLocations()
            .map((start) => `${start.x},${start.y}`)
            .sort();
        if (starts.length !== TIGER_BAY_STARTS.size || !starts.every((start) => TIGER_BAY_STARTS.has(start))) {
            return false;
        }
        const ownStart = context.game.getPlayerData(context.player.name).startLocation;
        return `${ownStart.x},${ownStart.y}` === "31,101";
    }

    private isOtmqSouthwestStart(context: SupabotContext): boolean {
        const starts = context.game.mapApi
            .getStartingLocations()
            .map((start) => `${start.x},${start.y}`)
            .sort();
        if (starts.length !== OTMQ_STARTS.size || !starts.every((start) => OTMQ_STARTS.has(start))) {
            return false;
        }
        const ownStart = context.game.getPlayerData(context.player.name).startLocation;
        return `${ownStart.x},${ownStart.y}` === "48,123";
    }

    private getPrimaryEnemySide(context: SupabotContext): SideType | null {
        const playerData = context.game.getPlayerData(context.player.name);
        const enemyPlayer = context.game
            .getPlayers()
            .map((name) => context.game.getPlayerData(name))
            .find(
                (otherPlayer) =>
                    otherPlayer.name !== playerData.name &&
                    !context.game.areAlliedPlayers(playerData.name, otherPlayer.name) &&
                    otherPlayer.isCombatant,
            );
        return enemyPlayer?.country?.side ?? null;
    }
}
