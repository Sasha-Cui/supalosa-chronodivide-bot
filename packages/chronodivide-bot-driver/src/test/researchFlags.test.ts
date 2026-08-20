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
            alliedOnly: true,
        });

        const disabledBot = new StrongBot("disabled-west", Countries.USA, [], false,
            new StrongStrategy({ hfoAlliedWestProfile: false }), {
                hfoWestHomeGuard: { enabled: false },
            });
        expect((disabledBot as unknown as PrivateRecord).hfoWestHomeGuardOptions.enabled).toBe(false);
        expect((new StrongStrategy() as unknown as PrivateRecord).options.hfoAlliedWestProfile).toBeUndefined();
        expect((new StrongStrategy({ hfoAlliedWestProfile: false }) as unknown as PrivateRecord)
            .options.hfoAlliedWestProfile).toBe(false);
    });
});
