import { describe, expect, it, vi } from "vitest";
import { ApiEventType, GameApi, ObjectType } from "@chronodivide/game-api";
import {
    LiveOwnedBuildingEliminationAdjudicator, LIVE_OWNED_ENDPOINT_VERSION,
    LIVE_OWNED_ENDPOINT_SHA256, createLiveOwnedCapDraw, installLiveOwnedEndpointInstrumentation,
} from "../training/liveOwnedBuildingEliminationEndpointV6.js";
import { LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION } from "../training/literalBuildingEliminationEndpoint.js";

const names = { candidate: "A", baseline: "B" };
const row = (id: number, owner: string, hp = 100): any => ({
    id, owner, hitPoints: hp, rules: { type: ObjectType.Building, name: "GAPOWR" }, tile: { rx: id, ry: 1 },
});
const api = (units: any[], owned?: Record<string, number[]>, tick = 1): GameApi => ({
    getVisibleUnits: (name: string, relation: string) => {
        if (relation !== "self") throw new Error("Wrong collection");
        return owned?.[name] ?? units.filter(u => u.owner === name && u.hitPoints > 0).map(u => u.id);
    },
    getUnitData: (id: number) => units.find(u => u.id === id),
    getCurrentTick: () => tick,
} as unknown as GameApi);
const normal = { finished: false, defeated: { candidate: false, baseline: false } };
const destroy = (id: number, player?: string): any => ({
    type: ApiEventType.ObjectDestroy, target: id,
    attackerInfo: player ? { playerName: player, objId: 99, weaponName: "105mm" } : undefined,
});
const primed = () => {
    const a = new LiveOwnedBuildingEliminationAdjudicator(names), game = api([row(1, "A"), row(2, "B")]);
    a.beginUpdate(game); a.completeUpdate(game, normal); return a;
};

describe("separate live-owned endpoint v6", () => {
    it("keeps v5 version unchanged and uses a distinct explicit v6 identity", () => {
        expect(LITERAL_BUILDING_ELIMINATION_ENDPOINT_VERSION).toBe(5);
        expect(LIVE_OWNED_ENDPOINT_VERSION).toBe(6);
        expect(LIVE_OWNED_ENDPOINT_SHA256).toMatch(/^[a-f0-9]{64}$/);
        expect(createLiveOwnedCapDraw(90000, 90000)).toMatchObject({ endpointVersion: 6, status: "tick_cap_draw", winner: "draw" });
        expect(() => createLiveOwnedCapDraw(89999, 90000)).toThrow("exact");
        expect(() => createLiveOwnedCapDraw(0, 0)).toThrow("exact");
    });
    it("requires balanced lifecycle calls and valid immutable actor names", () => {
        expect(() => new LiveOwnedBuildingEliminationAdjudicator({ candidate: "A", baseline: "A" })).toThrow("Distinct");
        const copied = { ...names }, a = new LiveOwnedBuildingEliminationAdjudicator(copied), game = api([row(1, "A"), row(2, "B")]);
        copied.baseline = "changed";
        expect(() => a.completeUpdate(game, normal)).toThrow("not begun");
        a.beginUpdate(game); expect(() => a.beginUpdate(game)).toThrow("already began");
        expect(a.completeUpdate(game, normal).evaluation.postCounts).toEqual({ candidate: 1, baseline: 1 });
    });
    it("excludes retained rubble and deduplicates symmetric event observations", () => {
        const a = primed(), e = destroy(2, "A");
        a.beginUpdate(api([row(1, "A"), row(2, "B")]));
        a.observe(e); a.observe(e);
        a.observe({ type: ApiEventType.ObjectUnspawn, target: 2 });
        const result = a.completeUpdate(api([row(1, "A"), row(2, "B", 0)], { A: [1], B: [] }, 2), normal);
        expect(result.terminal).toMatchObject({ endpointVersion: 6, endpointSha256: LIVE_OWNED_ENDPOINT_SHA256, status: "candidate_win" });
        expect(result.evaluation.dispositions.find(entry => entry.building.id === 2)!.matchedEvents).toHaveLength(2);
    });
    it("is symmetric across combatant labels", () => {
        const a = primed(); a.beginUpdate(api([row(1, "A"), row(2, "B")])); a.observe(destroy(1, "B"));
        expect(a.completeUpdate(api([row(1, "A", 0), row(2, "B")], { A: [], B: [2] }), normal).terminal?.status).toBe("baseline_win");
    });
    it("does not turn capture, sale or unattributed cleanup into physical credit", () => {
        const controls: any[][] = [
            [{ type: ApiEventType.ObjectOwnerChange, target: 2, prevOwnerName: "B", newOwnerName: "A" }],
            [{ type: ApiEventType.ObjectUnspawn, target: 2 }],
            [destroy(2), { type: ApiEventType.ObjectUnspawn, target: 2 }],
        ];
        for (const events of controls) {
            const a = primed(); a.beginUpdate(api([row(1, "A"), row(2, "B")])); events.forEach(e => a.observe(e));
            const r = a.completeUpdate(api([row(1, "A")]), normal);
            expect(r.evaluation.candidatePhysicalWin).toBe(false); expect(r.terminal).toBeNull();
        }
    });
    it("preserves simultaneous physical elimination as a draw", () => {
        const a = primed(); a.beginUpdate(api([row(1, "A"), row(2, "B")]));
        a.observe(destroy(1, "B")); a.observe(destroy(2, "A"));
        expect(a.completeUpdate(api([]), normal).terminal).toMatchObject({ endpointVersion: 6, status: "simultaneous_draw", winner: "draw" });
    });
    it("preserves native-end truth table and relabels failures with v6 identity", () => {
        for (const candidate of [false, true]) for (const baseline of [false, true]) {
            const a = primed(), game = api([row(1, "A"), row(2, "B")]); a.beginUpdate(game);
            const r = a.completeUpdate(game, { finished: true, defeated: { candidate, baseline } });
            if (candidate || baseline) expect(r.terminal).toMatchObject({ endpointVersion: 6, status: "engine_nonliteral_termination_draw" });
            else expect(r.technicalFailure).toMatchObject({ endpointVersion: 6, reason: "engine_finished_without_defeated_combatant_or_literal_endpoint" });
        }
    });
    it("gives physical evidence precedence even at native finish", () => {
        const a = primed(); a.beginUpdate(api([row(1, "A"), row(2, "B")])); a.observe(destroy(2, "A"));
        const r = a.completeUpdate(api([row(1, "A")]), { finished: true, defeated: { candidate: false, baseline: false } });
        expect(r.terminal?.status).toBe("candidate_win"); expect(r.technicalFailure).toBeNull();
    });
    it("rejects missing health and returns defensive history copies", () => {
        const a = primed(), bad = row(1, "A"); bad.hitPoints = undefined;
        expect(() => a.beginUpdate(api([bad, row(2, "B")], { A: [1], B: [2] }))).toThrow("health");
        a.beginUpdate(api([row(1, "A"), row(2, "B")])); a.observe(destroy(2, "A")); a.completeUpdate(api([row(1, "A")]), normal);
        const h = a.getDispositionHistory(); h[0].building.owner = "mutated";
        expect(a.getDispositionHistory()[0].building.owner).toBe("B");
        const established = a.getEstablished(); established.candidate = false;
        expect(a.getEstablished().candidate).toBe(true);
    });
    it("suppresses both quit methods and forwards both event streams without policy changes", () => {
        const nativeA = vi.fn(), nativeB = vi.fn(), seen = vi.fn(), eventA = vi.fn(), eventB = vi.fn();
        const bots: any = {
            candidate: { lastPlayerActions: { quitGame: nativeA }, onGameStart: vi.fn(), onGameEvent: eventA },
            baseline: { lastPlayerActions: { quitGame: nativeB }, onGameStart: vi.fn(), onGameEvent: eventB },
        };
        const { audit } = installLiveOwnedEndpointInstrumentation(bots, { observe: seen });
        bots.candidate.onGameStart(api([])); bots.baseline.onGameStart(api([]));
        bots.candidate.lastPlayerActions.quitGame(); bots.baseline.lastPlayerActions.quitGame();
        expect(nativeA).not.toHaveBeenCalled(); expect(nativeB).not.toHaveBeenCalled();
        expect(audit.attempts).toEqual({ candidate: 1, baseline: 1 }); expect(audit.forwarded).toEqual({ candidate: 0, baseline: 0 });
        const e = destroy(2, "A"); bots.candidate.onGameEvent(e, api([])); bots.baseline.onGameEvent(e, api([]));
        expect(seen).toHaveBeenCalledTimes(2); expect(eventA).toHaveBeenCalledOnce(); expect(eventB).toHaveBeenCalledOnce();
    });
});
