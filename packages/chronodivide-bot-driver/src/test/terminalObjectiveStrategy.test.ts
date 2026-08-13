import { describe, expect, it, vi } from "vitest";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import {
    TerminalObjectiveStrategy,
    createTerminalObjectiveCandidate,
    hasBridgeUncalibratedObjectiveMechanic,
} from "../training/terminalObjectiveStrategy.js";
import { buildTerminalObjectiveArms } from "../training/terminalObjectivePolicy.js";

const arms = new Map(buildTerminalObjectiveArms().map((arm) => [arm.armId, arm]));

describe("terminal-objective strategy construction", () => {
    it("returns the exact baseline path when disabled", () => {
        const baseline = { tag: "exact-external-baseline" };
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/pinned" } as const,
            create: vi.fn(() => baseline),
            createDefaultStrategy: vi.fn(() => {
                throw new Error("disabled overlay must not construct a strategy");
            }),
            createWithStrategy: vi.fn(() => {
                throw new Error("disabled overlay must not wrap the bot");
            }),
        };
        const result = createTerminalObjectiveCandidate(
            factory as any,
            "candidate",
            Countries.USA,
            arms.get("selected_prior")!.policy,
        );
        expect(result).toBe(baseline);
        expect(factory.create).toHaveBeenCalledOnce();
        expect(factory.createDefaultStrategy).not.toHaveBeenCalled();
        expect(factory.createWithStrategy).not.toHaveBeenCalled();
    });

    it("always runs the external predecessor before considering an overlay", () => {
        const callOrder: string[] = [];
        let inner: { onAiUpdate: (context: unknown, controller: unknown, logger: unknown) => unknown };
        inner = {
            onAiUpdate: vi.fn(() => {
                callOrder.push("external");
                return inner;
            }),
        };
        const strategy = new TerminalObjectiveStrategy(
            inner,
            Countries.USA,
            { ...arms.get("full_sufficient_strike")!.policy, minTick: 100 },
            () => undefined,
        );
        const context = {
            game: {
                getCurrentTick: () => 0,
                getVisibleUnits: () => [],
                getPlayerData: () => ({ startLocation: { x: 0, y: 0 } }),
                map: {
                    getRealMapSize: () => ({ width: 0, height: 0 }),
                    getStartingLocations: () => [],
                    getTile: () => undefined,
                    isVisibleTile: () => false,
                },
            },
            player: { name: "candidate", actions: {} },
        };
        strategy.onAiUpdate(context as any, {}, vi.fn());
        expect(callOrder).toEqual(["external"]);
    });

    it("fails closed on bridge-level mechanics the pure adapter cannot certify", () => {
        const ordinary = {
            rules: { deployFire: false, teleporter: false, radialFireSegments: 0 },
            garrisonUnitCount: 0,
            primaryWeapon: { projectileRules: { arcing: false }, rules: { neverUse: false } },
            secondaryWeapon: undefined,
        };
        expect(hasBridgeUncalibratedObjectiveMechanic(ordinary as any)).toBe(false);
        expect(hasBridgeUncalibratedObjectiveMechanic({
            ...ordinary,
            primaryWeapon: { projectileRules: { arcing: true }, rules: { neverUse: false } },
        } as any)).toBe(true);
        expect(hasBridgeUncalibratedObjectiveMechanic({
            ...ordinary,
            rules: { ...ordinary.rules, deployFire: true },
        } as any)).toBe(true);
        expect(hasBridgeUncalibratedObjectiveMechanic({
            ...ordinary,
            garrisonUnitCount: 1,
        } as any)).toBe(true);
    });
});
