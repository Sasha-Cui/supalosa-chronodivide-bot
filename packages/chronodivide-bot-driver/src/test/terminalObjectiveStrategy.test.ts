import { describe, expect, it, vi } from "vitest";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import {
    TerminalObjectiveStrategy,
    createTerminalObjectiveCandidate,
    hasBridgeUncalibratedFriendlyObjectiveMechanic,
    hasBridgeUncalibratedObjectiveMechanic,
    partitionContinuousOffenseCombatants,
    objectiveReserveCombatantCount,
    terminalRaceActivationReason,
} from "../training/terminalObjectiveStrategy.js";
import { buildTerminalObjectiveArms } from "../training/terminalObjectivePolicy.js";
import { buildTerminalRaceArms } from "../training/terminalRacePolicy.js";
import { buildContinuousOffensePolicy } from "../training/continuousOffensePolicy.js";
import { buildProgressCertifiedConversionPolicy } from "../training/progressCertifiedConversionPolicy.js";

const arms = new Map(buildTerminalObjectiveArms().map((arm) => [arm.armId, arm]));
const terminalRaceArms = new Map(buildTerminalRaceArms().map((arm) => [arm.armId, arm]));

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

    it("constructs the continuous-offense candidate through the shared external strategy bridge", () => {
        const inner = { onAiUpdate: vi.fn() as any };
        inner.onAiUpdate.mockReturnValue(inner);
        const wrapped = { tag: "continuous-offense" };
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/pinned" } as const,
            create: vi.fn(() => ({ tag: "baseline" })),
            createDefaultStrategy: vi.fn(() => inner),
            createWithStrategy: vi.fn(() => wrapped),
        };
        const result = createTerminalObjectiveCandidate(
            factory as any,
            "candidate",
            Countries.USA,
            buildContinuousOffensePolicy(),
        );
        expect(result).toBe(wrapped);
        expect(factory.createDefaultStrategy).toHaveBeenCalledOnce();
        expect(factory.createWithStrategy).toHaveBeenCalledOnce();
    });

    it("constructs progress-certified conversion on the exact external predecessor", () => {
        const inner = { onAiUpdate: vi.fn() as any };
        inner.onAiUpdate.mockReturnValue(inner);
        const wrapped = { tag: "progress-certified-conversion" };
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/pinned" } as const,
            create: vi.fn(() => ({ tag: "baseline" })),
            createDefaultStrategy: vi.fn(() => inner),
            createWithStrategy: vi.fn(() => wrapped),
        };
        const result = createTerminalObjectiveCandidate(
            factory as any,
            "candidate",
            Countries.USA,
            buildProgressCertifiedConversionPolicy(),
        );
        expect(result).toBe(wrapped);
        expect(factory.create).not.toHaveBeenCalled();
        expect(factory.createDefaultStrategy).toHaveBeenCalledOnce();
        expect(factory.createWithStrategy).toHaveBeenCalledOnce();
    });

    it("keeps the progress-certified disabled arm on the exact baseline path", () => {
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
            buildProgressCertifiedConversionPolicy({ enabled: false }),
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

    it("does not let role-irrelevant crusher or deploy flags invalidate an ordinary friendly weapon", () => {
        const ordinaryWeapon = {
            rules: {
                name: "ordinary",
                damage: 100,
                burst: 1,
                rof: 30,
                areaFire: false,
                ambientDamage: 0,
                radLevel: 0,
                spawner: false,
                limboLaunch: false,
                suicide: false,
                neverUse: false,
            },
            projectileRules: {
                isAntiGround: true,
                shrapnelCount: 0,
                inaccurate: false,
                flakScatter: false,
                arcing: false,
            },
            warheadRules: {
                temporal: false,
                mindControl: false,
                ivanBomb: false,
                cellSpread: 0,
                verses: new Map([["concrete", 1]]),
            },
            maxRange: 5,
            speed: 100,
            cooldownTicks: 0,
        };
        const target = { rules: { type: 2, isSelectableCombatant: true, armor: "concrete" } };
        const unit = {
            id: 1,
            rules: {
                crusher: true,
                deployFire: true,
                c4: false,
                ivan: false,
                spawns: false,
                engineer: false,
                teleporter: false,
                radialFireSegments: 0,
            },
            primaryWeapon: ordinaryWeapon,
            secondaryWeapon: undefined,
            garrisonUnitCount: 0,
        };
        const multipliers = { damageMultiplier: 1, rateOfFireMultiplier: 1, speedMultiplier: 1 };
        expect(hasBridgeUncalibratedObjectiveMechanic(unit as any)).toBe(true);
        expect(hasBridgeUncalibratedFriendlyObjectiveMechanic(
            unit as any,
            target as any,
            "ordinary_weapon_role_specific",
            multipliers,
            1,
        )).toBe(false);
        expect(hasBridgeUncalibratedFriendlyObjectiveMechanic(
            unit as any,
            target as any,
            "all_specials_fail_closed",
            multipliers,
            1,
        )).toBe(true);
    });

    it("keeps uncalibrated friendly attack mechanics fail-closed", () => {
        const unit = {
            rules: {
                crusher: true,
                deployFire: true,
                c4: false,
                ivan: false,
                spawns: false,
                engineer: false,
                teleporter: false,
                radialFireSegments: 0,
            },
            primaryWeapon: {
                rules: {
                    damage: 1,
                    burst: 1,
                    rof: 1,
                    areaFire: true,
                    neverUse: false,
                },
                projectileRules: { isAntiGround: true, arcing: false },
                warheadRules: { verses: new Map([["concrete", 1]]) },
            },
            secondaryWeapon: undefined,
            garrisonUnitCount: 0,
        };
        expect(hasBridgeUncalibratedFriendlyObjectiveMechanic(
            unit as any,
            { rules: { type: 2, isSelectableCombatant: true, armor: "concrete" } } as any,
            "ordinary_weapon_role_specific",
            { damageMultiplier: 1, rateOfFireMultiplier: 1, speedMultiplier: 1 },
            1,
        )).toBe(true);
    });

    it("activates a building-count trigger only after a real guarded transition", () => {
        const policy = terminalRaceArms.get("public_terminal_race_trigger")!.policy;
        expect(terminalRaceActivationReason(policy, 3_599, 2, 10)).toBeNull();
        expect(terminalRaceActivationReason(policy, 3_600, 2, 3)).toBeNull();
        expect(terminalRaceActivationReason(policy, 3_600, 2, 10)).toBe("guarded_building_count");
        expect(terminalRaceActivationReason(policy, 7_200, 10, 10)).toBe("fixed_tick");
        expect(terminalRaceActivationReason(
            terminalRaceArms.get("public_terminal_race_late")!.policy,
            3_600,
            2,
            10,
        )).toBeNull();
    });

    it("runs continuous offense from the early guarded transition or its fixed deadline", () => {
        const policy = buildContinuousOffensePolicy();
        expect(terminalRaceActivationReason(policy, 7_199, 4, 10)).toBeNull();
        expect(terminalRaceActivationReason(policy, 7_200, 4, 5)).toBeNull();
        expect(terminalRaceActivationReason(policy, 7_200, 4, 10)).toBe("guarded_building_count");
        expect(terminalRaceActivationReason(policy, 12_600, 20, 20)).toBe("fixed_tick");
    });

    it("reserves the combatants nearest home and sends the forward force", () => {
        const unit = (id: number, x: number) => ({ id, tile: { rx: x, ry: 0 } }) as any;
        const partition = partitionContinuousOffenseCombatants(
            [unit(4, 20), unit(2, 1), unit(3, 9), unit(1, 1)],
            { x: 0, y: 0 },
            2,
        );
        expect(partition.reserved.map(({ id }) => id)).toEqual([1, 2]);
        expect(partition.active.map(({ id }) => id)).toEqual([4, 3]);
    });

    it("releases the reserve for the exact final-building race", () => {
        const policy = buildProgressCertifiedConversionPolicy({
            ordinaryReserveCombatants: 2,
            terminalReserveCombatants: 0,
        });
        expect(objectiveReserveCombatantCount(policy, 3)).toBe(2);
        expect(objectiveReserveCombatantCount(policy, 1)).toBe(0);
        expect(objectiveReserveCombatantCount(policy, null)).toBe(2);
    });

    it("activates final-building conversion earlier without taking over multi-building play", () => {
        const policy = buildProgressCertifiedConversionPolicy();
        expect(terminalRaceActivationReason(policy as any, 3_599, 1, 10)).toBeNull();
        expect(terminalRaceActivationReason(policy as any, 3_600, 2, 10)).toBeNull();
        expect(terminalRaceActivationReason(policy as any, 3_600, 1, 10)).toBe("guarded_building_count");
        expect(terminalRaceActivationReason(policy as any, 7_200, 2, 10)).toBeNull();
    });
});
