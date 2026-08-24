import { describe, expect, it, vi } from "vitest";
import { GameApi } from "@chronodivide/game-api";
import { SupalosaBot } from "@supalosa/chronodivide-bot/dist/bot/bot.js";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { StrongBot } from "@supalosa/chronodivide-bot/dist/bot/strongBot.js";
import { StrongStrategy } from "@supalosa/chronodivide-bot/dist/bot/strategy/strongStrategy.js";
import { parseScontrolJobLine } from "../benchmark/provenance.js";

type PrivateRecord = Record<string, any>;

const stubTickHelpers = (bot: StrongBot): PrivateRecord => {
    const record = bot as unknown as PrivateRecord;
    for (const name of Object.getOwnPropertyNames(StrongBot.prototype)) {
        if (name.startsWith("maybe")) {
            record[name] = vi.fn(() => false);
        }
    }
    return record;
};

describe("scheduler provenance", () => {
    it("prefers authoritative Slurm fields over mutable environment labels", () => {
        expect(
            parseScontrolJobLine(
                "JobId=20965700 Account=prio_btk22 QOS=prio_btk22 Partition=priority JobState=RUNNING",
            ),
        ).toEqual({ account: "prio_btk22", partition: "priority", qos: "prio_btk22" });
    });
});

describe("research ablation flags", () => {
    it("skips exact-map tick tactics when disabled", () => {
        const superTick = vi.spyOn(SupalosaBot.prototype, "onGameTick").mockImplementation(() => undefined);
        const bot = new StrongBot(
            "generic",
            Countries.IRAQ,
            [],
            false,
            new StrongStrategy({ defaultMapProfiles: false }),
            { defaultMapProfiles: false, exactMapTactics: false },
        );
        const record = stubTickHelpers(bot);
        const exactTactic = vi.fn(() => false);
        record.maybeHfoBottomCriticalCleanup = exactTactic;

        bot.onGameTick({} as GameApi);

        expect(superTick).toHaveBeenCalledOnce();
        expect(exactTactic).not.toHaveBeenCalled();
        superTick.mockRestore();
    });

    it("retains exact-map tick tactics in the profiled condition", () => {
        const superTick = vi.spyOn(SupalosaBot.prototype, "onGameTick").mockImplementation(() => undefined);
        const bot = new StrongBot("profiled", Countries.IRAQ, [], false, new StrongStrategy(), {
            defaultMapProfiles: true,
            exactMapTactics: true,
        });
        const record = stubTickHelpers(bot);
        const exactTactic = vi.fn(() => false);
        record.maybeHfoBottomCriticalCleanup = exactTactic;

        bot.onGameTick({} as GameApi);

        expect(superTick).toHaveBeenCalledOnce();
        expect(exactTactic).toHaveBeenCalledOnce();
        superTick.mockRestore();
    });

    it("skips StrongStrategy map detection when automatic profiles are disabled", () => {
        const strategy = new StrongStrategy({ defaultMapProfiles: false });
        const record = strategy as unknown as PrivateRecord;
        const detector = vi.fn(() => true);
        record.isSimple1v1Map = detector;
        record.macroBoostFactory = { maybeCreateMissions: vi.fn() };
        record.staticDefenseBoostFactory = { maybeCreateMissions: vi.fn() };
        record.strategicPlanFactory = { maybeCreateMissions: vi.fn() };
        record.navalAssaultFactory = { maybeCreateMissions: vi.fn() };
        record.allInAttackFactory = { maybeCreateMissions: vi.fn() };
        record.baseStrategy = { onAiUpdate: vi.fn(() => record.baseStrategy) };

        strategy.onAiUpdate({} as any, {} as any, vi.fn());

        expect(detector).not.toHaveBeenCalled();
    });

    it("enables the replicated west guard by default and retains explicit off controls", () => {
        const defaultBot = new StrongBot("default-west", Countries.USA, [], false, new StrongStrategy(), {});
        expect((defaultBot as unknown as PrivateRecord).hfoWestHomeGuardOptions).toMatchObject({
            enabled: true,
            untilTick: 9_600,
            radius: 72,
            orderIntervalTicks: 6,
            engageMinCombatants: 4,
            engageCombatantAdvantage: 0,
            alliedOnly: false,
        });
        expect((defaultBot as unknown as PrivateRecord).hfoBottomRetargetOptions.enabled).toBe(true);

        const disabledBot = new StrongBot("disabled-west", Countries.USA, [], false,
            new StrongStrategy({ hfoAlliedWestProfile: false }), {
                hfoWestHomeGuard: { enabled: false },
                hfoBottomRetarget: { enabled: false },
            });
        expect((disabledBot as unknown as PrivateRecord).hfoWestHomeGuardOptions.enabled).toBe(false);
        expect((disabledBot as unknown as PrivateRecord).hfoBottomRetargetOptions.enabled).toBe(false);
        expect((new StrongStrategy() as unknown as PrivateRecord).options.hfoAlliedWestProfile).toBeUndefined();
        expect((new StrongStrategy() as unknown as PrivateRecord).options.hfoSovietWestProfile).toBeUndefined();
        expect((new StrongStrategy({ hfoAlliedWestProfile: false }) as unknown as PrivateRecord)
            .options.hfoAlliedWestProfile).toBe(false);
        expect((new StrongStrategy({ hfoSovietWestProfile: true }) as unknown as PrivateRecord)
            .options.hfoSovietWestProfile).toBe(true);

        const sovietDisabledBot = new StrongBot("disabled-soviet-west", Countries.IRAQ, [], false,
            new StrongStrategy({ hfoSovietWestProfile: false }), {
                hfoWestHomeGuard: { alliedOnly: true },
            });
        expect((sovietDisabledBot as unknown as PrivateRecord).hfoWestHomeGuardOptions.alliedOnly).toBe(true);
        expect(((sovietDisabledBot as unknown as PrivateRecord).strategy as PrivateRecord)
            .options.hfoSovietWestProfile).toBe(false);
    });

    it("enables the replicated bottom retarget and accepts explicit margins", () => {
        const defaultBot = new StrongBot("default-retarget", Countries.IRAQ, [], false, new StrongStrategy(), {});
        expect((defaultBot as unknown as PrivateRecord).hfoBottomRetargetOptions).toMatchObject({
            enabled: true,
            combatantAdvantage: 0,
            activationStallTicks: 1_200,
        });
        const safetyBot = new StrongBot("safe-retarget", Countries.IRAQ, [], false, new StrongStrategy(), {
            hfoBottomRetarget: { enabled: true, combatantAdvantage: 4, activationStallTicks: 1_200 },
        });
        expect((safetyBot as unknown as PrivateRecord).hfoBottomRetargetOptions).toMatchObject({
            enabled: true,
            combatantAdvantage: 4,
            activationStallTicks: 1_200,
        });
    });

    it("keeps Soviet-west retarget opt-in and country-restricted", () => {
        const defaultBot = new StrongBot("default-west-retarget", Countries.IRAQ, [], false, new StrongStrategy(), {});
        expect((defaultBot as unknown as PrivateRecord).hfoWestRetargetOptions).toMatchObject({
            enabled: false,
            sovietOnly: true,
            activationStallTicks: 1_200,
        });
        const enabledBot = new StrongBot("enabled-west-retarget", Countries.IRAQ, [], false, new StrongStrategy(), {
            hfoWestRetarget: { enabled: true, activationStallTicks: 2_400 },
        });
        expect((enabledBot as unknown as PrivateRecord).hfoWestRetargetOptions).toMatchObject({
            enabled: true,
            sovietOnly: true,
            activationStallTicks: 2_400,
        });
    });

    it("waits for pre-activation building stagnation", () => {
        const bot = new StrongBot("stall-retarget", Countries.IRAQ, [], false, new StrongStrategy(), {
            hfoBottomRetarget: { enabled: true, activationStallTicks: 1_200 },
        });
        const record = bot as unknown as PrivateRecord;
        let tick = 42_000;
        const orderUnits = vi.fn();
        record.isHfoBottomVsTop = vi.fn(() => true);
        record.getKnownEnemyBuildings = vi.fn(() => [{ id: 10, hitPoints: 100 }]);
        record.getKnownEnemyCombatUnits = vi.fn(() => []);
        record.getMobileCombatants = vi.fn(() => [1, 2, 3, 4].map((id) => ({ id, rules: { name: "HTNK" } })));
        record.getHfoLateMopUpTargetWeight = vi.fn(() => 0);
        record.prepareUnitsForAttackMove = vi.fn((units) => units);
        record.context = { player: { actions: { orderUnits } } };
        const game = { getCurrentTick: () => tick } as GameApi;

        expect(record.maybeHfoBottomRetarget(game)).toBe(false);
        expect(record.hfoBottomRetargetActivated).toBe(false);
        tick = 43_199;
        expect(record.maybeHfoBottomRetarget(game)).toBe(false);
        tick = 43_200;
        expect(record.maybeHfoBottomRetarget(game)).toBe(true);
        expect(record.hfoBottomRetargetActivated).toBe(true);
        expect(orderUnits).toHaveBeenCalledOnce();
    });
});
