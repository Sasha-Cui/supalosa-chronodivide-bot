import { ActionsApi, Bot, CreateOfflineOpts, GameApi, ProductionApi } from "@chronodivide/game-api";
import { withSeededOfflineGame } from "../benchmark/seededOfflineGame.js";
import {
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
    LiteralBuildingEliminationAdjudicator,
    snapshotCombatantBuildings,
} from "./literalBuildingEliminationEndpoint.js";
import {
    installFreshDualStudyInstrumentation,
    PublicActionAudit,
} from "./freshDualStudyInstrumentation.js";
import {
    snapshotUnifiedIntentGate2PublicState,
    UnifiedIntentGate2Trajectory,
} from "./unifiedIntentGate2Trace.js";
import {
    UnifiedIntentM2TelemetryCollector,
    UnifiedIntentM2TelemetrySummary,
    validateUnifiedIntentM2Telemetry,
} from "./unifiedIntentM2Telemetry.js";
import { UnifiedIntentUpdateTelemetry } from
    "@supalosa/chronodivide-bot/dist/bot/logic/intent/unifiedIntentArbiter.js";

export type UnifiedIntentM2InspectableBot = Bot & {
    lastGameApi: GameApi | null;
    lastPlayerActions: ActionsApi | null;
    lastPlayerProduction: ProductionApi | null;
    lastUnifiedIntentTelemetry?: UnifiedIntentUpdateTelemetry | null;
};

export type UnifiedIntentM2EpisodeSpec = {
    mapName: string;
    gameMode: number;
    country: string;
    candidateSlot: 0 | 1;
    candidateStart: string;
    opponentStart: string;
    candidateStartOrdinal: number;
    opponentStartOrdinal: number;
    requestedEngineSeed: number;
    maxUpdates: 24_000;
    enabled: boolean;
    diagnosticOnly?: boolean;
};

export type UnifiedIntentM2TechnicalCategory =
    | "setup_contract"
    | "adjudicator_contract"
    | "telemetry_schema_contract"
    | "public_call_contract";

export class UnifiedIntentM2EpisodeTechnicalError extends Error {
    constructor(readonly technicalCategory: UnifiedIntentM2TechnicalCategory) {
        super(technicalCategory);
    }
}

export type UnifiedIntentM2OutcomeStatus =
    | "candidate_win"
    | "baseline_win"
    | "simultaneous_draw"
    | "engine_nonliteral_termination_draw"
    | "tick_cap_draw";

export type UnifiedIntentM2EpisodeResult = {
    complete: true;
    technicalPass: boolean;
    endpointVersion: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION;
    endpointSha256: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256;
    status: UnifiedIntentM2OutcomeStatus;
    winner: "candidate" | "baseline" | "draw";
    candidateScore: 0 | 0.5 | 1;
    updates: number;
    maxUpdates: 24_000;
    engineFinished: boolean;
    observedStarts: { candidate: string; opponent: string };
    terminalBuildingCounts: { candidate: number; baseline: number };
    endpointEstablished: { candidate: boolean; baseline: boolean };
    quitSuppression: {
        mode: "symmetric_no_forwarding";
        attempts: { candidate: number; baseline: number };
        forwarded: { candidate: number; baseline: number };
    };
    action: {
        sha256: string;
        callCount: number;
        bySideAndMethod: Record<string, number>;
    };
    trajectory: { sha256: string; snapshots: number };
    telemetry: UnifiedIntentM2TelemetrySummary | null;
};

const startKey = (value: { x: number; y: number }): string => `${value.x},${value.y}`;
const setStart = (bot: UnifiedIntentM2InspectableBot, ordinal: number): void => {
    (bot as unknown as { chronoResearchStartPos: number }).chronoResearchStartPos = ordinal;
};
const settings = (
    spec: UnifiedIntentM2EpisodeSpec,
    candidate: Bot,
    opponent: Bot,
): CreateOfflineOpts => ({
    online: false,
    agents: spec.candidateSlot === 0 ? [candidate, opponent] : [opponent, candidate],
    mapName: spec.mapName,
    gameMode: spec.gameMode,
    shortGame: false,
    mcvRepacks: true,
    cratesAppear: false,
    superWeapons: false,
    gameSpeed: 6,
    credits: 10_000,
    unitCount: 0,
    buildOffAlly: false,
    multiEngineer: false,
});

const score = (winner: "candidate" | "baseline" | "draw"): 0 | 0.5 | 1 =>
    winner === "candidate" ? 1 : winner === "baseline" ? 0 : 0.5;

export const runUnifiedIntentM2Episode = async (args: {
    api: { createGame(options: CreateOfflineOpts): Promise<any> };
    spec: UnifiedIntentM2EpisodeSpec;
    candidate: UnifiedIntentM2InspectableBot;
    opponent: UnifiedIntentM2InspectableBot;
}): Promise<UnifiedIntentM2EpisodeResult> => {
    if (args.spec.maxUpdates !== 24_000) throw new Error("Unified intent M2 horizon drifted");
    const candidateName = args.candidate.name;
    const opponentName = args.opponent.name;
    const combatants = { candidate: candidateName, baseline: opponentName };
    const bots = { candidate: args.candidate, baseline: args.opponent };
    setStart(args.candidate, args.spec.candidateStartOrdinal);
    setStart(args.opponent, args.spec.opponentStartOrdinal);
    const adjudicator = new LiteralBuildingEliminationAdjudicator(combatants);
    const actionAudit = new PublicActionAudit();
    let recording = false;
    installFreshDualStudyInstrumentation(bots, {
        observe(event): void {
            if (recording) adjudicator.observe(event);
        },
    }, actionAudit);
    const telemetry = args.spec.enabled ? new UnifiedIntentM2TelemetryCollector() : null;
    return withSeededOfflineGame(
        args.api,
        settings(args.spec, args.candidate, args.opponent),
        args.spec.requestedEngineSeed,
        [
            { agent: args.candidate, identity: "candidate" },
            { agent: args.opponent, identity: "opponent" },
        ],
        async (instance) => {
            const game = args.candidate.lastGameApi;
            if (
                !game || !args.opponent.lastGameApi ||
                !args.candidate.lastPlayerActions || !args.opponent.lastPlayerActions ||
                !args.candidate.lastPlayerProduction || !args.opponent.lastPlayerProduction ||
                instance.isFinished() || game.getCurrentTick() !== 0
            ) throw new UnifiedIntentM2EpisodeTechnicalError("setup_contract");
            const observedStarts = {
                candidate: startKey(game.getPlayerData(candidateName).startLocation),
                opponent: startKey(game.getPlayerData(opponentName).startLocation),
            };
            if (
                observedStarts.candidate !== args.spec.candidateStart ||
                observedStarts.opponent !== args.spec.opponentStart
            ) throw new UnifiedIntentM2EpisodeTechnicalError("setup_contract");
            const trajectory = new UnifiedIntentGate2Trajectory();
            trajectory.observe(snapshotUnifiedIntentGate2PublicState(game, {
                candidate: args.candidate,
                opponent: args.opponent,
            }));
            let lastSnapshotTick = 0;
            let updates = 0;
            let terminal: any = null;
            while (updates < args.spec.maxUpdates && !terminal) {
                adjudicator.beginUpdate(game);
                recording = true;
                try {
                    await instance.update();
                } finally {
                    recording = false;
                }
                updates += 1;
                if (game.getCurrentTick() !== updates) {
                    throw new UnifiedIntentM2EpisodeTechnicalError("setup_contract");
                }
                const currentTelemetry = args.candidate.lastUnifiedIntentTelemetry ?? null;
                if (telemetry) {
                    if (!currentTelemetry) {
                        throw new UnifiedIntentM2EpisodeTechnicalError(
                            "telemetry_schema_contract",
                        );
                    }
                    try {
                        telemetry.observe(currentTelemetry);
                    } catch {
                        throw new UnifiedIntentM2EpisodeTechnicalError(
                            "telemetry_schema_contract",
                        );
                    }
                } else if (currentTelemetry !== null) {
                    throw new UnifiedIntentM2EpisodeTechnicalError(
                        "telemetry_schema_contract",
                    );
                }
                const stats = instance.getPlayerStats();
                const candidateStats = stats.find(({ name }: { name: string }) => name === candidateName);
                const opponentStats = stats.find(({ name }: { name: string }) => name === opponentName);
                if (!candidateStats || !opponentStats) {
                    throw new UnifiedIntentM2EpisodeTechnicalError("setup_contract");
                }
                const completed = adjudicator.completeUpdate(game, {
                    finished: instance.isFinished(),
                    defeated: {
                        candidate: candidateStats.defeated,
                        baseline: opponentStats.defeated,
                    },
                });
                if (completed.technicalFailure) {
                    throw new UnifiedIntentM2EpisodeTechnicalError("adjudicator_contract");
                }
                terminal = completed.terminal;
                if (updates % 6_000 === 0 || terminal) {
                    trajectory.observe(snapshotUnifiedIntentGate2PublicState(game, {
                        candidate: args.candidate,
                        opponent: args.opponent,
                    }));
                    lastSnapshotTick = updates;
                }
            }
            if (lastSnapshotTick !== updates) {
                trajectory.observe(snapshotUnifiedIntentGate2PublicState(game, {
                    candidate: args.candidate,
                    opponent: args.opponent,
                }));
            }
            const status: UnifiedIntentM2OutcomeStatus = terminal
                ? terminal.status
                : "tick_cap_draw";
            const winner: "candidate" | "baseline" | "draw" = terminal
                ? terminal.winner
                : "draw";
            if (
                !["candidate_win", "baseline_win", "simultaneous_draw",
                    "engine_nonliteral_termination_draw", "tick_cap_draw"].includes(status) ||
                !["candidate", "baseline", "draw"].includes(winner)
            ) throw new UnifiedIntentM2EpisodeTechnicalError("adjudicator_contract");
            if (
                actionAudit.quit.forwarded.candidate !== 0 ||
                actionAudit.quit.forwarded.baseline !== 0
            ) throw new UnifiedIntentM2EpisodeTechnicalError("public_call_contract");
            const actions = actionAudit.finish();
            const terminalBuildings = snapshotCombatantBuildings(game, combatants);
            const telemetrySummary = telemetry
                ? args.spec.diagnosticOnly
                    ? telemetry.finishDiagnostic(updates)
                    : telemetry.finish(updates)
                : null;
            let technicalPass = true;
            if (telemetrySummary && args.spec.diagnosticOnly) {
                try {
                    validateUnifiedIntentM2Telemetry(telemetrySummary);
                } catch {
                    technicalPass = false;
                }
            }
            const trajectorySummary = trajectory.finish();
            return {
                complete: true,
                technicalPass,
                endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
                endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
                status,
                winner,
                candidateScore: score(winner),
                updates,
                maxUpdates: 24_000,
                engineFinished: instance.isFinished(),
                observedStarts,
                terminalBuildingCounts: {
                    candidate: terminalBuildings.filter((row) => row.owner === candidateName).length,
                    baseline: terminalBuildings.filter((row) => row.owner === opponentName).length,
                },
                endpointEstablished: adjudicator.getEstablished(),
                quitSuppression: structuredClone(actionAudit.quit),
                action: {
                    sha256: actions.sha256,
                    callCount: actions.callCount,
                    bySideAndMethod: actions.bySideAndMethod,
                },
                trajectory: {
                    sha256: trajectorySummary.sha256,
                    snapshots: trajectorySummary.snapshots.length,
                },
                telemetry: telemetrySummary,
            };
        },
    );
};
