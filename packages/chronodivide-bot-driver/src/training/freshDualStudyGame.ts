import {
    ApiEvent,
    Bot,
    CreateOfflineOpts,
    GameApi,
    cdapi,
} from "@chronodivide/game-api";
import fs from "node:fs";
import {
    withSeededOfflineGame,
} from "../benchmark/seededOfflineGame.js";
import {
    BuildingLedgerRow,
    EndpointEngineState,
    EndpointEvent,
    EndpointSide,
    LiteralBuildingEliminationAdjudicator,
    LiteralEndpointCombatants,
    snapshotCombatantBuildings,
} from "./literalBuildingEliminationEndpoint.js";
import {
    snapshotLiveOwnedBuildingsCandidate,
} from "./liveOwnedBuildingSnapshotCandidate.js";
import {
    PassiveDualBuildingEndpoint,
    PassiveDualEndpointState,
} from "./passiveDualBuildingEndpoint.js";
import {
    FreshDualEndpointLedgerWriter,
    FreshDualLedgerMetadata,
    FreshDualSnapshots,
    normalizeFreshDualEvents,
} from "./freshDualEndpointLedger.js";
import {
    PublicActionAudit,
    PublicActionAuditSummary,
    PublicWorldTrajectory,
    installFreshDualStudyInstrumentation,
    snapshotFreshDualPublicWorld,
} from "./freshDualStudyInstrumentation.js";
import {
    FreshDualCanaryTraceContext,
    FreshDualCanaryTraceMetadata,
    FreshDualCanaryTraceWriter,
} from "./freshDualCanaryTrace.js";

export type FreshDualInspectableBot = Bot & {
    lastGameApi: GameApi | null;
    lastPlayerActions: any;
    lastPlayerProduction: any;
};
export type FreshDualGameSpec = {
    mapName: string;
    gameMode: number;
    country: string;
    candidateSlot: 0 | 1;
    candidateStartOrdinal: number;
    opponentStartOrdinal: number;
    requestedEngineSeed: number;
    maxUpdates: number;
};
export type FreshDualCanaryMode = "v5_reference" | "dual";
export type FreshDualCanaryResult = {
    kind: "fresh-dual-noninterference-canary-cell-v1";
    complete: true;
    technicalPass: true;
    mode: FreshDualCanaryMode;
    updates: 6000;
    initialTick: 0;
    finalTick: 6000;
    worldTrajectory: { sha256: string; snapshots: 6001 };
    actionAudit: PublicActionAuditSummary;
    quitSuppression: PublicActionAudit["quit"];
    requestedEngineSeed: number;
    observedStarts: { candidate: string; opponent: string };
    compressedTrace?: FreshDualCanaryTraceMetadata;
};
export type FreshDualCompetitiveResult = {
    kind: "fresh-dual-competitive-cell-v1";
    complete: true;
    technicalPass: boolean;
    updates: number;
    stopReason: "dual_complete" | "technical_failure" | "tick_cap";
    dualState: PassiveDualEndpointState;
    actionAudit: PublicActionAuditSummary;
    quitSuppression: PublicActionAudit["quit"];
    requestedEngineSeed: number;
    observedStarts: { candidate: string; opponent: string };
    ledger: FreshDualLedgerMetadata;
};

const startKey = (value: { x: number; y: number }): string => `${value.x},${value.y}`;
const snapshots = (game: GameApi, combatants: LiteralEndpointCombatants): FreshDualSnapshots => ({
    legacy: snapshotCombatantBuildings(game, combatants),
    live: snapshotLiveOwnedBuildingsCandidate(game, combatants),
});
const engineState = (game: GameApi, combatants: LiteralEndpointCombatants, finished: boolean): EndpointEngineState => ({
    finished,
    defeated: {
        candidate: game.isPlayerDefeated(combatants.candidate),
        baseline: game.isPlayerDefeated(combatants.baseline),
    },
});
const settings = (
    spec: FreshDualGameSpec,
    candidate: FreshDualInspectableBot,
    opponent: FreshDualInspectableBot,
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
    credits: 10000,
    unitCount: 0,
    buildOffAlly: false,
    multiEngineer: false,
});
const setStart = (bot: FreshDualInspectableBot, ordinal: number): void => {
    (bot as unknown as { chronoResearchStartPos: number }).chronoResearchStartPos = ordinal;
};
const assertStarts = (
    game: GameApi,
    combatants: LiteralEndpointCombatants,
    expected: { candidate: string; opponent: string },
): { candidate: string; opponent: string } => {
    const observed = {
        candidate: startKey(game.getPlayerData(combatants.candidate).startLocation),
        opponent: startKey(game.getPlayerData(combatants.baseline).startLocation),
    };
    if (observed.candidate !== expected.candidate || observed.opponent !== expected.opponent) {
        throw new Error("Fresh dual selected start drifted");
    }
    return observed;
};
const assertInspectableApis = (bots: Record<EndpointSide, FreshDualInspectableBot>): void => {
    for (const side of ["candidate", "baseline"] as const) {
        if (!bots[side].lastGameApi || !bots[side].lastPlayerActions || !bots[side].lastPlayerProduction) {
            throw new Error(`Missing inspectable APIs for ${side}`);
        }
    }
};
const assertNoForwardedQuit = (audit: PublicActionAudit): void => {
    if (audit.quit.forwarded.candidate !== 0 || audit.quit.forwarded.baseline !== 0) {
        throw new Error("Fresh dual instrumentation forwarded a resignation");
    }
};

export const runFreshDualCanary = async (args: {
    spec: FreshDualGameSpec;
    candidate: FreshDualInspectableBot;
    opponent: FreshDualInspectableBot;
    expectedStarts: { candidate: string; opponent: string };
    mode: FreshDualCanaryMode;
    traceFile?: string;
    traceContext?: FreshDualCanaryTraceContext;
}): Promise<FreshDualCanaryResult> => {
    if (args.spec.maxUpdates !== 6000) throw new Error("Canary horizon must be exactly 6000 updates");
    if ((args.traceFile === undefined) !== (args.traceContext === undefined)) {
        throw new Error("Canary trace file and context must be provided together");
    }
    const combatants = { candidate: args.candidate.name, baseline: args.opponent.name };
    const bots = { candidate: args.candidate, baseline: args.opponent };
    setStart(args.candidate, args.spec.candidateStartOrdinal);
    setStart(args.opponent, args.spec.opponentStartOrdinal);
    const actionAudit = new PublicActionAudit();
    const legacy = args.mode === "v5_reference"
        ? new LiteralBuildingEliminationAdjudicator(combatants)
        : null;
    const dual = args.mode === "dual"
        ? new PassiveDualBuildingEndpoint(combatants, args.spec.maxUpdates)
        : null;
    let recording = false;
    const observer = {
        observe(event: ApiEvent): void {
            if (!recording) return;
            if (legacy) legacy.observe(event);
            if (dual) dual.observe(event);
        },
    };
    installFreshDualStudyInstrumentation(bots, observer, actionAudit);
    return withSeededOfflineGame(
        cdapi,
        settings(args.spec, args.candidate, args.opponent),
        args.spec.requestedEngineSeed,
        [
            { agent: args.candidate, identity: "candidate" },
            { agent: args.opponent, identity: "opponent" },
        ],
        async (instance) => {
            assertInspectableApis(bots);
            const game = args.candidate.lastGameApi as GameApi;
            const observedStarts = assertStarts(game, combatants, args.expectedStarts);
            if (instance.isFinished() || game.getCurrentTick() !== 0) {
                throw new Error("Canary did not begin in a live tick-zero state");
            }
            const trace = args.traceFile && args.traceContext
                ? await FreshDualCanaryTraceWriter.create(args.traceFile, args.traceContext)
                : null;
            try {
                const trajectory = new PublicWorldTrajectory();
                const initialSnapshot = snapshotFreshDualPublicWorld(game, bots);
                trajectory.observe(initialSnapshot);
                if (trace) await trace.observe(0, initialSnapshot);
            let active = true;
            for (let update = 1; update <= args.spec.maxUpdates; update += 1) {
                if (instance.isFinished()) throw new Error("Canary ended before its frozen horizon");
                if (active) {
                    if (legacy) legacy.beginUpdate(game);
                    if (dual) dual.beginUpdate(game);
                }
                recording = active;
                await instance.update();
                recording = false;
                if (game.getCurrentTick() !== update) throw new Error("Canary game tick drifted");
                if (active) {
                    const engine = engineState(game, combatants, instance.isFinished());
                    if (legacy) {
                        const value = legacy.completeUpdate(game, engine);
                        if (value.technicalFailure) throw new Error("Canary v5 observer failed technically");
                        if (value.terminal) active = false;
                    }
                    if (dual) {
                        const value = dual.completeUpdate(game, engine);
                        if (value.failed) throw new Error("Canary dual observer failed technically");
                        if (value.complete) active = false;
                    }
                }
                if (instance.isFinished()) throw new Error("Canary ended before its frozen horizon");
                const snapshot = snapshotFreshDualPublicWorld(game, bots);
                trajectory.observe(snapshot);
                if (trace) await trace.observe(update, snapshot);
            }
            assertNoForwardedQuit(actionAudit);
            const worldTrajectory = trajectory.finish() as { sha256: string; snapshots: 6001 };
            if (worldTrajectory.snapshots !== 6001) throw new Error("Canary snapshot count drifted");
            const actions = actionAudit.finish();
            const quitSuppression = structuredClone(actionAudit.quit);
            const compressedTrace = trace ? await trace.finish({
                updates: 6000,
                observations: 6001,
                worldTrajectory,
                actionAudit: actions,
                quitSuppression,
            }) : undefined;
            return {
                kind: "fresh-dual-noninterference-canary-cell-v1",
                complete: true,
                technicalPass: true,
                mode: args.mode,
                updates: 6000,
                initialTick: 0,
                finalTick: game.getCurrentTick() as 6000,
                worldTrajectory,
                actionAudit: actions,
                quitSuppression,
                requestedEngineSeed: args.spec.requestedEngineSeed,
                observedStarts,
                ...(compressedTrace ? { compressedTrace } : {}),
            };
            } catch (error) {
                recording = false;
                if (trace) {
                    try {
                        await trace.abort(error);
                    } catch {
                        // The exclusive partial stream remains preserved evidence.
                    }
                }
                throw error;
            }
        },
    );
};

export const runFreshDualCompetitiveGame = async (args: {
    spec: FreshDualGameSpec;
    candidate: FreshDualInspectableBot;
    opponent: FreshDualInspectableBot;
    expectedStarts: { candidate: string; opponent: string };
    ledgerFile: string;
}): Promise<FreshDualCompetitiveResult> => {
    if (args.spec.maxUpdates !== 90_000) throw new Error("Competitive horizon must be exactly 90000 updates");
    if (fs.existsSync(args.ledgerFile)) throw new Error("Competitive ledger path already exists");
    const combatants = { candidate: args.candidate.name, baseline: args.opponent.name };
    const bots = { candidate: args.candidate, baseline: args.opponent };
    setStart(args.candidate, args.spec.candidateStartOrdinal);
    setStart(args.opponent, args.spec.opponentStartOrdinal);
    const endpoint = new PassiveDualBuildingEndpoint(combatants, args.spec.maxUpdates);
    const actionAudit = new PublicActionAudit();
    let recording = false;
    let events: ApiEvent[] = [];
    installFreshDualStudyInstrumentation(bots, {
        observe(event: ApiEvent): void {
            if (!recording) return;
            endpoint.observe(event);
            events.push(event);
        },
    }, actionAudit);
    return withSeededOfflineGame(
        cdapi,
        settings(args.spec, args.candidate, args.opponent),
        args.spec.requestedEngineSeed,
        [
            { agent: args.candidate, identity: "candidate" },
            { agent: args.opponent, identity: "opponent" },
        ],
        async (instance) => {
            assertInspectableApis(bots);
            const game = args.candidate.lastGameApi as GameApi;
            const observedStarts = assertStarts(game, combatants, args.expectedStarts);
            if (instance.isFinished() || game.getCurrentTick() !== 0) {
                throw new Error("Competitive game did not begin in a live tick-zero state");
            }
            let state = endpoint.getState();
            const writer = await FreshDualEndpointLedgerWriter.create(
                args.ledgerFile,
                combatants,
                args.spec.maxUpdates,
                0,
                snapshots(game, combatants),
                engineState(game, combatants, false),
                state,
            );
            let updates = 0;
            let stopReason: FreshDualCompetitiveResult["stopReason"] | null = null;
            let metadata: FreshDualLedgerMetadata | null = null;
            try {
                while (updates < args.spec.maxUpdates && !state.complete && !state.failed) {
                    const pre = snapshots(game, combatants);
                    events = [];
                    endpoint.beginUpdate(game);
                    recording = true;
                    await instance.update();
                    recording = false;
                    updates += 1;
                    if (game.getCurrentTick() !== updates) throw new Error("Competitive game tick drifted");
                    const engine = engineState(game, combatants, instance.isFinished());
                    state = endpoint.completeUpdate(game, engine);
                    const post = snapshots(game, combatants);
                    const normalizedEvents: EndpointEvent[] = normalizeFreshDualEvents(events);
                    await writer.appendUpdate({
                        tick: updates,
                        pre,
                        post,
                        events: normalizedEvents,
                        engine,
                        dualState: state,
                    });
                }
                if (state.failed) {
                    stopReason = "technical_failure";
                } else if (state.complete) {
                    stopReason = "dual_complete";
                } else {
                    if (updates !== args.spec.maxUpdates || game.getCurrentTick() !== args.spec.maxUpdates) {
                        throw new Error("Competitive cap boundary drifted");
                    }
                    state = endpoint.capAt(game.getCurrentTick());
                    stopReason = "tick_cap";
                }
                assertNoForwardedQuit(actionAudit);
                const actions = actionAudit.finish();
                metadata = await writer.finish({
                    stopReason,
                    updates,
                    dualState: state,
                    actionAudit: actions,
                    quitSuppression: structuredClone(actionAudit.quit),
                });
                return {
                    kind: "fresh-dual-competitive-cell-v1",
                    complete: true,
                    technicalPass: !state.failed,
                    updates,
                    stopReason,
                    dualState: state,
                    actionAudit: actions,
                    quitSuppression: structuredClone(actionAudit.quit),
                    requestedEngineSeed: args.spec.requestedEngineSeed,
                    observedStarts,
                    ledger: metadata,
                };
            } catch (error) {
                recording = false;
                if (!metadata) {
                    try {
                        await writer.abort(error);
                    } catch {
                        // Preserve the original error; the partial exclusive ledger remains evidence.
                    }
                }
                throw error;
            }
        },
    );
};
