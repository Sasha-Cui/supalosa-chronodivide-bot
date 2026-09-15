import { ActionsApi, Bot, CreateOfflineOpts, GameApi, ProductionApi } from "@chronodivide/game-api";
import { withSeededOfflineGame } from "../benchmark/seededOfflineGame.js";
import {
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
    LiteralBuildingEliminationAdjudicator,
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
    UnifiedIntentV2TelemetryCollector,
    UnifiedIntentV2TelemetrySummary,
} from "./unifiedIntentV2Telemetry.js";
import { UnifiedIntentUpdateTelemetry } from
    "@supalosa/chronodivide-bot/dist/bot/logic/intent/unifiedIntentArbiter.js";

export type UnifiedIntentV2InspectableBot = Bot & {
    lastGameApi: GameApi | null;
    lastPlayerActions: ActionsApi | null;
    lastPlayerProduction: ProductionApi | null;
    lastUnifiedIntentTelemetry?: UnifiedIntentUpdateTelemetry | null;
};

export type UnifiedIntentV2TechnicalSpec = {
    mapName: string;
    gameMode: number;
    candidateSlot: 0 | 1;
    candidateStart: string;
    opponentStart: string;
    candidateStartOrdinal: number;
    opponentStartOrdinal: number;
    requestedEngineSeed: number;
    maxUpdates: 24_000;
};

export type UnifiedIntentV2TechnicalResult = {
    complete: true;
    technicalPass: true;
    updates: number;
    literalAdjudicatorVersion: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION;
    literalAdjudicatorSha256: typeof LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256;
    observedStarts: { candidate: string; opponent: string };
    quitSuppression: {
        mode: "symmetric_no_forwarding";
        attempts: { candidate: number; baseline: number };
        forwarded: { candidate: number; baseline: number };
    };
    publicCall: {
        sha256: string;
        bySideAndMethod: Record<string, number>;
    };
    publicState: { sha256: string; snapshots: number };
    telemetry: UnifiedIntentV2TelemetrySummary;
};

const startKey = (value: { x: number; y: number }): string => `${value.x},${value.y}`;
const setStart = (bot: UnifiedIntentV2InspectableBot, ordinal: number): void => {
    (bot as unknown as { chronoResearchStartPos: number }).chronoResearchStartPos = ordinal;
};
const settings = (
    spec: UnifiedIntentV2TechnicalSpec,
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

export const runUnifiedIntentV2TechnicalEpisode = async (args: {
    api: { createGame(options: CreateOfflineOpts): Promise<any> };
    spec: UnifiedIntentV2TechnicalSpec;
    candidate: UnifiedIntentV2InspectableBot;
    opponent: UnifiedIntentV2InspectableBot;
}): Promise<UnifiedIntentV2TechnicalResult> => {
    if (args.spec.maxUpdates !== 24_000) throw new Error("V2 technical horizon drifted");
    const candidateName = args.candidate.name;
    const opponentName = args.opponent.name;
    const combatants = { candidate: candidateName, baseline: opponentName };
    const bots = { candidate: args.candidate, baseline: args.opponent };
    setStart(args.candidate, args.spec.candidateStartOrdinal);
    setStart(args.opponent, args.spec.opponentStartOrdinal);
    const adjudicator = new LiteralBuildingEliminationAdjudicator(combatants);
    const calls = new PublicActionAudit();
    const telemetry = new UnifiedIntentV2TelemetryCollector();
    let recording = false;
    installFreshDualStudyInstrumentation(bots, {
        observe(event): void {
            if (recording) adjudicator.observe(event);
        },
    }, calls);
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
            if (!game || !args.opponent.lastGameApi || instance.isFinished() ||
                game.getCurrentTick() !== 0) {
                throw new Error("V2 technical episode did not initialize cleanly");
            }
            const observedStarts = {
                candidate: startKey(game.getPlayerData(candidateName).startLocation),
                opponent: startKey(game.getPlayerData(opponentName).startLocation),
            };
            if (observedStarts.candidate !== args.spec.candidateStart ||
                observedStarts.opponent !== args.spec.opponentStart) {
                throw new Error("V2 technical start drifted");
            }
            const trajectory = new UnifiedIntentGate2Trajectory();
            trajectory.observe(snapshotUnifiedIntentGate2PublicState(game, {
                candidate: args.candidate,
                opponent: args.opponent,
            }));
            let updates = 0;
            let lastSnapshot = 0;
            let complete = false;
            while (updates < args.spec.maxUpdates && !complete) {
                adjudicator.beginUpdate(game);
                recording = true;
                try {
                    await instance.update();
                } finally {
                    recording = false;
                }
                updates += 1;
                if (game.getCurrentTick() !== updates) throw new Error("V2 technical clock drifted");
                const current = args.candidate.lastUnifiedIntentTelemetry ?? null;
                if (!current) throw new Error("V2 technical telemetry is absent");
                telemetry.observe(current);
                const stats = instance.getPlayerStats();
                const candidateStats = stats.find(({ name }: { name: string }) => name === candidateName);
                const opponentStats = stats.find(({ name }: { name: string }) => name === opponentName);
                if (!candidateStats || !opponentStats) throw new Error("V2 technical stats drifted");
                const completed = adjudicator.completeUpdate(game, {
                    finished: instance.isFinished(),
                    defeated: {
                        candidate: candidateStats.defeated,
                        baseline: opponentStats.defeated,
                    },
                });
                if (completed.technicalFailure) throw new Error("V2 adjudicator failed technically");
                complete = completed.terminal !== null;
                if (updates % 6_000 === 0 || complete) {
                    trajectory.observe(snapshotUnifiedIntentGate2PublicState(game, {
                        candidate: args.candidate,
                        opponent: args.opponent,
                    }));
                    lastSnapshot = updates;
                }
            }
            if (lastSnapshot !== updates) {
                trajectory.observe(snapshotUnifiedIntentGate2PublicState(game, {
                    candidate: args.candidate,
                    opponent: args.opponent,
                }));
            }
            if (calls.quit.forwarded.candidate !== 0 || calls.quit.forwarded.baseline !== 0) {
                throw new Error("V2 technical episode forwarded a resignation");
            }
            const action = calls.finish();
            const state = trajectory.finish();
            return {
                complete: true,
                technicalPass: true,
                updates,
                literalAdjudicatorVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
                literalAdjudicatorSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
                observedStarts,
                quitSuppression: structuredClone(calls.quit),
                publicCall: {
                    sha256: action.sha256,
                    bySideAndMethod: action.bySideAndMethod,
                },
                publicState: { sha256: state.sha256, snapshots: state.snapshots.length },
                telemetry: telemetry.finish(updates),
            };
        },
    );
};
