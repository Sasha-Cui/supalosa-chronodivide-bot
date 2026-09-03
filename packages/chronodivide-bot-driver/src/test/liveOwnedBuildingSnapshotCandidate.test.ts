import { ApiEventType, ObjectType } from "@chronodivide/game-api";
import { describe, expect, it } from "vitest";
import { snapshotLiveOwnedBuildingsCandidate } from "../training/liveOwnedBuildingSnapshotCandidate.js";
import { evaluateLiteralBuildingUpdate, EndpointEvent, BuildingLedgerRow } from "../training/literalBuildingEliminationEndpoint.js";

const combatants = { candidate: "candidate", baseline: "baseline" };
const building = (id: number, owner: string, hp = 100): any => ({ id, owner, hitPoints: hp,
    rules: { type: ObjectType.Building, name: "SYNTHETIC" }, tile: { rx: id, ry: 0 } });
const api = (units: any[], owned: Record<string, number[]>): any => ({
    getVisibleUnits: (name: string, relation: string) => { if (relation !== "self") throw new Error("Wrong collection"); return owned[name]; },
    getUnitData: (id: number) => units.find((unit) => unit.id === id),
});
const row = (unit: any): BuildingLedgerRow => ({ id: unit.id, owner: unit.owner, hitPoints: unit.hitPoints,
    rulesName: unit.rules.name, x: unit.tile.rx, y: unit.tile.ry });
const destroy = (target: number, attackerPlayerName: string | null): EndpointEvent => ({
    type: ApiEventType.ObjectDestroy, target, attackerPlayerName, attackerObjectId: null, weaponName: null,
});
const evaluate = (pre: BuildingLedgerRow[], post: BuildingLedgerRow[], events: EndpointEvent[]) =>
    evaluateLiteralBuildingUpdate({ tick: 1, combatants, pre, post, events,
        establishedBeforeUpdate: { candidate: true, baseline: true } });

describe("candidate live-owned snapshot (not a production endpoint)", () => {
    it("retains living owned buildings, excludes removed rubble, and sorts/deduplicates", () => {
        const units = [building(3, "candidate"), building(1, "candidate"), building(2, "baseline", 0)];
        const result = snapshotLiveOwnedBuildingsCandidate(api(units, { candidate: [3,1,3], baseline: [] }), combatants);
        expect(result.map((unit) => unit.id)).toEqual([1,3]);
    });
    it("excludes zero-health rows even if still returned by an owned collection", () => {
        expect(snapshotLiveOwnedBuildingsCandidate(api([building(2,"baseline",0)], { candidate: [], baseline: [2] }), combatants)).toEqual([]);
    });
    it("fails closed on unknown health, stale owner, missing data and invalid names", () => {
        for (const hp of [undefined, NaN, Infinity]) {
            const unit = building(1,"candidate"); unit.hitPoints = hp;
            expect(() => snapshotLiveOwnedBuildingsCandidate(api([unit], {candidate:[1],baseline:[]}),combatants)).toThrow("health");
        }
        expect(() => snapshotLiveOwnedBuildingsCandidate(api([building(1,"baseline")], {candidate:[1],baseline:[]}),combatants)).toThrow("identity");
        expect(() => snapshotLiveOwnedBuildingsCandidate(api([], {candidate:[1],baseline:[]}),combatants)).toThrow("identity");
        expect(() => snapshotLiveOwnedBuildingsCandidate(api([], {}), {candidate:"same",baseline:"same"})).toThrow("Distinct");
    });
    it("demonstrates the rubble false-negative without changing the old evaluator", () => {
        const pre = [building(1,"candidate"),building(2,"baseline")], rubble = [pre[0],building(2,"baseline",0)];
        expect(evaluate(pre.map(row),rubble.map(row),[destroy(2,"candidate")]).status).toBe("continue");
        const live = snapshotLiveOwnedBuildingsCandidate(api(rubble,{candidate:[1],baseline:[]}),combatants);
        expect(evaluate(pre.map(row),live,[destroy(2,"candidate")]).status).toBe("candidate_win");
    });
    it("is symmetric for the opposing physical elimination", () => {
        const pre = [building(1,"candidate"),building(2,"baseline")];
        const live = snapshotLiveOwnedBuildingsCandidate(api([building(1,"candidate",0),pre[1]],{candidate:[],baseline:[2]}),combatants);
        expect(evaluate(pre.map(row),live,[destroy(1,"baseline")]).status).toBe("baseline_win");
    });
    it("does not turn capture, sale, unexplained removal or cleanup into a physical win", () => {
        const pre = [building(1,"candidate"),building(2,"baseline")].map(row), post = [pre[0]];
        const controls: EndpointEvent[][] = [
            [{type:ApiEventType.ObjectOwnerChange,target:2,previousOwnerName:"baseline",newOwnerName:"candidate"}],
            [{type:ApiEventType.ObjectUnspawn,target:2}],
            [],
            [destroy(2,null),{type:ApiEventType.ObjectUnspawn,target:2}],
        ];
        for(const events of controls) expect(evaluate(pre,post,events).candidatePhysicalWin).toBe(false);
    });
    it("retains simultaneous physical elimination as a draw", () => {
        const pre = [building(1,"candidate"),building(2,"baseline")].map(row);
        expect(evaluate(pre,[],[destroy(1,"baseline"),destroy(2,"candidate")]).status).toBe("simultaneous_draw");
    });
});
