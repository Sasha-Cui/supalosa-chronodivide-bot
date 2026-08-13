import { Bot, CreateOfflineOpts, GameApi, cdapi } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { BaselineFactory, InspectableBaselineBot } from "../benchmark/baselineLoader.js";
import {
    deriveBotRandomSeed,
    deriveParticipantBotRandomSeed,
    engineSeedToEpochMs,
    withSeededOfflineGame,
} from "../benchmark/seededOfflineGame.js";
import {
    BuildingDisposition,
    EndpointCounts,
    EndpointEstablished,
    LITERAL_BUILDING_ELIMINATION_ENDPOINT,
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
    LiteralBuildingEliminationAdjudicator,
    LiteralEndpointCapDraw,
    LiteralEndpointTechnicalFailure,
    LiteralEndpointTerminal,
    QuitSuppressionAudit,
    installLiteralEndpointInstrumentation,
    snapshotCombatantBuildings,
} from "./literalBuildingEliminationEndpoint.js";
import {
    TerminalObjectiveTelemetry,
    createTerminalObjectiveCandidate,
} from "./terminalObjectiveStrategy.js";
import {
    TerminalRacePolicy,
    terminalRacePolicySha256,
    validateTerminalRacePolicy,
} from "./terminalRacePolicy.js";

export const TERMINAL_RACE_EPISODE_SCHEMA_VERSION = 2 as const;

export type TerminalRaceEpisodeSpec = {
    schemaVersion: typeof TERMINAL_RACE_EPISODE_SCHEMA_VERSION;
    episodeId: string;
    familyId: string;
    mapName: string;
    mapSha256: string;
    policyId: string;
    policy: TerminalRacePolicy;
    seedBlockIndex: number;
    requestedEngineSeed: number;
    candidateSlot: 0 | 1;
    candidateCountry: Countries;
    baselineCountry: Countries;
    maxTicks: number;
};

export type TerminalRaceWinner = "candidate" | "baseline" | "draw";
export type TerminalRaceOutcomeStatus =
    | "candidate_win"
    | "baseline_win"
    | "simultaneous_draw"
    | "engine_nonliteral_termination_draw"
    | "tick_cap_draw"
    | "technical_failure";

export type TerminalRaceEpisodeResult = {
    schemaVersion: typeof TERMINAL_RACE_EPISODE_SCHEMA_VERSION;
    episodeId: string;
    familyId: string;
    mapName: string;
    mapSha256: string;
    policyId: string;
    policySha256: string;
    policyInformationBoundary: TerminalRacePolicy["informationInterface"];
    endpointVersion: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION;
    endpointSha256: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256;
    endpoint: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT;
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
    shortGame: false;
    outcomeStatus: TerminalRaceOutcomeStatus;
    winner: TerminalRaceWinner | null;
    candidateScore: 0 | 0.5 | 1 | null;
    engineFinished: boolean;
    terminal: LiteralEndpointTerminal | LiteralEndpointCapDraw | null;
    technicalFailure: LiteralEndpointTechnicalFailure | null;
    quitSuppression: QuitSuppressionAudit;
    terminalBuildingCounts: EndpointCounts;
    endpointEstablished: EndpointEstablished;
    dispositionHistory: BuildingDisposition[];
    policyTelemetry: TerminalObjectiveTelemetry[];
};

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9._-]+$/;

export const validateTerminalRaceEpisodeSpec = (spec: TerminalRaceEpisodeSpec): TerminalRaceEpisodeSpec => {
    if (spec.schemaVersion !== TERMINAL_RACE_EPISODE_SCHEMA_VERSION) {
        throw new Error(`Terminal-race episode schemaVersion must be ${TERMINAL_RACE_EPISODE_SCHEMA_VERSION}`);
    }
    for (const [label, value] of [
        ["episodeId", spec.episodeId],
        ["familyId", spec.familyId],
    ] as const) {
        if (!IDENTIFIER_PATTERN.test(value)) throw new Error(`${label} contains an invalid character`);
    }
    if (spec.mapName !== spec.mapName.split(/[\\/]/).pop() || !/\.(map|mpr)$/i.test(spec.mapName)) {
        throw new Error(`Terminal-race mapName must be a .map or .mpr basename; got ${spec.mapName}`);
    }
    if (!SHA256_PATTERN.test(spec.mapSha256)) throw new Error("Terminal-race mapSha256 must be lowercase SHA-256");
    const policy = validateTerminalRacePolicy(spec.policy);
    if (terminalRacePolicySha256(policy) !== spec.policyId) {
        throw new Error("Terminal-race policyId does not equal the canonical policy SHA-256");
    }
    if (!Number.isSafeInteger(spec.seedBlockIndex) || spec.seedBlockIndex < 0) {
        throw new Error("Terminal-race seedBlockIndex must be a nonnegative integer");
    }
    if (
        !Number.isSafeInteger(spec.requestedEngineSeed) ||
        spec.requestedEngineSeed < 0 ||
        spec.requestedEngineSeed > 0xffff_ffff
    ) throw new Error("Terminal-race requestedEngineSeed must be uint32");
    if (spec.candidateSlot !== 0 && spec.candidateSlot !== 1) {
        throw new Error("Terminal-race candidateSlot must be 0 or 1");
    }
    if (!Object.values(Countries).includes(spec.candidateCountry)) {
        throw new Error("Terminal-race candidateCountry is invalid");
    }
    if (!Object.values(Countries).includes(spec.baselineCountry)) {
        throw new Error("Terminal-race baselineCountry is invalid");
    }
    if (!Number.isSafeInteger(spec.maxTicks) || spec.maxTicks < 1 || spec.maxTicks > 100_000) {
        throw new Error("Terminal-race maxTicks must be in [1, 100000]");
    }
    return { ...spec, policy };
};

const buildSettings = (
    mapName: string,
    candidate: Bot,
    baseline: Bot,
    candidateSlot: 0 | 1,
): CreateOfflineOpts => {
    const gameMode = cdapi.getAvailableGameModes(mapName)[0];
    if (!gameMode) throw new Error(`No game mode is available for committed map ${mapName}`);
    return {
        buildOffAlly: false,
        cratesAppear: false,
        credits: 10_000,
        gameMode,
        gameSpeed: 6,
        mapName,
        mcvRepacks: true,
        shortGame: false,
        superWeapons: false,
        unitCount: 0,
        online: false,
        agents: candidateSlot === 0 ? [candidate, baseline] : [baseline, candidate],
    };
};

const requireApi = (bot: InspectableBaselineBot, label: string): GameApi => {
    if (!bot.lastGameApi) throw new Error(`Missing ${label} GameApi after game creation`);
    return bot.lastGameApi;
};

const score = (winner: TerminalRaceWinner | null): 0 | 0.5 | 1 | null =>
    winner === "candidate" ? 1 : winner === "baseline" ? 0 : winner === "draw" ? 0.5 : null;

/**
 * Runs one predeclared Terminal-race episode. There is no retry or outcome shaping.
 * Complete-state enumeration exists only in the adjudicator instantiated here;
 * no adjudicator reference is passed into the candidate strategy.
 */
export const runTerminalRaceEpisode = async (
    rawSpec: TerminalRaceEpisodeSpec,
    baselineFactory: BaselineFactory,
): Promise<TerminalRaceEpisodeResult> => {
    const spec = validateTerminalRaceEpisodeSpec(rawSpec);
    const startedAt = Date.now();
    const candidateName = `TerminalRaceCandidate_${spec.seedBlockIndex}_${spec.candidateSlot}`;
    const baselineName = `TerminalRaceBaseline_${spec.seedBlockIndex}_${spec.candidateSlot}`;
    const policyTelemetry: TerminalObjectiveTelemetry[] = [];
    const candidate = createTerminalObjectiveCandidate(
        baselineFactory,
        candidateName,
        spec.candidateCountry,
        spec.policy,
        (event) => policyTelemetry.push(event),
    );
    const baseline = baselineFactory.create(baselineName, spec.baselineCountry);
    const adjudicator = new LiteralBuildingEliminationAdjudicator({
        candidate: candidateName,
        baseline: baselineName,
    });
    const { audit: quitSuppression } = installLiteralEndpointInstrumentation(
        { candidate, baseline },
        adjudicator,
    );

    return withSeededOfflineGame(
        cdapi,
        buildSettings(spec.mapName, candidate, baseline, spec.candidateSlot),
        spec.requestedEngineSeed,
        [
            { agent: candidate, identity: "candidate" },
            { agent: baseline, identity: "baseline" },
        ],
        async (game) => {
            const candidateApi = requireApi(candidate, "candidate");
            const baselineApi = requireApi(baseline, "baseline");
            const candidateStartRaw = candidateApi.getPlayerData(candidateName).startLocation;
            const baselineStartRaw = baselineApi.getPlayerData(baselineName).startLocation;
            const candidateStart = { x: candidateStartRaw.x, y: candidateStartRaw.y };
            const baselineStart = { x: baselineStartRaw.x, y: baselineStartRaw.y };
            let ticks = 0;
            let terminal: LiteralEndpointTerminal | null = null;
            let technicalFailure: LiteralEndpointTechnicalFailure | null = null;
            while (ticks < spec.maxTicks && !terminal && !technicalFailure) {
                adjudicator.beginUpdate(candidateApi);
                await game.update();
                ticks += 1;
                const playerStats = game.getPlayerStats();
                const candidateStats = playerStats.find(({ name }) => name === candidateName);
                const baselineStats = playerStats.find(({ name }) => name === baselineName);
                if (!candidateStats || !baselineStats) {
                    throw new Error(`Missing public player statistics for ${spec.episodeId}`);
                }
                const completed = adjudicator.completeUpdate(candidateApi, {
                    finished: game.isFinished(),
                    defeated: {
                        candidate: candidateStats.defeated,
                        baseline: baselineStats.defeated,
                    },
                });
                terminal = completed.terminal;
                technicalFailure = completed.technicalFailure;
            }
            const capDraw: LiteralEndpointCapDraw | null =
                !terminal && !technicalFailure && ticks >= spec.maxTicks
                    ? {
                          endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
                          endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
                          tick: candidateApi.getCurrentTick(),
                          status: "tick_cap_draw",
                          winner: "draw",
                      }
                    : null;
            const outcomeStatus: TerminalRaceOutcomeStatus = technicalFailure
                ? "technical_failure"
                : terminal
                  ? terminal.status
                  : "tick_cap_draw";
            const winner: TerminalRaceWinner | null = technicalFailure
                ? null
                : terminal
                  ? terminal.winner
                  : "draw";
            if (
                quitSuppression.forwarded.candidate !== 0 ||
                quitSuppression.forwarded.baseline !== 0
            ) throw new Error("A suppressed resignation was forwarded");
            const terminalBuildings = snapshotCombatantBuildings(candidateApi, {
                candidate: candidateName,
                baseline: baselineName,
            });
            return {
                schemaVersion: TERMINAL_RACE_EPISODE_SCHEMA_VERSION,
                episodeId: spec.episodeId,
                familyId: spec.familyId,
                mapName: spec.mapName,
                mapSha256: spec.mapSha256,
                policyId: spec.policyId,
                policySha256: terminalRacePolicySha256(spec.policy),
                policyInformationBoundary: spec.policy.informationInterface,
                endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
                endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
                endpoint: LITERAL_BUILDING_ELIMINATION_ENDPOINT,
                seedBlockIndex: spec.seedBlockIndex,
                requestedEngineSeed: spec.requestedEngineSeed,
                botRandomSeed: deriveBotRandomSeed(spec.requestedEngineSeed),
                candidateBotRandomSeed: deriveParticipantBotRandomSeed(spec.requestedEngineSeed, "candidate"),
                baselineBotRandomSeed: deriveParticipantBotRandomSeed(spec.requestedEngineSeed, "baseline"),
                engineSeedEpochMs: engineSeedToEpochMs(spec.requestedEngineSeed),
                candidateSlot: spec.candidateSlot,
                candidateCountry: spec.candidateCountry,
                baselineCountry: spec.baselineCountry,
                candidateStart,
                baselineStart,
                maxTicks: spec.maxTicks,
                ticks,
                wallTimeMs: Date.now() - startedAt,
                shortGame: false,
                outcomeStatus,
                winner,
                candidateScore: score(winner),
                engineFinished: game.isFinished(),
                terminal: terminal ?? capDraw,
                technicalFailure,
                quitSuppression,
                terminalBuildingCounts: {
                    candidate: terminalBuildings.filter(({ owner }) => owner === candidateName).length,
                    baseline: terminalBuildings.filter(({ owner }) => owner === baselineName).length,
                },
                endpointEstablished: adjudicator.getEstablished(),
                dispositionHistory: adjudicator.getDispositionHistory(),
                policyTelemetry,
            };
        },
    );
};
