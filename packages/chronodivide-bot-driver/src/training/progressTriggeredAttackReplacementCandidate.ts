import { GameApi, ObjectType, UnitData } from "@chronodivide/game-api";
import { AttackMissionFactory, AttackMissionFactoryTelemetry } from "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/attackMission.js";
import { CombatTargetPriority } from "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/squads/common.js";
import { SupabotContext } from "@supalosa/chronodivide-bot/dist/bot/logic/common/context.js";
import { Countries, DebugLogger, isOwnedByNeutral } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { MissionController } from "@supalosa/chronodivide-bot/dist/bot/logic/mission/missionController.js";
import crypto from "node:crypto";
import { BaselineFactory, InspectableBaselineBot } from "../benchmark/baselineLoader.js";
import { ProgressCertifiedConversionPolicyV5, validateProgressCertifiedConversionPolicyV5 } from "./progressCertifiedConversionPolicyV5.js";
import { TerminalObjectiveStrategy, TerminalObjectiveTelemetry } from "./terminalObjectiveStrategy.js";

export type ProgressTriggeredReplacementPriority = Extract<CombatTargetPriority, "distance" | "strategic" | "objective">;
export type ProgressTriggeredReplacementPolicy = {
    schemaVersion: 1;
    enabled: boolean;
    activationNotBeforeTick: number;
    stagnationWindowTicks: number;
    observationIntervalTicks: 120;
    targetPriority: ProgressTriggeredReplacementPriority;
    allowDefenceSteal: false;
};

export const buildProgressTriggeredReplacementPolicy = (args: {
    enabled?: boolean;
    activationNotBeforeTick: number;
    stagnationWindowTicks: number;
    targetPriority: ProgressTriggeredReplacementPriority;
}): ProgressTriggeredReplacementPolicy => validateProgressTriggeredReplacementPolicy({
    schemaVersion: 1,
    enabled: args.enabled ?? true,
    activationNotBeforeTick: args.activationNotBeforeTick,
    stagnationWindowTicks: args.stagnationWindowTicks,
    observationIntervalTicks: 120,
    targetPriority: args.targetPriority,
    allowDefenceSteal: false,
});

export const validateProgressTriggeredReplacementPolicy = (policy: ProgressTriggeredReplacementPolicy): ProgressTriggeredReplacementPolicy => {
    if (policy.schemaVersion !== 1 || typeof policy.enabled !== "boolean" ||
        !Number.isSafeInteger(policy.activationNotBeforeTick) || policy.activationNotBeforeTick < 0 ||
        !Number.isSafeInteger(policy.stagnationWindowTicks) || policy.stagnationWindowTicks < 1 ||
        policy.observationIntervalTicks !== 120 ||
        !(["distance", "strategic", "objective"] as const).includes(policy.targetPriority) ||
        policy.allowDefenceSteal !== false) throw new Error("Progress-triggered replacement policy is invalid");
    return structuredClone(policy);
};

export const progressTriggeredReplacementPolicySha256 = (policy: ProgressTriggeredReplacementPolicy): string => crypto
    .createHash("sha256").update(JSON.stringify(validateProgressTriggeredReplacementPolicy(policy))).digest("hex");

export const replacementBuildingProgressObserved = (previous: ReadonlyMap<number, number>, current: ReadonlyMap<number, number>): boolean =>
    [...previous].some(([id, hitPoints]) => current.get(id) === undefined || current.get(id)! < hitPoints);

export const shouldTriggerAttackFactoryReplacement = (args: {
    tick: number;
    lastProgressTick: number;
    enemyBuildingCount: number;
    alreadyReplaced: boolean;
    policy: ProgressTriggeredReplacementPolicy;
}): boolean => args.policy.enabled && !args.alreadyReplaced && args.enemyBuildingCount > 0 &&
    args.tick >= args.policy.activationNotBeforeTick &&
    args.tick - args.lastProgressTick >= args.policy.stagnationWindowTicks;

export type ProgressTriggeredReplacementTelemetry = {
    schemaVersion: 1;
    event: "attack_factory_replaced";
    informationBoundary: "public_complete_state";
    tick: number;
    country: Countries;
    targetPriority: ProgressTriggeredReplacementPriority;
    enemyBuildingCount: number;
    lastBuildingProgressTick: number;
    ticksSinceBuildingProgress: number;
    existingMissionNamesBefore: string[];
    existingMissionNamesAfter: string[];
    forbiddenFieldsEmitted: [];
};

type StrategyLike = { onAiUpdate(context: SupabotContext, missionController: MissionController, logger: DebugLogger): unknown };

const enemyBuildings = (game: GameApi, playerName: string): UnitData[] => game
    .getAllUnits((rules) => rules.type === ObjectType.Building)
    .map((id) => game.getUnitData(id))
    .filter((unit): unit is UnitData => !!unit && !isOwnedByNeutral(unit))
    .filter((unit) => unit.owner !== playerName && !game.areAlliedPlayers(playerName, unit.owner))
    .filter((unit) => game.getPlayerData(unit.owner).isCombatant)
    .sort((left, right) => left.id - right.id);
const missionNames = (controller: MissionController): string[] => controller.getMissions()
    .map((mission) => mission.getUniqueName()).slice().sort();

export class ProgressTriggeredAttackReplacementStrategy implements StrategyLike {
    private lastObservationTick = Number.NEGATIVE_INFINITY;
    private lastBuildingProgressTick: number | null = null;
    private previousBuildings = new Map<number, number>();
    private replaced = false;
    private readonly policy: ProgressTriggeredReplacementPolicy;

    constructor(
        private inner: StrategyLike,
        private readonly country: Countries,
        rawPolicy: ProgressTriggeredReplacementPolicy,
        private readonly replaceFactory: (strategy: StrategyLike, factory: AttackMissionFactory) => void,
        private readonly replacementTelemetry: (event: ProgressTriggeredReplacementTelemetry) => void,
        private readonly attackFactoryTelemetry: (event: AttackMissionFactoryTelemetry) => void,
    ) { this.policy = validateProgressTriggeredReplacementPolicy(rawPolicy); }

    onAiUpdate(context: SupabotContext, missionController: MissionController, logger: DebugLogger): StrategyLike {
        const next = this.inner.onAiUpdate(context, missionController, logger);
        if (next && typeof (next as StrategyLike).onAiUpdate === "function") this.inner = next as StrategyLike;
        if (!this.policy.enabled || this.replaced) return this;
        const tick = context.game.getCurrentTick();
        if (tick < this.lastObservationTick + this.policy.observationIntervalTicks) return this;
        this.lastObservationTick = tick;
        const buildings = enemyBuildings(context.game, context.player.name);
        const current = new Map(buildings.map((building) => [building.id, building.hitPoints]));
        const progressed = replacementBuildingProgressObserved(this.previousBuildings, current);
        if (this.lastBuildingProgressTick === null || progressed) this.lastBuildingProgressTick = tick;
        this.previousBuildings = current;
        if (!shouldTriggerAttackFactoryReplacement({ tick, lastProgressTick: this.lastBuildingProgressTick,
            enemyBuildingCount: buildings.length, alreadyReplaced: this.replaced, policy: this.policy })) return this;
        const before = missionNames(missionController);
        this.replaceFactory(this.inner, new AttackMissionFactory({ allowDefenceSteal: false,
            targetPriority: this.policy.targetPriority, missionNamePrefix: "attack" }, undefined,
            this.attackFactoryTelemetry));
        const after = missionNames(missionController);
        if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("Factory replacement mutated existing missions");
        this.replaced = true;
        this.replacementTelemetry({ schemaVersion: 1, event: "attack_factory_replaced",
            informationBoundary: "public_complete_state", tick, country: this.country,
            targetPriority: this.policy.targetPriority, enemyBuildingCount: buildings.length,
            lastBuildingProgressTick: this.lastBuildingProgressTick,
            ticksSinceBuildingProgress: tick - this.lastBuildingProgressTick,
            existingMissionNamesBefore: before, existingMissionNamesAfter: after,
            forbiddenFieldsEmitted: [] });
        return this;
    }
}

export const createProgressTriggeredAttackReplacementCandidate = (
    factory: BaselineFactory,
    name: string,
    country: Countries,
    rawV5Policy: ProgressCertifiedConversionPolicyV5,
    rawReplacementPolicy: ProgressTriggeredReplacementPolicy,
    telemetry: {
        v5: (event: TerminalObjectiveTelemetry) => void;
        replacement: (event: ProgressTriggeredReplacementTelemetry) => void;
        attackFactory: (event: AttackMissionFactoryTelemetry) => void;
    } = { v5: () => undefined, replacement: () => undefined, attackFactory: () => undefined },
): InspectableBaselineBot => {
    const v5 = validateProgressCertifiedConversionPolicyV5(rawV5Policy);
    const replacement = validateProgressTriggeredReplacementPolicy(rawReplacementPolicy);
    if (!factory.createDefaultStrategy || !factory.createWithStrategy || !factory.replaceDefaultStrategyAttackFactory) {
        throw new Error("Pinned baseline lacks the deferred attack-factory interface");
    }
    const exact = factory.createDefaultStrategy();
    if (!exact || typeof (exact as StrategyLike).onAiUpdate !== "function") throw new Error("DefaultStrategy lacks onAiUpdate");
    const deferred: StrategyLike = replacement.enabled ? new ProgressTriggeredAttackReplacementStrategy(
        exact as StrategyLike, country, replacement,
        (inner, attackFactory) => factory.replaceDefaultStrategyAttackFactory!(inner, attackFactory),
        telemetry.replacement, telemetry.attackFactory,
    ) : exact as StrategyLike;
    const outer: StrategyLike = v5.enabled ? new TerminalObjectiveStrategy(
        deferred as never, country, v5, telemetry.v5, "strict_literal_endpoint_base_race",
    ) as unknown as StrategyLike : deferred;
    return factory.createWithStrategy(name, country, outer as never);
};
