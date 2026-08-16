import { describe, expect, it, vi } from "vitest";
import { FactoryType, ObjectType } from "@chronodivide/game-api";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import {
    FinishAdvantageStateObserver,
} from "../training/finishAdvantageStateObserver.js";
import { computeFinishAdvantagePartition } from "../training/finishAdvantageControl.js";

const mission = (
    name: unknown = "attack_1.1",
    ids: unknown = [1, 2],
    locked: unknown = true,
    priority: unknown = 100,
) => ({
    getUniqueName: () => name,
    getUnitIds: () => ids,
    isUnitsLocked: () => locked,
    getPriority: () => priority,
});

describe("finish-advantage margin partition", () => {
    it("keeps protected units protected when they already exceed desired cover", () => {
        const result = computeFinishAdvantagePartition({
            nominalEligibleIds: [1, 2, 3, 4, 5],
            protectedEligibleIds: new Set([1, 2, 3]),
            leasePoolByHomeDistance: [4, 5],
            enemyMobileSelectableCombatantCount: 0,
            margin: 0,
        });
        expect(result).toEqual({
            desiredCover: 2,
            protectedCount: 3,
            additionalReserveIds: [],
            strikeIds: [4, 5],
        });
    });

    it("selects additional reserve by frozen home-distance order", () => {
        const result = computeFinishAdvantagePartition({
            nominalEligibleIds: [1, 2, 3, 4, 5, 6],
            protectedEligibleIds: new Set([1]),
            leasePoolByHomeDistance: [4, 2, 6, 3, 5],
            enemyMobileSelectableCombatantCount: 2,
            margin: 2,
        });
        expect(result.desiredCover).toBe(4);
        expect(result.additionalReserveIds).toEqual([4, 2, 6]);
        expect(result.strikeIds).toEqual([3, 5]);
        expect(new Set([...result.additionalReserveIds, ...result.strikeIds]).has(1)).toBe(false);
    });

    it("returns no strike when cover consumes the lease pool", () => {
        const result = computeFinishAdvantagePartition({
            nominalEligibleIds: [1, 2, 3],
            protectedEligibleIds: new Set(),
            leasePoolByHomeDistance: [1, 2, 3],
            enemyMobileSelectableCombatantCount: 20,
            margin: 8,
        });
        expect(result.desiredCover).toBe(3);
        expect(result.additionalReserveIds).toEqual([1, 2, 3]);
        expect(result.strikeIds).toEqual([]);
    });

    it("rejects duplicate lease-pool identities", () => {
        expect(() => computeFinishAdvantagePartition({
            nominalEligibleIds: [1, 2],
            protectedEligibleIds: new Set(),
            leasePoolByHomeDistance: [1, 1, 2],
            enemyMobileSelectableCombatantCount: 0,
            margin: 0,
        })).toThrow(/duplicate unit IDs/);
    });

    it("rejects incomplete or protected lease pools", () => {
        expect(() => computeFinishAdvantagePartition({
            nominalEligibleIds: [1, 2, 3],
            protectedEligibleIds: new Set([1]),
            leasePoolByHomeDistance: [2],
            enemyMobileSelectableCombatantCount: 0,
            margin: 0,
        })).toThrow(/exact unprotected eligible set/);
        expect(() => computeFinishAdvantagePartition({
            nominalEligibleIds: [1, 2, 3],
            protectedEligibleIds: new Set([1]),
            leasePoolByHomeDistance: [1, 2, 3],
            enemyMobileSelectableCombatantCount: 0,
            margin: 0,
        })).toThrow(/exact unprotected eligible set/);
    });
});

describe("finish-advantage passive wrapper", () => {
    it("calls the current inner strategy exactly once and retains its replacement", () => {
        const replacement: any = { onAiUpdate: vi.fn(() => replacement) };
        const first = { onAiUpdate: vi.fn(() => replacement) };
        const observer = new FinishAdvantageStateObserver(first as any, vi.fn(), {
            country: Countries.USA,
            candidateSlot: 0,
            faction: "Allied",
        });
        const game = {
            getCurrentTick: () => 1,
            getAllUnits: () => [],
            getUnitData: () => null,
            areAlliedPlayers: () => false,
            getGeneralRules: () => ({ baseUnit: [] }),
            getPlayerData: () => ({ startLocation: { x: 0, y: 0 } }),
            getVisibleUnits: () => [],
        };
        const context = { game, player: { name: "candidate", actions: {} } };
        const controller = { getMissions: () => [] };
        observer.onAiUpdate(context as any, controller, vi.fn());
        observer.onAiUpdate(context as any, controller, vi.fn());
        expect(first.onAiUpdate).toHaveBeenCalledTimes(1);
        expect(replacement.onAiUpdate).toHaveBeenCalledTimes(1);
    });

    it("binds every emitted state to country, faction, and slot without mutating missions", () => {
        const membership = [7];
        const missions = [mission("globalDefence.1.1", membership)];
        const controller = { getMissions: vi.fn(() => missions) };
        const inner: any = { onAiUpdate: vi.fn(() => inner) };
        const sink = vi.fn();
        const observer = new FinishAdvantageStateObserver(inner as any, sink, {
            country: Countries.USA,
            candidateSlot: 1,
            faction: "Allied",
        });
        const building = (id: number, owner: string) => ({
            id,
            owner,
            type: ObjectType.Building,
            hitPoints: 100,
            canMove: false,
            tile: { rx: id, ry: id },
            foundation: { width: 1, height: 1 },
            primaryWeapon: null,
            secondaryWeapon: null,
            rules: {
                name: owner === "candidate" ? "GACNST" : "NACNST",
                factory: FactoryType.None,
                isSelectableCombatant: false,
                deploysInto: null,
                harvester: false,
                ammo: 0,
            },
        });
        const units = new Map([
            [1, building(1, "candidate")],
            [2, building(2, "enemy")],
        ]);
        const game = {
            getCurrentTick: () => 1,
            getAllUnits: () => [...units.keys()],
            getUnitData: (id: number) => units.get(id),
            areAlliedPlayers: () => false,
            getGeneralRules: () => ({ baseUnit: [] }),
            getPlayerData: (name: string) => name === "candidate"
                ? { startLocation: { x: 0, y: 0 }, isCombatant: true }
                : { startLocation: { x: 10, y: 10 }, isCombatant: true },
            getVisibleUnits: () => [],
        };
        observer.onAiUpdate(
            { game, player: { name: "candidate", actions: {} } } as any,
            controller,
            vi.fn(),
        );
        expect(controller.getMissions).toHaveBeenCalledTimes(1);
        expect(membership).toEqual([7]);
        expect(missions).toHaveLength(1);
        expect(sink).toHaveBeenCalledWith(expect.objectContaining({
            country: Countries.USA,
            candidateSlot: 1,
            faction: "Allied",
            missionOwnershipAvailable: true,
        }));
    });
});
