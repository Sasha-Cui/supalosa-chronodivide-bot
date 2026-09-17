import { ApiEvent, CreateOfflineOpts, GameApi } from "@chronodivide/game-api";
import { withSeededOfflineGame } from "../benchmark/seededOfflineGame.js";
import { LiteralBuildingEliminationAdjudicator, snapshotCombatantBuildings,
    EndpointEngineState } from "./literalBuildingEliminationEndpoint.js";
import { snapshotLiveOwnedBuildingsCandidate } from "./liveOwnedBuildingSnapshotCandidate.js";
import { PassiveDualBuildingEndpoint } from "./passiveDualBuildingEndpoint.js";
import { normalizeFreshDualEvents, FreshDualLedgerFinal } from "./freshDualEndpointLedger.js";
import { EmbeddedFreshDualLedgerWriter, verifyEmbeddedFreshDualLedger } from "./embeddedFreshDualLedger.js";
import { PublicActionAudit, PublicWorldTrajectory, snapshotFreshDualPublicWorld,
    installFreshDualStudyInstrumentation } from "./freshDualStudyInstrumentation.js";
import { UnifiedIntentV2TelemetryCollector } from "./unifiedIntentV2Telemetry.js";
import { UnifiedIntentV2InspectableBot, UnifiedIntentV2TechnicalSpec } from "./unifiedIntentV2TechnicalEpisode.js";
import { OD1_ARMS, OD1Arm, OD1_CANARY_UPDATES, OD1_MAX_UPDATES } from "./unifiedIntentV2OD1Plan.js";

type Spec = Omit<UnifiedIntentV2TechnicalSpec, "maxUpdates"> & { maxUpdates: 3600 | 24000 };
type Mode = "competitive" | "canary_v5_reference" | "canary_dual";
const ESSENTIAL_METHODS = [
    "placeBuilding", "sellObject", "sellBuilding", "toggleRepairWrench", "toggleAlliance",
    "pauseProduction", "resumeProduction", "queueForProduction", "unqueueFromProduction",
    "activateSuperWeapon", "quitGame",
] as const;

/**
 * Measurement-only adapter. Factories, firewall and source/asset/scheduler checks belong to
 * the sealed launcher. No result or observer state is passed back to either policy.
 */
export const runUnifiedIntentV2OD1Episode = async (args: {
    api: { createGame(options: CreateOfflineOpts): Promise<any> };
    spec: Spec;
    arm: OD1Arm;
    mode: Mode;
    candidate: UnifiedIntentV2InspectableBot;
    opponent: UnifiedIntentV2InspectableBot;
}) => {
    const canary = args.mode !== "competitive";
    const expectedArm = OD1_ARMS.find((arm) => arm.id === args.arm.id);
    if (!expectedArm || JSON.stringify(args.arm) !== JSON.stringify(expectedArm) ||
        !["competitive", "canary_v5_reference", "canary_dual"].includes(args.mode) ||
        args.spec.maxUpdates !== (canary ? OD1_CANARY_UPDATES : OD1_MAX_UPDATES) ||
        ![0, 1].includes(args.spec.candidateSlot) ||
        ![0, 1].includes(args.spec.candidateStartOrdinal) ||
        args.spec.opponentStartOrdinal !== 1 - args.spec.candidateStartOrdinal ||
        args.candidate.name === args.opponent.name) throw new Error("OD1 episode identity drifted");
    const combatants = { candidate: args.candidate.name, baseline: args.opponent.name };
    const bots = { candidate: args.candidate, baseline: args.opponent };
    for (const [bot, ordinal] of [
        [args.candidate, args.spec.candidateStartOrdinal],
        [args.opponent, args.spec.opponentStartOrdinal],
    ] as const) (bot as unknown as { chronoResearchStartPos: number }).chronoResearchStartPos = ordinal;
    const endpoint = args.mode === "canary_v5_reference" ? null :
        new PassiveDualBuildingEndpoint(combatants, args.spec.maxUpdates);
    const legacy = endpoint ? null : new LiteralBuildingEliminationAdjudicator(combatants);
    const actionAudit = new PublicActionAudit();
    const telemetry = args.arm.enabled ? new UnifiedIntentV2TelemetryCollector() : null;
    let recording = false;
    let events: ApiEvent[] = [];
    installFreshDualStudyInstrumentation(bots, {
        observe(event): void {
            if (!recording) return;
            endpoint?.observe(event);
            legacy?.observe(event);
            if (!canary) events.push(event);
        },
    }, actionAudit);
    return withSeededOfflineGame(args.api, {
        online: false,
        agents: args.spec.candidateSlot === 0 ? [args.candidate, args.opponent] : [args.opponent, args.candidate],
        mapName: args.spec.mapName, gameMode: args.spec.gameMode,
        shortGame: false, mcvRepacks: true, cratesAppear: false, superWeapons: false,
        gameSpeed: 6, credits: 10_000, unitCount: 0, buildOffAlly: false, multiEngineer: false,
    }, args.spec.requestedEngineSeed, [
        { agent: args.candidate, identity: "candidate" }, { agent: args.opponent, identity: "opponent" },
    ], async (instance) => {
        const game = args.candidate.lastGameApi;
        if (!game || !args.opponent.lastGameApi || !args.candidate.lastPlayerActions ||
            !args.opponent.lastPlayerActions || !args.candidate.lastPlayerProduction ||
            !args.opponent.lastPlayerProduction || game.getCurrentTick() !== 0 || instance.isFinished()) {
            throw new Error("OD1 episode did not initialize cleanly");
        }
        const location = (name: string) => {
            const value = game.getPlayerData(name).startLocation;
            return value.x + "," + value.y;
        };
        const observedStarts = { candidate: location(combatants.candidate), opponent: location(combatants.baseline) };
        if (observedStarts.candidate !== args.spec.candidateStart ||
            observedStarts.opponent !== args.spec.opponentStart) throw new Error("OD1 start drifted");
        const engine = (): EndpointEngineState => ({
            finished: instance.isFinished(),
            defeated: { candidate: game.isPlayerDefeated(combatants.candidate),
                baseline: game.isPlayerDefeated(combatants.baseline) },
        });
        const snapshots = () => ({
            legacy: snapshotCombatantBuildings(game, combatants),
            live: snapshotLiveOwnedBuildingsCandidate(game, combatants),
        });
        const trajectory = new PublicWorldTrajectory();
        trajectory.observe(snapshotFreshDualPublicWorld(game, bots));
        const writer = !canary && endpoint ? await EmbeddedFreshDualLedgerWriter.create(
            combatants, args.spec.maxUpdates, snapshots(), engine(), endpoint.getState(),
        ) : null;
        let updates = 0;
        let lastSnapshot = 0;
        let active = true;
        try {
            while (updates < args.spec.maxUpdates && (canary || active)) {
                if (instance.isFinished()) throw new Error("OD1 unexpected engine finish");
                const pre = writer ? snapshots() : null;
                events = [];
                if (active) { endpoint?.beginUpdate(game); legacy?.beginUpdate(game); }
                recording = active;
                try { await instance.update(); } finally { recording = false; }
                updates += 1;
                if (game.getCurrentTick() !== updates) throw new Error("OD1 clock drifted");
                const current = args.candidate.lastUnifiedIntentTelemetry ?? null;
                if (telemetry) {
                    if (!current) throw new Error("OD1 enabled telemetry absent");
                    telemetry.observe(current);
                } else if (current !== null) throw new Error("OD1 disabled arm emitted arbiter telemetry");
                if (active) {
                    if (endpoint) {
                        const state = endpoint.completeUpdate(game, engine());
                        if (state.failed) throw new Error("OD1 dual observer technical failure");
                        active = !state.complete;
                        if (writer && pre) await writer.appendUpdate({
                            tick: updates, pre, post: snapshots(), events: normalizeFreshDualEvents(events),
                            engine: engine(), dualState: state,
                        });
                    } else if (legacy) {
                        const state = legacy.completeUpdate(game, engine());
                        if (state.technicalFailure) throw new Error("OD1 reference observer technical failure");
                        active = state.terminal === null;
                    }
                }
                if (canary && instance.isFinished()) throw new Error("OD1 canary ended before frozen horizon");
                if (canary || updates % 6000 === 0 || !active) {
                    trajectory.observe(snapshotFreshDualPublicWorld(game, bots));
                    lastSnapshot = updates;
                }
            }
            if (lastSnapshot !== updates) trajectory.observe(snapshotFreshDualPublicWorld(game, bots));
            if (actionAudit.quit.forwarded.candidate || actionAudit.quit.forwarded.baseline) {
                throw new Error("OD1 forwarded resignation");
            }
            const actions = actionAudit.finish();
            const quit = structuredClone(actionAudit.quit);
            const summary = telemetry?.finish(updates) ?? null;
            const essentialCalls = ESSENTIAL_METHODS.reduce((sum, method) =>
                sum + (actions.bySideAndMethod["candidate." + method] ?? 0), 0);
            if (summary && essentialCalls !== summary.essentialCalls) {
                throw new Error("OD1 essential forwarding audit drifted");
            }
            const publicState = trajectory.finish();
            const common = {
                complete: true as const, technicalPass: true as const, arm: args.arm.id,
                updates, requestedEngineSeed: args.spec.requestedEngineSeed,
                observedStarts, quitSuppression: quit,
                publicCall: { sha256: actions.sha256, bySideAndMethod: actions.bySideAndMethod },
                publicState, telemetry: summary,
            };
            if (canary) {
                if (updates !== 3600 || publicState.snapshots !== 3601) throw new Error("OD1 canary horizon drifted");
                // Explicit projection: never spread full action diagnostics or observer state.
                return { kind: "unified-intent-v2-od1-canary-v1" as const, mode: args.mode,
                    snapshotMode: "every_update" as const, ...common };
            }
            if (!endpoint || !writer) throw new Error("OD1 competitive observer absent");
            let state = endpoint.getState();
            const stopReason = state.complete ? "dual_complete" as const : "tick_cap" as const;
            if (!state.complete) state = endpoint.capAt(updates);
            const final: FreshDualLedgerFinal = {
                stopReason, updates, dualState: state, actionAudit: actions, quitSuppression: quit,
            };
            const ledger = await writer.finish(final);
            const replay = await verifyEmbeddedFreshDualLedger(ledger);
            if (!replay.complete || replay.aborted || JSON.stringify(replay.final) !== JSON.stringify(final)) {
                throw new Error("OD1 episode independent reconstruction failed");
            }
            return { kind: "unified-intent-v2-od1-competitive-v1" as const,
                snapshotMode: "initial_every_6000_final" as const, ...common,
                stopReason, dualState: state, actionAudit: actions, ledger };
        } finally {
            recording = false;
            writer?.dispose();
        }
    });
};
