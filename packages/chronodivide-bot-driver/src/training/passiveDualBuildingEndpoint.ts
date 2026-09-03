import { ApiEvent, GameApi } from "@chronodivide/game-api";
import {
    EndpointEngineState, LiteralBuildingEliminationAdjudicator, LiteralEndpointCapDraw,
    LiteralEndpointCombatants, LiteralEndpointTechnicalFailure, LiteralEndpointTerminal,
    LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION, LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
} from "./literalBuildingEliminationEndpoint.js";
import {
    LiveOwnedBuildingEliminationAdjudicator, LiveOwnedEndpointCap, LiveOwnedEndpointTechnicalFailure,
    LiveOwnedEndpointTerminal, createLiveOwnedCapDraw,
} from "./liveOwnedBuildingEliminationEndpointV6.js";

type Measurement<T, F> = { firstResult: T | null; technicalFailure: F | null };
export type PassiveDualEndpointState = {
    v5: Measurement<LiteralEndpointTerminal | LiteralEndpointCapDraw, LiteralEndpointTechnicalFailure>;
    v6: Measurement<LiveOwnedEndpointTerminal | LiveOwnedEndpointCap, LiveOwnedEndpointTechnicalFailure>;
    complete: boolean;
    failed: boolean;
};

/** Passive observers only: no policy callbacks, action mutation, or simulation advancement. */
export class PassiveDualBuildingEndpoint {
    private readonly legacy: LiteralBuildingEliminationAdjudicator;
    private readonly live: LiveOwnedBuildingEliminationAdjudicator;
    private readonly v5: PassiveDualEndpointState["v5"] = { firstResult: null, technicalFailure: null };
    private readonly v6: PassiveDualEndpointState["v6"] = { firstResult: null, technicalFailure: null };
    private open = false;

    constructor(combatants: LiteralEndpointCombatants, private readonly frozenLimit: number) {
        if (!Number.isSafeInteger(frozenLimit) || frozenLimit <= 0) throw new Error("Positive frozen limit required");
        const names = { candidate: combatants.candidate, baseline: combatants.baseline };
        this.legacy = new LiteralBuildingEliminationAdjudicator({ ...names });
        this.live = new LiveOwnedBuildingEliminationAdjudicator({ ...names });
    }

    private active(value: { firstResult: unknown; technicalFailure: unknown }): boolean {
        return value.firstResult === null && value.technicalFailure === null;
    }

    beginUpdate(game: GameApi): void {
        if (this.open) throw new Error("Dual endpoint update already began");
        if (!this.active(this.v5) && !this.active(this.v6)) throw new Error("Both observers already completed");
        if (this.active(this.v5)) this.legacy.beginUpdate(game);
        if (this.active(this.v6)) this.live.beginUpdate(game);
        this.open = true;
    }

    observe(event: ApiEvent): void {
        // Match legacy initial-event reset behavior; only open update events belong to a step.
        if (!this.open) return;
        if (this.active(this.v5)) this.legacy.observe(event);
        if (this.active(this.v6)) this.live.observe(event);
    }

    completeUpdate(game: GameApi, engine: EndpointEngineState): PassiveDualEndpointState {
        if (!this.open) throw new Error("Dual endpoint update was not begun");
        if (this.active(this.v5)) {
            const r = this.legacy.completeUpdate(game, engine);
            if (r.terminal) this.v5.firstResult = structuredClone(r.terminal);
            if (r.technicalFailure) this.v5.technicalFailure = structuredClone(r.technicalFailure);
        }
        if (this.active(this.v6)) {
            const r = this.live.completeUpdate(game, engine);
            if (r.terminal) this.v6.firstResult = structuredClone(r.terminal);
            if (r.technicalFailure) this.v6.technicalFailure = structuredClone(r.technicalFailure);
        }
        this.open = false;
        return this.getState();
    }

    capAt(tick: number): PassiveDualEndpointState {
        if (this.open) throw new Error("Cannot cap an open update");
        if (!this.active(this.v5) && !this.active(this.v6)) throw new Error("Both observers already completed");
        const v6Cap = createLiveOwnedCapDraw(tick, this.frozenLimit);
        if (this.active(this.v5)) this.v5.firstResult = {
            endpointVersion: LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION,
            endpointSha256: LITERAL_BUILDING_ELIMINATION_ENDPOINT_SHA256,
            tick, status: "tick_cap_draw", winner: "draw",
        };
        if (this.active(this.v6)) this.v6.firstResult = v6Cap;
        return this.getState();
    }

    getState(): PassiveDualEndpointState {
        return structuredClone({
            v5: this.v5, v6: this.v6,
            complete: !this.active(this.v5) && !this.active(this.v6),
            failed: this.v5.technicalFailure !== null || this.v6.technicalFailure !== null,
        });
    }
}
