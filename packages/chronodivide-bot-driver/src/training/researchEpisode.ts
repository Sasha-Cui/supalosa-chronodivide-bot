import { Bot, CreateOfflineOpts, GameApi, ObjectType, OrderType, SpeedType, UnitData, cdapi } from "@chronodivide/game-api";
import { StrongBot } from "@supalosa/chronodivide-bot/dist/bot/strongBot.js";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { StrongStrategy } from "@supalosa/chronodivide-bot/dist/bot/strategy/strongStrategy.js";
import { BuildingEliminationTelemetryEvent } from "@supalosa/chronodivide-bot/dist/bot/logic/mission/missions/buildingEliminationMission.js";
import { BaselineFactory } from "../benchmark/baselineLoader.js";
import {
    deriveBotRandomSeed,
    deriveParticipantBotRandomSeed,
    engineSeedToEpochMs,
    withSeededOfflineGame,
} from "../benchmark/seededOfflineGame.js";
import {
    buildResearchBotOptions,
    buildResearchStrategyOptions,
    parseResearchPolicy,
    ResearchPolicyConfig,
    researchPolicySha256,
} from "./researchPolicy.js";
import { METHOD_V4_POLICY_SCHEMA_VERSION, MethodV4PolicyConfig } from "./researchPolicy.js";

export const RESEARCH_EPISODE_SCHEMA_VERSION = 1 as const;
export const RESEARCH_OUTCOME_ENDPOINT = "candidate-win=1,finished-or-tick-cap-draw=0.5,baseline-win=0" as const;

export type ResearchEpisodeSpec = {
    schemaVersion: typeof RESEARCH_EPISODE_SCHEMA_VERSION;
    episodeId: string;
    familyId: string;
    mapName: string;
    mapSha256: string;
    methodId: string;
    policyId: string;
    policy: ResearchPolicyConfig;
    seedBlockIndex: number;
    requestedEngineSeed: number;
    candidateSlot: 0 | 1;
    candidateCountry: Countries;
    baselineCountry: Countries;
    maxTicks: number;
};

export type ResearchPlayerSnapshot = {
    credits: number;
    units: number;
    buildings: number;
    combatants: number;
    harvesters: number;
    factories: number;
    refineries: number;
    conyards: number;
    byName: Record<string, number>;
};

export type ResearchEpisodeResult = {
    schemaVersion: typeof RESEARCH_EPISODE_SCHEMA_VERSION;
    episodeId: string;
    familyId: string;
    mapName: string;
    mapSha256: string;
    methodId: string;
    policyId: string;
    policySha256: string;
    seedBlockIndex: number;
    requestedEngineSeed: number;
    botRandomSeed: number;
    candidateBotRandomSeed: number;
    baselineBotRandomSeed: number;
    engineSeedEpochMs: number;
    candidateSlot: 0 | 1;
    candidateCountry: Countries;
    baselineCountry: Countries;
    candidateStart: { x: number; y: number };
    baselineStart: { x: number; y: number };
    maxTicks: number;
    ticks: number;
    wallTimeMs: number;
    finished: boolean;
    winner: "candidate" | "baseline" | "draw";
    candidateScore: 0 | 0.5 | 1;
    outcomeEndpoint: typeof RESEARCH_OUTCOME_ENDPOINT;
    candidateDefeated: boolean;
    baselineDefeated: boolean;
    candidate: ResearchPlayerSnapshot;
    baseline: ResearchPlayerSnapshot;
};

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9._-]+$/;

const assertIdentifier = (label: string, value: string): void => {
    if (!IDENTIFIER_PATTERN.test(value)) {
        throw new Error(`${label} may contain only letters, digits, dot, underscore, and hyphen; got ${value}`);
    }
};

export const validateResearchEpisodeSpec = (spec: ResearchEpisodeSpec): ResearchEpisodeSpec => {
    if (spec.schemaVersion !== RESEARCH_EPISODE_SCHEMA_VERSION) {
        throw new Error(`Research episode schemaVersion must be ${RESEARCH_EPISODE_SCHEMA_VERSION}`);
    }
    assertIdentifier("episodeId", spec.episodeId);
    assertIdentifier("familyId", spec.familyId);
    assertIdentifier("methodId", spec.methodId);
    assertIdentifier("policyId", spec.policyId);
    if (
        spec.mapName !== spec.mapName.split(/[\\/]/).pop() ||
        !/\.(map|mpr)$/i.test(spec.mapName)
    ) {
        throw new Error(`Research episode mapName must be a basename ending in .map or .mpr; got ${spec.mapName}`);
    }
    if (!SHA256_PATTERN.test(spec.mapSha256)) {
        throw new Error(`Research episode mapSha256 must be a lowercase SHA-256 digest; got ${spec.mapSha256}`);
    }
    const policy = parseResearchPolicy(spec.policy);
    if (researchPolicySha256(policy) !== spec.policyId) {
        throw new Error(`Research episode policyId does not equal the canonical policy SHA-256`);
    }
    if (!Number.isSafeInteger(spec.seedBlockIndex) || spec.seedBlockIndex < 0) {
        throw new Error(`Research episode seedBlockIndex must be a non-negative integer`);
    }
    if (
        !Number.isSafeInteger(spec.requestedEngineSeed) ||
        spec.requestedEngineSeed < 0 ||
        spec.requestedEngineSeed > 0xffff_ffff
    ) {
        throw new Error(`Research episode requestedEngineSeed must be a uint32 integer`);
    }
    if (spec.candidateSlot !== 0 && spec.candidateSlot !== 1) {
        throw new Error(`Research episode candidateSlot must be 0 or 1`);
    }
    if (!Object.values(Countries).includes(spec.candidateCountry)) {
        throw new Error(`Research episode candidateCountry is invalid`);
    }
    if (!Object.values(Countries).includes(spec.baselineCountry)) {
        throw new Error(`Research episode baselineCountry is invalid`);
    }
    if (!Number.isSafeInteger(spec.maxTicks) || spec.maxTicks < 1 || spec.maxTicks > 100_000) {
        throw new Error(`Research episode maxTicks must be an integer in [1, 100000]`);
    }
    return { ...spec, policy };
};

const getPlayerSnapshot = (game: GameApi | null, playerName: string): ResearchPlayerSnapshot => {
    if (!game) {
        throw new Error(`Missing GameApi snapshot for ${playerName}`);
    }
    const units = game
        .getVisibleUnits(playerName, "self")
        .map((id) => game.getUnitData(id))
        .filter((unit): unit is NonNullable<ReturnType<GameApi["getUnitData"]>> => !!unit);
    const byName: Record<string, number> = {};
    for (const unit of units) {
        byName[unit.rules.name] = (byName[unit.rules.name] ?? 0) + 1;
    }
    return {
        credits: game.getPlayerData(playerName).credits,
        units: units.length,
        buildings: units.filter((unit) => unit.rules.type === ObjectType.Building).length,
        combatants: units.filter((unit) => unit.rules.isSelectableCombatant).length,
        harvesters: units.filter((unit) => unit.rules.harvester).length,
        factories: units.filter((unit) => unit.rules.weaponsFactory).length,
        refineries: units.filter((unit) => unit.rules.refinery).length,
        conyards: units.filter((unit) => unit.rules.constructionYard).length,
        byName,
    };
};

const getWinner = (
    candidateDefeated: boolean,
    baselineDefeated: boolean,
): ResearchEpisodeResult["winner"] => {
    if (candidateDefeated && !baselineDefeated) {
        return "baseline";
    }
    if (baselineDefeated && !candidateDefeated) {
        return "candidate";
    }
    return "draw";
};

const scoreForWinner = (winner: ResearchEpisodeResult["winner"]): 0 | 0.5 | 1 =>
    winner === "candidate" ? 1 : winner === "baseline" ? 0 : 0.5;

const getEnemyUnits = (game: GameApi, playerName: string, filter: (unit: UnitData) => boolean): UnitData[] =>
    game.getAllUnits()
        .map((id) => game.getUnitData(id))
        .filter((unit): unit is UnitData => {
            if (!unit || unit.owner === playerName || !filter(unit)) return false;
            try {
                return game.getPlayerData(unit.owner).isCombatant && !game.areAlliedPlayers(playerName, unit.owner);
            } catch {
                return false;
            }
        });

const canDamageBuilding = (attacker: UnitData, target: UnitData): boolean => {
    if ((attacker.rules.c4 || attacker.rules.ivan) && target.rules.canC4) return true;
    if (attacker.rules.spawns &&
        (attacker.primaryWeapon?.projectileRules.isAntiGround || attacker.secondaryWeapon?.projectileRules.isAntiGround)) {
        return true;
    }
    return [attacker.primaryWeapon, attacker.secondaryWeapon].some((weapon) =>
        !!weapon?.projectileRules.isAntiGround && weapon.rules.damage > 0 &&
        (weapon.warheadRules.verses.get(target.rules.armor) ?? 0) > 0,
    );
};

const canReachBuilding = (game: GameApi, attacker: UnitData, target: UnitData): boolean => {
    const speedType = attacker.rules.speedType ??
        (attacker.type === ObjectType.Infantry ? SpeedType.Foot :
            attacker.type === ObjectType.Aircraft ? SpeedType.Winged : null);
    if (speedType === SpeedType.Winged || speedType === null) return true;
    const maximumRange = Math.max(
        1,
        ...[attacker.primaryWeapon, attacker.secondaryWeapon]
            .filter((weapon) => !!weapon?.projectileRules.isAntiGround)
            .map((weapon) => weapon?.maxRange ?? 1),
    );
    const padding = Math.max(1, Math.ceil(maximumRange));
    const right = target.tile.rx + Math.max(1, target.foundation.width) - 1;
    const bottom = target.tile.ry + Math.max(1, target.foundation.height) - 1;
    const subCell = attacker.type === ObjectType.Infantry;
    const reachability = game.map.getReachabilityMap(speedType, subCell);
    return game.mapApi.getTilesInRect({
        x: target.tile.rx - padding,
        y: target.tile.ry - padding,
        width: target.foundation.width + padding * 2,
        height: target.foundation.height + padding * 2,
    }).some((tile) => {
        const dx = tile.rx < target.tile.rx ? target.tile.rx - tile.rx : tile.rx > right ? tile.rx - right : 0;
        const dy = tile.ry < target.tile.ry ? target.tile.ry - tile.ry : tile.ry > bottom ? tile.ry - bottom : 0;
        return Math.sqrt(dx * dx + dy * dy) <= maximumRange &&
            game.mapApi.isPassableTile(tile, speedType, !!tile.onBridgeLandType, subCell) &&
            reachability.isReachable(
                { tile: attacker.tile, onBridge: attacker.onBridge ?? false },
                { tile, onBridge: !!tile.onBridgeLandType },
            );
    });
};

/**
 * A narrow adapter around the independently loaded Supalosa runtime. It calls
 * the pinned external bot first on every callback, and then adds only the
 * schema-v4 literal building closeout order. No local strategy, mission,
 * production, defence, or awareness code participates in preservation mode.
 */
export const createExternalBaselineOverlayCandidate = (
    baselineFactory: BaselineFactory,
    name: string,
    country: Countries,
    policy: MethodV4PolicyConfig,
    telemetrySink: (event: BuildingEliminationTelemetryEvent) => void,
): ReturnType<BaselineFactory["create"]> => {
    const candidate = baselineFactory.create(name, country);
    if (!policy.preserveBaselineCore) {
        throw new Error("External baseline overlay requires preserveBaselineCore=true");
    }
    if (!policy.buildingEliminationEnabled) return candidate;

    let activated = false;
    let lastOrderAt = Number.NEGATIVE_INFINITY;
    let lastOrderTelemetrySignature = "";
    let lastAssignmentTelemetrySignature = "";
    const targetProgress = new Map<number, {
        hitPoints: number;
        lastDamageTick: number;
        lastProgressTelemetryTick: number;
        stalled: boolean;
    }>();
    const originalTick = candidate.onGameTick.bind(candidate);
    candidate.onGameTick = (game: GameApi): void => {
        originalTick(game);
        const tick = game.getCurrentTick();
        if (tick < policy.buildingEliminationMinTick ||
            tick < lastOrderAt + policy.buildingEliminationOrderIntervalTicks) return;

        const self = game.getVisibleUnits(name, "self")
            .map((id) => game.getUnitData(id))
            .filter((unit): unit is UnitData => !!unit);
        const buildings = getEnemyUnits(game, name, (unit) => unit.rules.type === ObjectType.Building);
        if (buildings.length === 0) return;
        const presentBuildingIds = new Set(buildings.map(({ id }) => id));
        for (const target of buildings) {
            const previous = targetProgress.get(target.id);
            const damage = previous ? Math.max(0, previous.hitPoints - target.hitPoints) : 0;
            const lastDamageTick = damage > 0 ? tick : (previous?.lastDamageTick ?? tick);
            const stalled = tick - lastDamageTick >= policy.buildingEliminationStallTicks;
            const lastProgressTelemetryTick = previous?.lastProgressTelemetryTick ?? Number.NEGATIVE_INFINITY;
            if (damage > 0 && tick >= lastProgressTelemetryTick + 120) {
                telemetrySink({
                    schemaVersion: 2,
                    event: "target_progress",
                    tick,
                    targetId: target.id,
                    targetName: target.rules.name,
                    hitPoints: target.hitPoints,
                    previousHitPoints: previous?.hitPoints ?? target.hitPoints,
                    damage,
                });
            }
            if (stalled && previous?.stalled !== true) {
                telemetrySink({
                    schemaVersion: 2,
                    event: "target_stalled",
                    tick,
                    targetId: target.id,
                    targetName: target.rules.name,
                    hitPoints: target.hitPoints,
                    lastDamageTick,
                    stallTicks: policy.buildingEliminationStallTicks,
                });
            }
            targetProgress.set(target.id, {
                hitPoints: target.hitPoints,
                lastDamageTick,
                lastProgressTelemetryTick: damage > 0 && tick >= lastProgressTelemetryTick + 120
                    ? tick
                    : lastProgressTelemetryTick,
                stalled,
            });
        }
        for (const targetId of targetProgress.keys()) {
            if (!presentBuildingIds.has(targetId)) targetProgress.delete(targetId);
        }
        const enemyCombatants = getEnemyUnits(
            game,
            name,
            (unit) => !!unit.rules.isSelectableCombatant && !unit.rules.harvester && unit.rules.type !== ObjectType.Building,
        );
        const start = game.getPlayerData(name).startLocation;
        const eligible = self
            .filter((unit) => !!unit.rules.isSelectableCombatant && !unit.rules.harvester &&
                unit.rules.type !== ObjectType.Building && unit.rules.name !== "DOG" && unit.rules.name !== "ADOG" &&
                (!!unit.primaryWeapon?.projectileRules.isAntiGround || !!unit.secondaryWeapon?.projectileRules.isAntiGround))
            .sort((left, right) => {
                const leftMobility = left.type === ObjectType.Aircraft || left.rules.speedType === SpeedType.Float ? 1 : 0;
                const rightMobility = right.type === ObjectType.Aircraft || right.rules.speedType === SpeedType.Float ? 1 : 0;
                if (leftMobility !== rightMobility) return rightMobility - leftMobility;
                const leftDistance = (left.tile.rx - start.x) ** 2 + (left.tile.ry - start.y) ** 2;
                const rightDistance = (right.tile.rx - start.x) ** 2 + (right.tile.ry - start.y) ** 2;
                return rightDistance - leftDistance;
            });
        if (
            eligible.length < policy.buildingEliminationMinCombatants + policy.buildingEliminationReserveCombatants ||
            enemyCombatants.length > policy.buildingEliminationMaxEnemyCombatants ||
            eligible.length - policy.buildingEliminationReserveCombatants <
                enemyCombatants.length + policy.buildingEliminationCombatantAdvantage
        ) return;
        const attackers = eligible.slice(0, eligible.length - policy.buildingEliminationReserveCombatants);
        const weight = (building: UnitData): number => {
            if (policy.buildingEliminationTargetPriority === "nearest") return 0;
            const power = new Set(["NAPOWR", "NANRCT", "GAPOWR"]).has(building.rules.name);
            const defense = new Set(["NALASR", "TESLA", "NAFLAK", "NASAM", "GAPILL", "ATESLA", "GTGCAN", "GASPYSAT"])
                .has(building.rules.name);
            if (policy.buildingEliminationTargetPriority === "defense") {
                if (power) return 8;
                if (defense) return 7;
            } else {
                if (building.rules.constructionYard) return 8;
                if (power) return 7;
                if (building.rules.weaponsFactory || building.rules.nodBarracks || building.rules.gdiBarracks) return 6;
            }
            return 3;
        };
        const rankedTargets = buildings.slice().sort((left, right) => {
            if (policy.buildingEliminationReassignStalledTargets) {
                const stalledDifference = Number(targetProgress.get(right.id)?.stalled === true) -
                    Number(targetProgress.get(left.id)?.stalled === true);
                if (stalledDifference !== 0) return stalledDifference;
            }
            const weightDifference = weight(right) - weight(left);
            if (weightDifference !== 0) return weightDifference;
            const distance = (building: UnitData) => attackers.reduce((best, attacker) => Math.min(
                best,
                (attacker.tile.rx - building.tile.rx) ** 2 + (attacker.tile.ry - building.tile.ry) ** 2,
            ), Number.POSITIVE_INFINITY);
            return distance(left) - distance(right) || left.id - right.id;
        });
        const compatibility = new Map<string, boolean>();
        let incompatiblePairs = 0;
        let unreachablePairs = 0;
        const isCompatible = (attacker: UnitData, target: UnitData): boolean => {
            const key = `${attacker.id}|${target.id}`;
            const cached = compatibility.get(key);
            if (cached !== undefined) return cached;
            if (policy.buildingEliminationCapabilityAwareAttackers && !canDamageBuilding(attacker, target)) {
                incompatiblePairs++;
                compatibility.set(key, false);
                return false;
            }
            if (policy.buildingEliminationReachabilityAwareTargets && !canReachBuilding(game, attacker, target)) {
                unreachablePairs++;
                compatibility.set(key, false);
                return false;
            }
            compatibility.set(key, true);
            return true;
        };
        const targets = rankedTargets.filter((target) => attackers.some((attacker) =>
            isCompatible(attacker, target),
        )).slice(0, policy.buildingEliminationMaxTargetGroups);
        if (targets.length === 0 || attackers.length === 0) return;
        const groups = new Map<number, number[]>();
        let assignedAttackers = 0;
        for (const attacker of attackers) {
            const compatible = targets.filter((target) =>
                isCompatible(attacker, target),
            );
            if (compatible.length === 0) continue;
            const target = compatible.reduce((best, item) => {
                const bestLoad = groups.get(best.id)?.length ?? 0;
                const itemLoad = groups.get(item.id)?.length ?? 0;
                const bestDistance = (attacker.tile.rx - best.tile.rx) ** 2 + (attacker.tile.ry - best.tile.ry) ** 2;
                const itemDistance = (attacker.tile.rx - item.tile.rx) ** 2 + (attacker.tile.ry - item.tile.ry) ** 2;
                return itemDistance * (1 + itemLoad) < bestDistance * (1 + bestLoad) ? item : best;
            }, compatible[0]);
            groups.set(target.id, [...(groups.get(target.id) ?? []), attacker.id]);
            assignedAttackers++;
        }
        const targetById = new Map(targets.map((target) => [target.id, target]));
        const visibleEnemyIds = new Set(game.getVisibleUnits(name, "enemy"));
        for (const [targetId, unitIds] of groups) {
            const target = targetById.get(targetId);
            if (!target) continue;
            if (policy.buildingEliminationDirectVisibleAttack && visibleEnemyIds.has(targetId)) {
                candidate.lastPlayerActions?.orderUnits(unitIds, OrderType.Attack, targetId);
            } else {
                candidate.lastPlayerActions?.orderUnits(
                    unitIds,
                    OrderType.AttackMove,
                    target.tile.rx,
                    target.tile.ry,
                );
            }
        }
        if (!activated) {
            activated = true;
            telemetrySink({
                schemaVersion: 1,
                event: "activated",
                tick,
                observationMode: "publicApi",
                ownCombatants: eligible.length,
                enemyCombatants: enemyCombatants.length,
                reservedCombatants: policy.buildingEliminationReserveCombatants,
                preemptedMissions: policy.buildingEliminationPreemptExistingAttacks ? ["external-orders-overridden"] : [],
            });
        }
        const orderEvent: BuildingEliminationTelemetryEvent = {
            schemaVersion: 1,
            event: "target_orders",
            tick,
            attackerCount: assignedAttackers,
            targets: targets.map((target) => ({
                id: target.id,
                name: target.rules.name,
                x: target.tile.rx,
                y: target.tile.ry,
                visible: visibleEnemyIds.has(target.id),
            })),
        };
        const orderSignature = JSON.stringify({ ...orderEvent, tick: 0 });
        if (orderSignature !== lastOrderTelemetrySignature) {
            telemetrySink(orderEvent);
            lastOrderTelemetrySignature = orderSignature;
        }
        const assignmentEvent: BuildingEliminationTelemetryEvent = {
            schemaVersion: 2,
            event: "assignment_summary",
            tick,
            eligibleAttackers: attackers.length,
            assignedAttackers,
            incompatiblePairs,
            unreachablePairs,
            targetCount: targets.length,
        };
        const assignmentSignature = JSON.stringify({ ...assignmentEvent, tick: 0 });
        if (assignmentSignature !== lastAssignmentTelemetrySignature) {
            telemetrySink(assignmentEvent);
            lastAssignmentTelemetrySignature = assignmentSignature;
        }
        lastOrderAt = tick;
    };
    return candidate;
};

export const assertShortGameBuildingEliminationOutcome = (
    winner: ResearchEpisodeResult["winner"],
    finished: boolean,
    candidateDefeated: boolean,
    baselineDefeated: boolean,
    candidateBuildings: number,
    baselineBuildings: number,
    episodeId: string,
): void => {
    if (
        winner === "candidate" &&
        (!finished || candidateDefeated || !baselineDefeated || baselineBuildings !== 0)
    ) {
        throw new Error(`Candidate win violates the short-game building-elimination invariant in ${episodeId}`);
    }
    if (
        winner === "baseline" &&
        (!finished || !candidateDefeated || baselineDefeated || candidateBuildings !== 0)
    ) {
        throw new Error(`Baseline win violates the short-game building-elimination invariant in ${episodeId}`);
    }
};

const buildGameSettings = (
    mapName: string,
    candidate: Bot,
    baseline: ReturnType<BaselineFactory["create"]>,
    candidateSlot: 0 | 1,
): CreateOfflineOpts => {
    const gameMode = cdapi.getAvailableGameModes(mapName)[0];
    if (!gameMode) {
        throw new Error(`No game mode is available for committed map ${mapName}`);
    }
    return {
        buildOffAlly: false,
        cratesAppear: false,
        credits: 10000,
        gameMode,
        gameSpeed: 6,
        mapName,
        mcvRepacks: true,
        shortGame: true,
        superWeapons: false,
        unitCount: 0,
        online: false,
        agents: candidateSlot === 0 ? [candidate, baseline] : [baseline, candidate],
    };
};

/**
 * Run exactly one predeclared game. There is deliberately no retry, start
 * filter, outcome shaping, map-profile switch, or coordinate-bearing policy
 * input in this primitive. Its caller accounts for the launch before calling.
 */
export const runResearchEpisode = async (
    rawSpec: ResearchEpisodeSpec,
    baselineFactory: BaselineFactory,
    onCandidatePolicyEvent: (event: BuildingEliminationTelemetryEvent) => void = () => undefined,
): Promise<ResearchEpisodeResult> => {
    const spec = validateResearchEpisodeSpec(rawSpec);
    const startedAt = Date.now();
    const candidateName = `Candidate_${spec.seedBlockIndex}_${spec.candidateSlot}`;
    const baselineName = `Baseline_${spec.seedBlockIndex}_${spec.candidateSlot}`;
    const candidate = spec.policy.schemaVersion === METHOD_V4_POLICY_SCHEMA_VERSION && spec.policy.preserveBaselineCore
        ? createExternalBaselineOverlayCandidate(
            baselineFactory,
            candidateName,
            spec.candidateCountry,
            spec.policy,
            onCandidatePolicyEvent,
        )
        : new StrongBot(
            candidateName,
            spec.candidateCountry,
            [],
            false,
            new StrongStrategy(buildResearchStrategyOptions(spec.policy), onCandidatePolicyEvent),
            buildResearchBotOptions(spec.policy),
        );
    const baseline = baselineFactory.create(baselineName, spec.baselineCountry);

    return withSeededOfflineGame(
        cdapi,
        buildGameSettings(spec.mapName, candidate, baseline, spec.candidateSlot),
        spec.requestedEngineSeed,
        [
            { agent: candidate, identity: "candidate" },
            { agent: baseline, identity: "baseline" },
        ],
        async (game) => {
            let ticks = 0;
            await game.update();
            ticks++;
            const candidateStart = candidate.lastGameApi?.getPlayerData(candidateName).startLocation;
            const baselineStart = baseline.lastGameApi?.getPlayerData(baselineName).startLocation;
            if (!candidateStart || !baselineStart) {
                throw new Error(`Missing start location after first update for episode ${spec.episodeId}`);
            }

            while (!game.isFinished() && ticks < spec.maxTicks) {
                await game.update();
                ticks++;
            }

            const playerStats = game.getPlayerStats();
            const candidateStats = playerStats.find((row) => row.name === candidateName);
            const baselineStats = playerStats.find((row) => row.name === baselineName);
            if (!candidateStats || !baselineStats) {
                throw new Error(`Missing final player stats for episode ${spec.episodeId}`);
            }
            const winner = getWinner(candidateStats.defeated, baselineStats.defeated);
            const candidateSnapshot = getPlayerSnapshot(candidate.lastGameApi, candidateName);
            const baselineSnapshot = getPlayerSnapshot(baseline.lastGameApi, baselineName);
            assertShortGameBuildingEliminationOutcome(
                winner,
                game.isFinished(),
                candidateStats.defeated,
                baselineStats.defeated,
                candidateSnapshot.buildings,
                baselineSnapshot.buildings,
                spec.episodeId,
            );
            return {
                schemaVersion: RESEARCH_EPISODE_SCHEMA_VERSION,
                episodeId: spec.episodeId,
                familyId: spec.familyId,
                mapName: spec.mapName,
                mapSha256: spec.mapSha256,
                methodId: spec.methodId,
                policyId: spec.policyId,
                policySha256: researchPolicySha256(spec.policy),
                seedBlockIndex: spec.seedBlockIndex,
                requestedEngineSeed: spec.requestedEngineSeed,
                botRandomSeed: deriveBotRandomSeed(spec.requestedEngineSeed),
                candidateBotRandomSeed: deriveParticipantBotRandomSeed(spec.requestedEngineSeed, "candidate"),
                baselineBotRandomSeed: deriveParticipantBotRandomSeed(spec.requestedEngineSeed, "baseline"),
                engineSeedEpochMs: engineSeedToEpochMs(spec.requestedEngineSeed),
                candidateSlot: spec.candidateSlot,
                candidateCountry: spec.candidateCountry,
                baselineCountry: spec.baselineCountry,
                candidateStart: { x: candidateStart.x, y: candidateStart.y },
                baselineStart: { x: baselineStart.x, y: baselineStart.y },
                maxTicks: spec.maxTicks,
                ticks,
                wallTimeMs: Date.now() - startedAt,
                finished: game.isFinished(),
                winner,
                candidateScore: scoreForWinner(winner),
                outcomeEndpoint: RESEARCH_OUTCOME_ENDPOINT,
                candidateDefeated: candidateStats.defeated,
                baselineDefeated: baselineStats.defeated,
                candidate: candidateSnapshot,
                baseline: baselineSnapshot,
            };
        },
    );
};
