import { Bot, CreateOfflineOpts, GameApi, cdapi } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import crypto from "node:crypto";
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
    FinishAdvantageOpenArm,
    FinishAdvantageOpenArmId,
} from "./finishAdvantageOpenCausalScreenAnalysis.js";
import { createFinishAdvantageCompositeCandidate } from "./finishAdvantageCompositeCandidate.js";
import {
    buildFinishAdvantageIrreversiblePolicy,
    buildFinishAdvantageSurplusPolicy,
} from "./finishAdvantagePolicy.js";
import { FinishAdvantageTelemetry } from "./finishAdvantageStrategy.js";
import {
    buildProgressCertifiedConversionPolicyV5,
    progressCertifiedConversionPolicyV5Sha256,
} from "./progressCertifiedConversionPolicyV5.js";
import { TerminalObjectiveTelemetry } from "./terminalObjectiveStrategy.js";
import { TerminalBaseRaceMode } from "./terminalBaseRaceGuard.js";

export const FINISH_ADVANTAGE_OPEN_EPISODE_SCHEMA_VERSION = 2 as const;

export type FinishAdvantageOpenEpisodeSpec = {
    schemaVersion: typeof FINISH_ADVANTAGE_OPEN_EPISODE_SCHEMA_VERSION;
    episodeId: string;
    familyId: string;
    mapName: string;
    mapSha256: string;
    arm: FinishAdvantageOpenArm;
    policySha256: string;
    familyOrdinal: number;
    countryOrdinal: number;
    requestedEngineSeed: number;
    candidateSlot: 0 | 1;
    candidateCountry: Countries;
    baselineCountry: Countries;
    maxTicks: number;
};

export type FinishAdvantageOpenWinner = "candidate" | "baseline" | "draw";
export type FinishAdvantageOpenOutcomeStatus =
    | "candidate_win"
    | "baseline_win"
    | "simultaneous_draw"
    | "engine_nonliteral_termination_draw"
    | "tick_cap_draw"
    | "technical_failure";

export type FinishAdvantageOpenEpisodeResult = {
    schemaVersion: typeof FINISH_ADVANTAGE_OPEN_EPISODE_SCHEMA_VERSION;
    episodeId: string;
    familyId: string;
    mapName: string;
    mapSha256: string;
    armId: FinishAdvantageOpenArmId;
    terminalBaseRaceMode: TerminalBaseRaceMode | "none";
    policySha256: string;
    policyInformationBoundary: "none" | "public_complete_state";
    endpointVersion: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION;
    endpointSha256: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256;
    endpoint: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT;
    familyOrdinal: number;
    countryOrdinal: number;
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
    outcomeStatus: FinishAdvantageOpenOutcomeStatus;
    winner: FinishAdvantageOpenWinner | null;
    candidateScore: 0 | 0.5 | 1 | null;
    engineFinished: boolean;
    terminal: LiteralEndpointTerminal | LiteralEndpointCapDraw | null;
    technicalFailure: LiteralEndpointTechnicalFailure | null;
    quitSuppression: QuitSuppressionAudit;
    terminalBuildingCounts: EndpointCounts;
    endpointEstablished: EndpointEstablished;
    dispositionHistory: BuildingDisposition[];
    v5Telemetry: TerminalObjectiveTelemetry[];
    finishAdvantageTelemetry: FinishAdvantageTelemetry[];
};

const SHA256 = /^[0-9a-f]{64}$/;
const IDENTIFIER = /^[A-Za-z0-9._-]+$/;
const canonicalHash = (value: unknown): string => crypto.createHash("sha256")
    .update(JSON.stringify(value)).digest("hex");

export const finishAdvantageOpenArmPolicyCommitment = (
    arm: FinishAdvantageOpenArm,
): { policySha256: string; policy: Record<string, unknown> } => {
    const v5 = buildProgressCertifiedConversionPolicyV5();
    const disabledV5 = { ...v5, enabled: false };
    const irreversible = buildFinishAdvantageIrreversiblePolicy();
    const finish = arm.kind === "surplus"
        ? buildFinishAdvantageSurplusPolicy(arm.margin!)
        : arm.kind === "irreversible"
            ? irreversible
            : { ...irreversible, enabled: false };
    const policy = {
        architecture: "exact_supalosa_then_optional_finish_then_explicit_terminal_base_race_v5",
        armId: arm.armId,
        terminalBaseRaceMode: arm.terminalBaseRaceMode,
        v5: arm.kind === "control" ? disabledV5 : v5,
        v5Sha256: progressCertifiedConversionPolicyV5Sha256(
            arm.kind === "control" ? disabledV5 : v5,
        ),
        finishAdvantage: finish,
    };
    return { policy, policySha256: canonicalHash(policy) };
};

export const validateFinishAdvantageOpenEpisodeSpec = (
    spec: FinishAdvantageOpenEpisodeSpec,
): FinishAdvantageOpenEpisodeSpec => {
    if (spec.schemaVersion !== FINISH_ADVANTAGE_OPEN_EPISODE_SCHEMA_VERSION) {
        throw new Error("Finish-advantage open episode schema drifted");
    }
    if (!IDENTIFIER.test(spec.episodeId) || !IDENTIFIER.test(spec.familyId)) {
        throw new Error("Finish-advantage open episode identifier is invalid");
    }
    if (spec.mapName !== spec.mapName.split(/[\\/]/).pop() || !/\.(map|mpr)$/i.test(spec.mapName)) {
        throw new Error("Finish-advantage open map name must be a map basename");
    }
    if (!SHA256.test(spec.mapSha256) || !SHA256.test(spec.policySha256)) {
        throw new Error("Finish-advantage open episode SHA-256 is invalid");
    }
    const expectedPolicy = finishAdvantageOpenArmPolicyCommitment(spec.arm);
    if (expectedPolicy.policySha256 !== spec.policySha256) {
        throw new Error("Finish-advantage open arm policy commitment drifted");
    }
    if (
        !Number.isSafeInteger(spec.familyOrdinal) || spec.familyOrdinal < 0 || spec.familyOrdinal >= 10 ||
        !Number.isSafeInteger(spec.countryOrdinal) || spec.countryOrdinal < 0 || spec.countryOrdinal >= 9 ||
        !Number.isSafeInteger(spec.requestedEngineSeed) || spec.requestedEngineSeed < 0 ||
        spec.requestedEngineSeed > 0xffff_ffff ||
        (spec.candidateSlot !== 0 && spec.candidateSlot !== 1) ||
        !Object.values(Countries).includes(spec.candidateCountry) ||
        !Object.values(Countries).includes(spec.baselineCountry) ||
        spec.candidateCountry !== spec.baselineCountry ||
        !Number.isSafeInteger(spec.maxTicks) || spec.maxTicks < 1 || spec.maxTicks > 100_000
    ) throw new Error("Finish-advantage open episode grid or horizon is invalid");
    return structuredClone(spec);
};

const settings = (
    mapName: string,
    candidate: Bot,
    baseline: Bot,
    candidateSlot: 0 | 1,
): CreateOfflineOpts => {
    const gameMode = cdapi.getAvailableGameModes(mapName)[0];
    if (!gameMode) throw new Error(`No game mode is available for ${mapName}`);
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

const score = (winner: FinishAdvantageOpenWinner | null): 0 | 0.5 | 1 | null =>
    winner === "candidate" ? 1 : winner === "baseline" ? 0 : winner === "draw" ? 0.5 : null;

const createCandidate = (
    factory: BaselineFactory,
    name: string,
    country: Countries,
    arm: FinishAdvantageOpenArm,
    v5Telemetry: TerminalObjectiveTelemetry[],
    finishTelemetry: FinishAdvantageTelemetry[],
): InspectableBaselineBot => {
    if (arm.kind === "control") return factory.create(name, country);
    const v5 = buildProgressCertifiedConversionPolicyV5();
    const irreversible = buildFinishAdvantageIrreversiblePolicy();
    const finish = arm.kind === "surplus"
        ? buildFinishAdvantageSurplusPolicy(arm.margin!)
        : arm.kind === "irreversible"
            ? irreversible
            : { ...irreversible, enabled: false };
    if (arm.terminalBaseRaceMode === "none") {
        throw new Error("Non-control open arm lacks a terminal base-race mode");
    }
    return createFinishAdvantageCompositeCandidate(
        factory,
        name,
        country,
        v5,
        finish,
        { terminalBaseRaceMode: arm.terminalBaseRaceMode },
        {
            v5: (event) => v5Telemetry.push(event),
            finishAdvantage: (event) => finishTelemetry.push(event),
        },
    );
};

/** Run exactly one predeclared open-development game; there is no retry path. */
export const runFinishAdvantageOpenEpisode = async (
    rawSpec: FinishAdvantageOpenEpisodeSpec,
    baselineFactory: BaselineFactory,
): Promise<FinishAdvantageOpenEpisodeResult> => {
    const spec = validateFinishAdvantageOpenEpisodeSpec(rawSpec);
    const startedAt = Date.now();
    const candidateName = `FinishCandidate_${spec.familyOrdinal}_${spec.countryOrdinal}_${spec.candidateSlot}`;
    const baselineName = `FinishBaseline_${spec.familyOrdinal}_${spec.countryOrdinal}_${spec.candidateSlot}`;
    const v5Telemetry: TerminalObjectiveTelemetry[] = [];
    const finishAdvantageTelemetry: FinishAdvantageTelemetry[] = [];
    const candidate = createCandidate(
        baselineFactory,
        candidateName,
        spec.candidateCountry,
        spec.arm,
        v5Telemetry,
        finishAdvantageTelemetry,
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
        settings(spec.mapName, candidate, baseline, spec.candidateSlot),
        spec.requestedEngineSeed,
        [{ agent: candidate, identity: "candidate" }, { agent: baseline, identity: "baseline" }],
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
                const stats = game.getPlayerStats();
                const candidateStats = stats.find(({ name }) => name === candidateName);
                const baselineStats = stats.find(({ name }) => name === baselineName);
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
            const capDraw: LiteralEndpointCapDraw | null = !terminal && !technicalFailure && ticks >= spec.maxTicks
                ? {
                    endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
                    endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
                    tick: candidateApi.getCurrentTick(),
                    status: "tick_cap_draw",
                    winner: "draw",
                }
                : null;
            const outcomeStatus: FinishAdvantageOpenOutcomeStatus = technicalFailure
                ? "technical_failure"
                : terminal?.status ?? "tick_cap_draw";
            const winner: FinishAdvantageOpenWinner | null = technicalFailure
                ? null
                : terminal?.winner ?? "draw";
            if (quitSuppression.forwarded.candidate !== 0 || quitSuppression.forwarded.baseline !== 0) {
                throw new Error("A suppressed resignation was forwarded");
            }
            const buildings = snapshotCombatantBuildings(candidateApi, {
                candidate: candidateName,
                baseline: baselineName,
            });
            return {
                schemaVersion: FINISH_ADVANTAGE_OPEN_EPISODE_SCHEMA_VERSION,
                episodeId: spec.episodeId,
                familyId: spec.familyId,
                mapName: spec.mapName,
                mapSha256: spec.mapSha256,
                armId: spec.arm.armId,
                terminalBaseRaceMode: spec.arm.terminalBaseRaceMode,
                policySha256: spec.policySha256,
                policyInformationBoundary: spec.arm.kind === "control" ? "none" : "public_complete_state",
                endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
                endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
                endpoint: LITERAL_BUILDING_ELIMINATION_ENDPOINT,
                familyOrdinal: spec.familyOrdinal,
                countryOrdinal: spec.countryOrdinal,
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
                    candidate: buildings.filter(({ owner }) => owner === candidateName).length,
                    baseline: buildings.filter(({ owner }) => owner === baselineName).length,
                },
                endpointEstablished: adjudicator.getEstablished(),
                dispositionHistory: adjudicator.getDispositionHistory(),
                v5Telemetry,
                finishAdvantageTelemetry,
            };
        },
    );
};
