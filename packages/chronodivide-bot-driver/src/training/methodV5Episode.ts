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
    METHOD_V5_INFORMATION_BOUNDARY,
    MethodV5CloseoutPolicy,
    MethodV5CloseoutTelemetry,
    createMethodV5Candidate,
    methodV5CloseoutPolicySha256,
    validateMethodV5CloseoutPolicy,
} from "./methodV5Closeout.js";

export const METHOD_V5_EPISODE_SCHEMA_VERSION = 2 as const;

export type MethodV5EpisodeSpec = {
    schemaVersion: typeof METHOD_V5_EPISODE_SCHEMA_VERSION;
    episodeId: string;
    familyId: string;
    mapName: string;
    mapSha256: string;
    policyId: string;
    policy: MethodV5CloseoutPolicy;
    seedBlockIndex: number;
    requestedEngineSeed: number;
    candidateSlot: 0 | 1;
    candidateCountry: Countries;
    baselineCountry: Countries;
    maxTicks: number;
};

export type MethodV5Winner = "candidate" | "baseline" | "draw";
export type MethodV5OutcomeStatus =
    | "candidate_win"
    | "baseline_win"
    | "simultaneous_draw"
    | "engine_nonliteral_termination_draw"
    | "tick_cap_draw"
    | "technical_failure";

export type MethodV5EpisodeResult = {
    schemaVersion: typeof METHOD_V5_EPISODE_SCHEMA_VERSION;
    episodeId: string;
    familyId: string;
    mapName: string;
    mapSha256: string;
    policyId: string;
    policySha256: string;
    policyInformationBoundary: typeof METHOD_V5_INFORMATION_BOUNDARY;
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
    outcomeStatus: MethodV5OutcomeStatus;
    winner: MethodV5Winner | null;
    candidateScore: 0 | 0.5 | 1 | null;
    engineFinished: boolean;
    terminal: LiteralEndpointTerminal | LiteralEndpointCapDraw | null;
    technicalFailure: LiteralEndpointTechnicalFailure | null;
    quitSuppression: QuitSuppressionAudit;
    terminalBuildingCounts: EndpointCounts;
    endpointEstablished: EndpointEstablished;
    dispositionHistory: BuildingDisposition[];
    policyTelemetry: MethodV5CloseoutTelemetry[];
};

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9._-]+$/;

export const validateMethodV5EpisodeSpec = (spec: MethodV5EpisodeSpec): MethodV5EpisodeSpec => {
    if (spec.schemaVersion !== METHOD_V5_EPISODE_SCHEMA_VERSION) {
        throw new Error(`Method-v5 episode schemaVersion must be ${METHOD_V5_EPISODE_SCHEMA_VERSION}`);
    }
    for (const [label, value] of [
        ["episodeId", spec.episodeId],
        ["familyId", spec.familyId],
    ] as const) {
        if (!IDENTIFIER_PATTERN.test(value)) throw new Error(`${label} contains an invalid character`);
    }
    if (spec.mapName !== spec.mapName.split(/[\\/]/).pop() || !/\.(map|mpr)$/i.test(spec.mapName)) {
        throw new Error(`Method-v5 mapName must be a .map or .mpr basename; got ${spec.mapName}`);
    }
    if (!SHA256_PATTERN.test(spec.mapSha256)) throw new Error("Method-v5 mapSha256 must be lowercase SHA-256");
    const policy = validateMethodV5CloseoutPolicy(spec.policy);
    if (methodV5CloseoutPolicySha256(policy) !== spec.policyId) {
        throw new Error("Method-v5 policyId does not equal the canonical policy SHA-256");
    }
    if (!Number.isSafeInteger(spec.seedBlockIndex) || spec.seedBlockIndex < 0) {
        throw new Error("Method-v5 seedBlockIndex must be a nonnegative integer");
    }
    if (
        !Number.isSafeInteger(spec.requestedEngineSeed) ||
        spec.requestedEngineSeed < 0 ||
        spec.requestedEngineSeed > 0xffff_ffff
    ) throw new Error("Method-v5 requestedEngineSeed must be uint32");
    if (spec.candidateSlot !== 0 && spec.candidateSlot !== 1) {
        throw new Error("Method-v5 candidateSlot must be 0 or 1");
    }
    if (!Object.values(Countries).includes(spec.candidateCountry)) {
        throw new Error("Method-v5 candidateCountry is invalid");
    }
    if (!Object.values(Countries).includes(spec.baselineCountry)) {
        throw new Error("Method-v5 baselineCountry is invalid");
    }
    if (!Number.isSafeInteger(spec.maxTicks) || spec.maxTicks < 1 || spec.maxTicks > 100_000) {
        throw new Error("Method-v5 maxTicks must be in [1, 100000]");
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

const score = (winner: MethodV5Winner | null): 0 | 0.5 | 1 | null =>
    winner === "candidate" ? 1 : winner === "baseline" ? 0 : winner === "draw" ? 0.5 : null;

/**
 * Runs one predeclared Method-v5 episode. There is no retry or outcome shaping.
 * Complete-state enumeration exists only in the adjudicator instantiated here;
 * no adjudicator reference is passed into the candidate strategy.
 */
export const runMethodV5Episode = async (
    rawSpec: MethodV5EpisodeSpec,
    baselineFactory: BaselineFactory,
): Promise<MethodV5EpisodeResult> => {
    const spec = validateMethodV5EpisodeSpec(rawSpec);
    const startedAt = Date.now();
    const candidateName = `MethodV6Candidate_${spec.seedBlockIndex}_${spec.candidateSlot}`;
    const baselineName = `MethodV6Baseline_${spec.seedBlockIndex}_${spec.candidateSlot}`;
    const policyTelemetry: MethodV5CloseoutTelemetry[] = [];
    const candidate = createMethodV5Candidate(
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
            const outcomeStatus: MethodV5OutcomeStatus = technicalFailure
                ? "technical_failure"
                : terminal
                  ? terminal.status
                  : "tick_cap_draw";
            const winner: MethodV5Winner | null = technicalFailure
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
                schemaVersion: METHOD_V5_EPISODE_SCHEMA_VERSION,
                episodeId: spec.episodeId,
                familyId: spec.familyId,
                mapName: spec.mapName,
                mapSha256: spec.mapSha256,
                policyId: spec.policyId,
                policySha256: methodV5CloseoutPolicySha256(spec.policy),
                policyInformationBoundary: METHOD_V5_INFORMATION_BOUNDARY,
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
