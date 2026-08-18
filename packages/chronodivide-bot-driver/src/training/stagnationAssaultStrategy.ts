import { GameApi, ObjectType, UnitData } from "@chronodivide/game-api";
import { Countries, DebugLogger, isOwnedByNeutral } from
    "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { SupabotContext } from "@supalosa/chronodivide-bot/dist/bot/logic/common/context.js";
import { MissionController } from "@supalosa/chronodivide-bot/dist/bot/logic/mission/missionController.js";
import { AttackMissionFactory } from
    "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/attackMission.js";
import { SideComposition } from "@supalosa/chronodivide-bot/dist/bot/strategy/compositionUtils.js";
import crypto from "node:crypto";

export const STAGNATION_ASSAULT_POLICY_SCHEMA_VERSION = 1 as const;
export const STAGNATION_ASSAULT_MECHANISM = "stagnation_triggered_additive_assault" as const;
export const STAGNATION_ASSAULT_MISSION_PREFIX = "stagnation_assault" as const;

export type StagnationAssaultPolicy = {
    schemaVersion: typeof STAGNATION_ASSAULT_POLICY_SCHEMA_VERSION;
    enabled: boolean;
    activationNotBeforeTick: number;
    stagnationWindowTicks: number;
    observationIntervalTicks: 120;
    minimumUnits: number;
    maximumUnits: number;
};

export type StagnationAssaultVariant = "disabled" | "conservative" | "early" | "early_strong";

const POLICY_VARIANTS: Record<StagnationAssaultVariant, StagnationAssaultPolicy> = {
    disabled: {
        schemaVersion: 1,
        enabled: false,
        activationNotBeforeTick: 12_000,
        stagnationWindowTicks: 3_600,
        observationIntervalTicks: 120,
        minimumUnits: 6,
        maximumUnits: 12,
    },
    conservative: {
        schemaVersion: 1,
        enabled: true,
        activationNotBeforeTick: 12_000,
        stagnationWindowTicks: 3_600,
        observationIntervalTicks: 120,
        minimumUnits: 6,
        maximumUnits: 12,
    },
    early: {
        schemaVersion: 1,
        enabled: true,
        activationNotBeforeTick: 9_000,
        stagnationWindowTicks: 3_000,
        observationIntervalTicks: 120,
        minimumUnits: 6,
        maximumUnits: 12,
    },
    early_strong: {
        schemaVersion: 1,
        enabled: true,
        activationNotBeforeTick: 9_000,
        stagnationWindowTicks: 3_000,
        observationIntervalTicks: 120,
        minimumUnits: 8,
        maximumUnits: 16,
    },
};

export const validateStagnationAssaultPolicy = (policy: StagnationAssaultPolicy): StagnationAssaultPolicy => {
    if (
        policy.schemaVersion !== STAGNATION_ASSAULT_POLICY_SCHEMA_VERSION ||
        typeof policy.enabled !== "boolean" ||
        !Number.isSafeInteger(policy.activationNotBeforeTick) || policy.activationNotBeforeTick < 0 ||
        !Number.isSafeInteger(policy.stagnationWindowTicks) || policy.stagnationWindowTicks < 1 ||
        policy.observationIntervalTicks !== 120 ||
        !Number.isSafeInteger(policy.minimumUnits) || policy.minimumUnits < 1 ||
        !Number.isSafeInteger(policy.maximumUnits) || policy.maximumUnits < policy.minimumUnits
    ) throw new Error("Stagnation-assault policy is invalid");
    return structuredClone(policy);
};

export const buildStagnationAssaultPolicy = (
    variant: StagnationAssaultVariant,
): StagnationAssaultPolicy => validateStagnationAssaultPolicy(POLICY_VARIANTS[variant]);

export const stagnationAssaultPolicySha256 = (policy: StagnationAssaultPolicy): string => crypto
    .createHash("sha256").update(JSON.stringify(validateStagnationAssaultPolicy(policy))).digest("hex");

const ALLIED = new Set<Countries>([
    Countries.USA,
    Countries.KOREA,
    Countries.FRANCE,
    Countries.GERMANY,
    Countries.GREAT_BRITAIN,
]);

export const stagnationAssaultComposition = (
    country: Countries,
    policy: StagnationAssaultPolicy,
): SideComposition => ({
    composition: ALLIED.has(country) ? { MTNK: 5, FV: 1 } : { HTNK: 5, HTK: 1 },
    minimumUnits: policy.minimumUnits,
    maximumUnits: policy.maximumUnits,
});

export const buildingProgressObserved = (
    previous: ReadonlyMap<number, number>,
    current: ReadonlyMap<number, number>,
): boolean => [...previous].some(([id, hitPoints]) => {
    const now = current.get(id);
    return now === undefined || now < hitPoints;
});

export const shouldTriggerStagnationAssault = (args: {
    tick: number;
    lastProgressTick: number;
    enemyBuildingCount: number;
    activeMissionCount: number;
    compositionBuildable: boolean;
    policy: StagnationAssaultPolicy;
}): boolean => args.policy.enabled && args.enemyBuildingCount > 0 &&
    args.activeMissionCount === 0 && args.compositionBuildable &&
    args.tick >= args.policy.activationNotBeforeTick &&
    args.tick - args.lastProgressTick >= args.policy.stagnationWindowTicks;

type StrategyLike = {
    onAiUpdate(context: SupabotContext, missionController: MissionController, logger: DebugLogger): unknown;
};

export type StagnationAssaultTelemetry = {
    schemaVersion: 1;
    event: "stagnation_assault_observation";
    informationBoundary: "public_complete_state";
    mechanism: typeof STAGNATION_ASSAULT_MECHANISM;
    tick: number;
    country: Countries;
    enemyBuildingCount: number;
    buildingProgressObserved: boolean;
    lastBuildingProgressTick: number;
    ticksSinceBuildingProgress: number;
    activeAssaultMissionCount: number;
    compositionBuildable: boolean;
    triggerEligible: boolean;
    missionCreated: boolean;
    missionPrefix: typeof STAGNATION_ASSAULT_MISSION_PREFIX;
    minimumUnits: number;
    maximumUnits: number;
    requestedComposition: Record<string, number>;
    forbiddenFieldsEmitted: [];
};

type TelemetrySink = (event: StagnationAssaultTelemetry) => void;

const enemyBuildings = (game: GameApi, playerName: string): UnitData[] => {
    const player = game.getPlayerData(playerName);
    return game.getAllUnits((rules) => rules.type === ObjectType.Building)
        .map((id) => game.getUnitData(id))
        .filter((unit): unit is UnitData => !!unit && !isOwnedByNeutral(unit))
        .filter((unit) => unit.owner !== playerName && !game.areAlliedPlayers(playerName, unit.owner))
        .filter((unit) => game.getPlayerData(unit.owner).isCombatant)
        .sort((left, right) => left.id - right.id);
};

const activeAssaultMissionCount = (missionController: MissionController): number => missionController
    .getMissions().filter((mission) =>
        mission.getUniqueName().startsWith(STAGNATION_ASSAULT_MISSION_PREFIX + "_"),
    ).length;

export class StagnationAssaultStrategy implements StrategyLike {
    private lastObservationTick = Number.NEGATIVE_INFINITY;
    private lastBuildingProgressTick: number | null = null;
    private priorBuildings = new Map<number, number>();
    private assaultFactory = new AttackMissionFactory({
        allowDefenceSteal: false,
        targetPriority: "strategic",
        missionNamePrefix: STAGNATION_ASSAULT_MISSION_PREFIX,
    });

    constructor(
        private inner: StrategyLike,
        private readonly country: Countries,
        rawPolicy: StagnationAssaultPolicy,
        private readonly telemetry: TelemetrySink = () => undefined,
    ) {
        this.policy = validateStagnationAssaultPolicy(rawPolicy);
    }

    private readonly policy: StagnationAssaultPolicy;

    onAiUpdate(context: SupabotContext, missionController: MissionController, logger: DebugLogger): StrategyLike {
        const next = this.inner.onAiUpdate(context, missionController, logger);
        if (next && typeof (next as StrategyLike).onAiUpdate === "function") this.inner = next as StrategyLike;
        if (!this.policy.enabled) return this;
        const tick = context.game.getCurrentTick();
        if (tick < this.lastObservationTick + this.policy.observationIntervalTicks) return this;
        this.lastObservationTick = tick;

        const buildings = enemyBuildings(context.game, context.player.name);
        const current = new Map(buildings.map((building) => [building.id, building.hitPoints]));
        const progressed = buildingProgressObserved(this.priorBuildings, current);
        if (this.lastBuildingProgressTick === null || progressed) this.lastBuildingProgressTick = tick;
        this.priorBuildings = current;

        const composition = stagnationAssaultComposition(this.country, this.policy);
        const available = new Set(context.player.production.getAvailableObjects().map(({ name }) => name));
        const compositionBuildable = Object.keys(composition.composition).every((name) => available.has(name));
        const before = activeAssaultMissionCount(missionController);
        const triggerEligible = shouldTriggerStagnationAssault({
            tick,
            lastProgressTick: this.lastBuildingProgressTick,
            enemyBuildingCount: buildings.length,
            activeMissionCount: before,
            compositionBuildable,
            policy: this.policy,
        });
        if (triggerEligible) {
            this.assaultFactory.maybeCreateMissions(context, missionController, logger, composition);
        }
        const after = activeAssaultMissionCount(missionController);
        this.telemetry({
            schemaVersion: 1,
            event: "stagnation_assault_observation",
            informationBoundary: "public_complete_state",
            mechanism: STAGNATION_ASSAULT_MECHANISM,
            tick,
            country: this.country,
            enemyBuildingCount: buildings.length,
            buildingProgressObserved: progressed,
            lastBuildingProgressTick: this.lastBuildingProgressTick,
            ticksSinceBuildingProgress: tick - this.lastBuildingProgressTick,
            activeAssaultMissionCount: after,
            compositionBuildable,
            triggerEligible,
            missionCreated: after > before,
            missionPrefix: STAGNATION_ASSAULT_MISSION_PREFIX,
            minimumUnits: composition.minimumUnits,
            maximumUnits: composition.maximumUnits,
            requestedComposition: { ...composition.composition },
            forbiddenFieldsEmitted: [],
        });
        return this;
    }
}
