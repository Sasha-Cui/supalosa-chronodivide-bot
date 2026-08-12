import { CreateOfflineOpts, GameApi, ObjectType, cdapi } from "@chronodivide/game-api";
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
    candidate: StrongBot,
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
    const candidate = new StrongBot(
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
