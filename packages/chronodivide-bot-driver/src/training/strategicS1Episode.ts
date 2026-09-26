import { ApiEvent, CreateOfflineOpts, GameApi } from "@chronodivide/game-api";
import { createHash } from "node:crypto";
import { withSeededOfflineGame } from "../benchmark/seededOfflineGame.js";
import { EndpointEngineState, snapshotCombatantBuildings } from "./literalBuildingEliminationEndpoint.js";
import { snapshotLiveOwnedBuildingsCandidate } from "./liveOwnedBuildingSnapshotCandidate.js";
import { PassiveDualBuildingEndpoint } from "./passiveDualBuildingEndpoint.js";
import { FreshDualLedgerFinal, normalizeFreshDualEvents } from "./freshDualEndpointLedger.js";
import { EmbeddedFreshDualLedgerWriter, verifyEmbeddedFreshDualLedger } from "./embeddedFreshDualLedger.js";
import {
    installFreshDualStudyInstrumentation,
    PublicActionAudit,
    PublicWorldTrajectory,
    snapshotFreshDualPublicWorld,
} from "./freshDualStudyInstrumentation.js";
import { UnifiedIntentV2InspectableBot, UnifiedIntentV2TechnicalSpec } from "./unifiedIntentV2TechnicalEpisode.js";
import { S1ActionWindows, S1Sampler, S1Sample, S1MissionRead } from "./strategicS1Observation.js";
import { encodeS1Ledger, replayS1Ledger } from "./strategicS1Ledger.js";
import { S1_POLICY } from "./strategicS1Plan.js";

export type S1EpisodeSpec = Omit<UnifiedIntentV2TechnicalSpec, "maxUpdates"> & {
    caseIndex: number;
    country: "Americans" | "Africans";
    maxUpdates: 3600 | 24000;
};
export type S1EpisodeMode = "diagnostic" | "smoke" | "canary_endpoint_only" | "canary_strategic";
export type S1InspectableCandidate = UnifiedIntentV2InspectableBot & {
    getResearchMissionSnapshot(): S1MissionRead[] | null;
};
export const S1_MAX_ARTIFACT_BYTES = 32 * 1024 * 1024;
export const assertS1ArtifactBytes = (value: unknown): number => {
    const bytes = Buffer.byteLength(JSON.stringify(value) + "\n");
    if (bytes > S1_MAX_ARTIFACT_BYTES) throw new Error("S1 combined artifact byte bound");
    return bytes;
};
const equal = (a: unknown, b: unknown, why: string) => {
    if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error("S1 " + why);
};
const bytesOnly = (ledger: { records: number; gzipBytes: number; plainBytes: number }) => ({
    records: ledger.records,
    gzipBytes: ledger.gzipBytes,
    plainBytes: ledger.plainBytes,
});

/** Passive adapter only. The new source-bound launcher must bind the disabled factory,
 * api_full_state firewall, frozen exact case, prerequisites, assets and launch journal.
 * Runtime replay here is not an independent audit. No observer state enters either policy. */
export async function runStrategicS1Episode(args: {
    api: { createGame(options: CreateOfflineOpts): Promise<any> };
    spec: S1EpisodeSpec;
    mode: S1EpisodeMode;
    candidate: S1InspectableCandidate;
    opponent: UnifiedIntentV2InspectableBot;
}) {
    const { spec, mode } = args;
    const canary = mode === "canary_endpoint_only" || mode === "canary_strategic";
    const observed = mode !== "canary_endpoint_only";
    const seed =
        spec.caseIndex < 200
            ? 3350120000 + spec.caseIndex
            : spec.caseIndex < 204
            ? 3350121000 + spec.caseIndex - 200
            : 3350121100;
    if (
        !["diagnostic", "smoke", "canary_endpoint_only", "canary_strategic"].includes(mode) ||
        !Number.isSafeInteger(spec.caseIndex) ||
        spec.caseIndex < 0 ||
        spec.caseIndex > 204 ||
        (canary
            ? spec.caseIndex < 200 || spec.caseIndex > 203
            : mode === "smoke"
            ? spec.caseIndex !== 204
            : spec.caseIndex >= 200) ||
        spec.requestedEngineSeed !== seed ||
        spec.maxUpdates !== (canary ? 3600 : 24000) ||
        spec.gameMode !== 1 ||
        !["Americans", "Africans"].includes(spec.country) ||
        typeof spec.mapName !== "string" ||
        !spec.mapName.length ||
        ![0, 1].includes(spec.candidateSlot) ||
        ![0, 1].includes(spec.candidateStartOrdinal) ||
        spec.opponentStartOrdinal !== 1 - spec.candidateStartOrdinal ||
        args.candidate.name !== "OD1Candidate" ||
        args.opponent.name !== "OD1Opponent" ||
        typeof args.candidate.getResearchMissionSnapshot !== "function" ||
        (args.candidate.lastUnifiedIntentTelemetry ?? null) !== null
    ) {
        throw new Error("S1 episode identity drifted");
    }
    const names = { candidate: "OD1Candidate", baseline: "OD1Opponent" };
    const bots = { candidate: args.candidate, baseline: args.opponent };
    for (const [bot, ordinal] of [
        [args.candidate, spec.candidateStartOrdinal],
        [args.opponent, spec.opponentStartOrdinal],
    ] as const) {
        (bot as unknown as { chronoResearchStartPos: number }).chronoResearchStartPos = ordinal;
    }
    const endpoint = new PassiveDualBuildingEndpoint(names, spec.maxUpdates);
    const actionAudit = new PublicActionAudit();
    const windows = observed ? new S1ActionWindows(names) : null;
    const sampler = observed ? new S1Sampler(names) : null;
    const samples: S1Sample[] = [];
    let publicGame: GameApi | null = null;
    let recording = false;
    let events: ApiEvent[] = [];
    const restorers: Array<() => void> = [];
    for (const side of ["candidate", "baseline"] as const) {
        const bot = bots[side];
        // Restore only these research callback wrappers after the seeded lifecycle finishes.
        for (const key of ["onGameStart", "onGameEvent"] as const) {
            const descriptor = Object.getOwnPropertyDescriptor(bot, key);
            restorers.push(() => {
                if (descriptor) Object.defineProperty(bot, key, descriptor);
                else delete (bot as any)[key];
            });
        }
        const originalStart = bot.onGameStart;
        bot.onGameStart = function (game: GameApi): void {
            publicGame = game;
            const actions = (this as unknown as { player: { actions: any } }).player.actions;
            // The outer historical wrapper installs PublicActionAudit before entering here;
            // this wrapper then sees startup actions before forwarding to the original policy.
            windows?.install(side, actions, game);
            return Reflect.apply(originalStart, this, [game]);
        };
    }
    try {
        installFreshDualStudyInstrumentation(
            bots,
            {
                observe(event): void {
                    if (windows) {
                        const normalized = normalizeFreshDualEvents([event]);
                        if (normalized.length && !publicGame) throw new Error("S1 event before public API");
                        for (const value of normalized) windows.observeEvent(publicGame!.getCurrentTick(), value);
                    }
                    if (recording) {
                        endpoint.observe(event);
                        if (!canary) events.push(event);
                    }
                },
            },
            actionAudit,
        );
        return await withSeededOfflineGame(
            args.api,
            {
                online: false,
                agents: spec.candidateSlot === 0 ? [args.candidate, args.opponent] : [args.opponent, args.candidate],
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
            },
            spec.requestedEngineSeed,
            [
                { agent: args.candidate, identity: "candidate" },
                { agent: args.opponent, identity: "opponent" },
            ],
            async (instance) => {
                let writer: EmbeddedFreshDualLedgerWriter | null = null;
                try {
                    const game = args.candidate.lastGameApi;
                    if (
                        !game ||
                        !args.opponent.lastGameApi ||
                        !args.candidate.lastPlayerActions ||
                        !args.opponent.lastPlayerActions ||
                        !args.candidate.lastPlayerProduction ||
                        !args.opponent.lastPlayerProduction ||
                        game.getCurrentTick() !== 0 ||
                        instance.isFinished()
                    ) {
                        throw new Error("S1 episode did not initialize cleanly");
                    }
                    const location = (name: string) => {
                        const p = game.getPlayerData(name);
                        if (p.country?.name !== spec.country) throw new Error("S1 effective country drifted");
                        return p.startLocation.x + "," + p.startLocation.y;
                    };
                    const observedStarts = { candidate: location(names.candidate), opponent: location(names.baseline) };
                    equal(
                        observedStarts,
                        { candidate: spec.candidateStart, opponent: spec.opponentStart },
                        "start drifted",
                    );
                    const engine = (): EndpointEngineState => ({
                        finished: instance.isFinished(),
                        defeated: {
                            candidate: game.isPlayerDefeated(names.candidate),
                            baseline: game.isPlayerDefeated(names.baseline),
                        },
                    });
                    const snapshots = () => ({
                        legacy: snapshotCombatantBuildings(game, names),
                        live: snapshotLiveOwnedBuildingsCandidate(game, names),
                    });
                    const capture = () => {
                        if (sampler && windows)
                            samples.push(
                                sampler.capture(
                                    game,
                                    {
                                        candidate: args.candidate.lastPlayerProduction!,
                                        baseline: args.opponent.lastPlayerProduction!,
                                    },
                                    () => args.candidate.getResearchMissionSnapshot(),
                                    windows.take(game.getCurrentTick()),
                                ),
                            );
                    };
                    const trajectory = new PublicWorldTrajectory();
                    trajectory.observe(snapshotFreshDualPublicWorld(game, bots));
                    const endpointTrace = new PublicWorldTrajectory();
                    const trace = () =>
                        endpointTrace.observe({
                            tick: game.getCurrentTick(),
                            state: endpoint.getState(),
                            snapshots: snapshots(),
                            engine: engine(),
                        });
                    if (canary) trace();
                    capture();
                    if (!canary)
                        writer = await EmbeddedFreshDualLedgerWriter.create(
                            names,
                            spec.maxUpdates,
                            snapshots(),
                            engine(),
                            endpoint.getState(),
                        );
                    let updates = 0,
                        lastSnapshot = 0,
                        active = true;
                    while (updates < spec.maxUpdates && (canary || active)) {
                        if (instance.isFinished()) throw new Error("S1 unexpected engine finish");
                        const pre = writer ? snapshots() : null;
                        events = [];
                        if (active) endpoint.beginUpdate(game);
                        recording = active;
                        try {
                            await instance.update();
                        } finally {
                            recording = false;
                        }
                        updates++;
                        if (game.getCurrentTick() !== updates) throw new Error("S1 clock drifted");
                        if ((args.candidate.lastUnifiedIntentTelemetry ?? null) !== null) {
                            throw new Error("S1 unchanged policy emitted arbiter telemetry");
                        }
                        if (active) {
                            const state = endpoint.completeUpdate(game, engine());
                            if (state.failed) throw new Error("S1 dual observer technical failure");
                            active = !state.complete;
                            if (writer && pre)
                                await writer.appendUpdate({
                                    tick: updates,
                                    pre,
                                    post: snapshots(),
                                    events: normalizeFreshDualEvents(events),
                                    engine: engine(),
                                    dualState: state,
                                });
                        }
                        if (canary && instance.isFinished()) throw new Error("S1 canary ended before frozen horizon");
                        if (updates % 300 === 0) capture();
                        if (canary) trace();
                        if (canary || updates % 6000 === 0 || !active) {
                            trajectory.observe(snapshotFreshDualPublicWorld(game, bots));
                            lastSnapshot = updates;
                        }
                    }
                    if (observed && samples[samples.length - 1]?.tick !== updates) capture();
                    if (lastSnapshot !== updates) trajectory.observe(snapshotFreshDualPublicWorld(game, bots));
                    if (actionAudit.quit.forwarded.candidate || actionAudit.quit.forwarded.baseline) {
                        throw new Error("S1 forwarded resignation");
                    }
                    const actions = actionAudit.finish();
                    windows?.finish(actions.bySideAndMethod);
                    const publicCall = { sha256: actions.sha256, bySideAndMethod: actions.bySideAndMethod };
                    const quitSuppression = structuredClone(actionAudit.quit);
                    const publicState = trajectory.finish();
                    const encoded = observed
                        ? encodeS1Ledger(
                              samples,
                              {
                                  caseIndex: spec.caseIndex,
                                  requestedEngineSeed: spec.requestedEngineSeed,
                                  maxUpdates: spec.maxUpdates,
                              },
                              updates,
                              publicCall,
                          )
                        : null;
                    if (encoded) {
                        const replay = replayS1Ledger(encoded.ledger);
                        equal(replay.samples, samples, "strategic sample replay failed");
                        equal(replay.analysis, encoded.analysis, "strategic analysis replay failed");
                        equal(replay.final.publicCalls, publicCall, "strategic action binding failed");
                    }
                    if (canary) {
                        const dualTrace = endpointTrace.finish();
                        if (
                            updates !== 3600 ||
                            publicState.snapshots !== 3601 ||
                            dualTrace.snapshots !== 3601 ||
                            (observed && samples.length !== 13)
                        )
                            throw new Error("S1 canary horizon/sample grid drifted");
                        return {
                            kind: "strategic-s1-canary-v1" as const,
                            mode,
                            complete: true as const,
                            technicalPass: true as const,
                            caseIndex: spec.caseIndex,
                            requestedEngineSeed: spec.requestedEngineSeed,
                            policy: S1_POLICY,
                            updates,
                            observedStarts,
                            quitSuppression,
                            publicCall,
                            publicState,
                            dualTrace,
                            strategic: encoded
                                ? {
                                      samples: samples.length,
                                      schemaVerified: true,
                                      replayPass: true,
                                      windowConservation: true,
                                      payloadDiscarded: true,
                                      ...bytesOnly(encoded.ledger),
                                  }
                                : null,
                        };
                    }
                    if (!writer || !encoded) throw new Error("S1 retained ledger absent");
                    let state = endpoint.getState();
                    const stopReason = state.complete ? ("dual_complete" as const) : ("tick_cap" as const);
                    if (!state.complete) state = endpoint.capAt(updates);
                    const final: FreshDualLedgerFinal = {
                        stopReason,
                        updates,
                        dualState: state,
                        actionAudit: actions,
                        quitSuppression,
                    };
                    const ledger = await writer.finish(final);
                    const replay = await verifyEmbeddedFreshDualLedger(ledger);
                    if (!replay.complete || replay.aborted) throw new Error("S1 endpoint replay incomplete");
                    equal(replay.final, final, "endpoint replay differs");
                    const result = {
                        kind: "strategic-s1-diagnostic-v1" as const,
                        complete: true as const,
                        technicalPass: true as const,
                        policy: S1_POLICY,
                        caseIndex: spec.caseIndex,
                        requestedEngineSeed: spec.requestedEngineSeed,
                        updates,
                        observedStarts,
                        quitSuppression,
                        publicCall,
                        publicState,
                        stopReason,
                        dualState: state,
                        actionAudit: actions,
                        ledger,
                        strategicLedger: encoded.ledger,
                        strategicAnalysisSha256: createHash("sha256")
                            .update(JSON.stringify(encoded.analysis))
                            .digest("hex"),
                    };
                    const combinedBytes = assertS1ArtifactBytes(result);
                    if (mode === "smoke")
                        return {
                            kind: "strategic-s1-smoke-technical-v1" as const,
                            complete: true as const,
                            technicalPass: true as const,
                            caseIndex: spec.caseIndex,
                            requestedEngineSeed: spec.requestedEngineSeed,
                            policy: S1_POLICY,
                            endpointReplayPass: true,
                            strategicReplayPass: true,
                            schemaVerified: true,
                            sampleGridVerified: true,
                            windowConservation: true,
                            payloadDiscarded: true,
                            resignationSuppressed: true,
                            combinedBytes,
                            endpointStorage: bytesOnly(ledger),
                            strategicStorage: bytesOnly(encoded.ledger),
                        };
                    return result;
                } finally {
                    recording = false;
                    windows?.uninstall();
                    writer?.dispose();
                }
            },
        );
    } finally {
        // Also handles createGame or startup failure before the seeded body is entered.
        windows?.uninstall();
        for (const restore of restorers.reverse()) restore();
    }
}
