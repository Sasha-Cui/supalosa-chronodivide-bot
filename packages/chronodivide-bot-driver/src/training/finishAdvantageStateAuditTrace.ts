import { createHash } from "node:crypto";
import {
    CreateOfflineOpts,
    GameApi,
    QueueType,
    UnitData,
    cdapi,
} from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { BaselineFactory, InspectableBaselineBot } from "../benchmark/baselineLoader.js";
import { withSeededOfflineGame } from "../benchmark/seededOfflineGame.js";
import {
    LiteralBuildingEliminationAdjudicator,
    installLiteralEndpointInstrumentation,
} from "./literalBuildingEliminationEndpoint.js";
import {
    FinishAdvantageStateRecord,
    createFinishAdvantageObservedBaseline,
} from "./finishAdvantageStateObserver.js";

export const FINISH_ADVANTAGE_STATE_AUDIT_MAX_TICKS = 24_000 as const;

type ActionTraceRow = { tick: number; args: unknown[] };
type StateSnapshot = {
    tick: number;
    credits: number;
    units: Array<{ id: number; name: string; x: number; y: number; hitPoints: number }>;
    queues: Array<{ queue: number; payload: unknown }>;
};

export type FinishAdvantageStateAuditTrace = {
    observed: boolean;
    requestedEngineSeed: number;
    observedTicks: number;
    engineFinishObservedAtTick: number | null;
    candidateActionCount: number;
    candidateActionTraceSha256: string;
    fixedSnapshotCount: number;
    fixedSnapshotSha256: string;
    suppressedQuitAttempts: { candidate: number; baseline: number };
    dispositionHistorySha256: string;
    dispositionCount: number;
    terminalTechnicalStatusSha256: string;
    stateRecords: FinishAdvantageStateRecord[];
};

export type FinishAdvantageStateAuditTraceArgs = {
    factory: BaselineFactory;
    mapName: string;
    country: Countries;
    candidateSlot: 0 | 1;
    requestedEngineSeed: number;
    observed: boolean;
    maxTicks?: number;
};

const digest = (value: unknown): string => createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");

const snapshot = (bot: InspectableBaselineBot, tick: number): StateSnapshot => {
    if (!bot.lastGameApi || !bot.lastPlayerProduction) throw new Error(`Missing candidate state at tick ${tick}`);
    const game = bot.lastGameApi;
    return {
        tick,
        credits: game.getPlayerData(bot.name).credits,
        units: game.getVisibleUnits(bot.name, "self")
            .map((id) => game.getUnitData(id))
            .filter((unit): unit is UnitData => !!unit)
            .map((unit) => ({
                id: unit.id,
                name: unit.rules.name,
                x: unit.tile.rx,
                y: unit.tile.ry,
                hitPoints: unit.hitPoints,
            }))
            .sort((left, right) => left.id - right.id),
        queues: [
            QueueType.Structures,
            QueueType.Armory,
            QueueType.Infantry,
            QueueType.Vehicles,
            QueueType.Aircrafts,
        ].map((queue) => ({ queue, payload: bot.lastPlayerProduction?.getQueueData(queue) })),
    };
};

const installActionTrace = (bot: InspectableBaselineBot, trace: ActionTraceRow[]): void => {
    const originalStart = bot.onGameStart.bind(bot);
    bot.onGameStart = (game: GameApi): void => {
        originalStart(game);
        const actions = bot.lastPlayerActions;
        if (!actions) throw new Error(`Missing actions for ${bot.name}`);
        const originalOrderUnits = actions.orderUnits.bind(actions);
        Object.defineProperty(actions, "orderUnits", {
            configurable: true,
            writable: true,
            value: (...args: unknown[]): unknown => {
                trace.push({ tick: game.getCurrentTick(), args: structuredClone(args) });
                return (originalOrderUnits as (...values: unknown[]) => unknown)(...args);
            },
        });
    };
};

const settings = (
    mapName: string,
    candidate: InspectableBaselineBot,
    baseline: InspectableBaselineBot,
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

export const runFinishAdvantageStateAuditTrace = async (
    args: FinishAdvantageStateAuditTraceArgs,
): Promise<FinishAdvantageStateAuditTrace> => {
    const maxTicks = args.maxTicks ?? FINISH_ADVANTAGE_STATE_AUDIT_MAX_TICKS;
    if (!Number.isSafeInteger(maxTicks) || maxTicks < 1 || maxTicks > FINISH_ADVANTAGE_STATE_AUDIT_MAX_TICKS) {
        throw new Error("Finish-advantage state audit maxTicks must be an integer in [1, 24000]");
    }
    if (
        !Number.isSafeInteger(args.requestedEngineSeed) || args.requestedEngineSeed < 0 ||
        args.requestedEngineSeed > 0xffff_ffff
    ) throw new Error("Finish-advantage requestedEngineSeed must be uint32");

    const candidateName = `FinishAuditCandidate_${args.country}_${args.candidateSlot}`;
    const baselineName = `FinishAuditBaseline_${args.country}_${args.candidateSlot}`;
    const stateRecords: FinishAdvantageStateRecord[] = [];
    const candidate = args.observed
        ? createFinishAdvantageObservedBaseline(
            args.factory,
            candidateName,
            args.country,
            args.candidateSlot,
            (record) => stateRecords.push(record),
        )
        : args.factory.create(candidateName, args.country);
    const baseline = args.factory.create(baselineName, args.country);
    const adjudicator = new LiteralBuildingEliminationAdjudicator({
        candidate: candidateName,
        baseline: baselineName,
    });
    const { audit: quitSuppression } = installLiteralEndpointInstrumentation(
        { candidate, baseline },
        adjudicator,
    );
    const candidateActions: ActionTraceRow[] = [];
    installActionTrace(candidate, candidateActions);
    installActionTrace(baseline, []);
    const snapshots: StateSnapshot[] = [];

    return withSeededOfflineGame(
        cdapi,
        settings(args.mapName, candidate, baseline, args.candidateSlot),
        args.requestedEngineSeed,
        [{ agent: candidate, identity: "candidate" }, { agent: baseline, identity: "baseline" }],
        async (game) => {
            if (!candidate.lastGameApi) throw new Error("Candidate GameApi was not installed");
            let observedTicks = 0;
            let engineFinishObservedAtTick: number | null = null;
            let defeatedCombatantCount = 0;
            for (let tick = 1; tick <= maxTicks; tick += 1) {
                if (game.isFinished()) {
                    engineFinishObservedAtTick = tick - 1;
                    break;
                }
                adjudicator.beginUpdate(candidate.lastGameApi);
                await game.update();
                observedTicks = tick;
                const stats = game.getPlayerStats();
                const candidateStats = stats.find(({ name }) => name === candidateName);
                const baselineStats = stats.find(({ name }) => name === baselineName);
                if (!candidateStats || !baselineStats) throw new Error("Missing public player statistics");
                defeatedCombatantCount = Number(candidateStats.defeated) + Number(baselineStats.defeated);
                adjudicator.completeUpdate(candidate.lastGameApi, {
                    finished: game.isFinished(),
                    defeated: {
                        candidate: candidateStats.defeated,
                        baseline: baselineStats.defeated,
                    },
                });
                if (tick % 300 === 0) snapshots.push(snapshot(candidate, tick));
                if (game.isFinished()) {
                    engineFinishObservedAtTick = tick;
                    break;
                }
            }
            if (quitSuppression.forwarded.candidate !== 0 || quitSuppression.forwarded.baseline !== 0) {
                throw new Error("A suppressed resignation was forwarded");
            }
            const dispositions = adjudicator.getDispositionHistory();
            const established = adjudicator.getEstablished();
            const terminalTechnicalStatus = {
                observedTicks,
                engineFinished: game.isFinished(),
                engineFinishObservedAtTick,
                defeatedCombatantCount,
                literalEndpointEstablishedCount: Number(established.candidate) + Number(established.baseline),
                dispositionCount: dispositions.length,
            };
            return {
                observed: args.observed,
                requestedEngineSeed: args.requestedEngineSeed,
                observedTicks,
                engineFinishObservedAtTick,
                candidateActionCount: candidateActions.length,
                candidateActionTraceSha256: digest(candidateActions),
                fixedSnapshotCount: snapshots.length,
                fixedSnapshotSha256: digest(snapshots),
                suppressedQuitAttempts: { ...quitSuppression.attempts },
                dispositionHistorySha256: digest(dispositions),
                dispositionCount: dispositions.length,
                terminalTechnicalStatusSha256: digest(terminalTechnicalStatus),
                stateRecords,
            };
        },
    );
};
