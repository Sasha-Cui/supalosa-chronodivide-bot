import { describe, it, expect, vi } from "vitest";
import { SupalosaBot } from "@supalosa/chronodivide-bot/dist/bot/bot.js";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { buildStrategicS1Plan, validateStrategicS1Plan } from "../training/strategicS1Plan.js";
import { OD1_MAP_IDS } from "../training/unifiedIntentV2OD1Plan.js";
import { S1ActionWindows, S1Sampler, S1Sample, assertS1ApiEnums } from "../training/strategicS1Observation.js";
import { FRESH_DUAL_ACTION_METHODS } from "../training/freshDualStudyInstrumentation.js";
import { validateS1Sample, validateS1Sequence } from "../training/strategicS1Validation.js";
import { analyzeS1Episode, deriveS1Sample, mobileS1 } from "../training/strategicS1Analysis.js";
import { encodeS1Ledger, replayS1Ledger, S1_LEDGER_LIMITS } from "../training/strategicS1Ledger.js";
const names = { candidate: "OD1Candidate", baseline: "OD1Opponent" };
const maps = () =>
    OD1_MAP_IDS.map((id, i) => ({
        id,
        label: id,
        fileName: id + ".map",
        absolutePath: "/synthetic/" + id + ".map",
        sha256: i.toString(16).padStart(64, "0"),
        starts: ["1,2", "3,4"],
        advancedEligible: id.startsWith("hfo-"),
    }));
function world() {
    let tick = 0;
    const weapon = { type: 0, rules: { name: "Cannon" }, minRange: 0, maxRange: 6, speed: 20, cooldownTicks: 0 };
    const make = (id: number, owner: string, rulesName: string, type: number) => ({
        id,
        owner,
        type,
        rules: { name: rulesName, type, primary: type === 7 ? "Cannon" : undefined, secondary: undefined },
        tile: { rx: id * 5, ry: 0 },
        hitPoints: 100,
        maxHitPoints: 100,
        purchaseValue: 700,
        canMove: type === 7,
        isIdle: type === 7,
        primaryWeapon: type === 7 ? weapon : undefined,
        secondaryWeapon: undefined,
        buildStatus: type === 2 ? 1 : undefined,
        isPoweredOn: type === 2 ? true : undefined,
    });
    let units: any[] = [
        ...Array.from({ length: 8 }, (_, i) => make(i + 1, names.candidate, "MTNK", 7)),
        make(9, names.candidate, "GAWEAP", 2),
        make(20, names.baseline, "NACNST", 2),
    ];
    const game: any = {
        getCurrentTick: () => tick,
        getAllUnits: () => units.map((u) => u.id),
        getUnitData: (id: number) => units.find((u) => u.id === id),
        getGameObjectData: (id: number) => units.find((u) => u.id === id),
        getPlayerData: (name: string) => ({
            name,
            country: { name: "Americans" },
            credits: 3000,
            power: { total: 100, drain: 50, isLowPower: false },
        }),
        isPlayerDefeated: () => false,
    };
    const prod: any = { getQueueData: (type: number) => ({ type, status: 0, size: 0, maxSize: 99, items: [] }) };
    const handles = [{}];
    const missions = () => [
        {
            handle: handles[0],
            name: "attack",
            type: "AttackMission",
            priority: 10,
            active: true,
            unitIds: [1, 2, 3, 4, 5, 6, 7, 8],
        },
    ];
    const actions: any = Object.fromEntries(
        FRESH_DUAL_ACTION_METHODS.map((k) => [
            k,
            function (this: unknown, ...args: unknown[]) {
                return { receiver: this, args };
            },
        ]),
    );
    const other: any = Object.fromEntries(FRESH_DUAL_ACTION_METHODS.map((k) => [k, vi.fn()]));
    return {
        game,
        prod,
        missions,
        handles,
        actions,
        other,
        get units() {
            return units;
        },
        set units(u) {
            units = u;
        },
        setTick: (n: number) => {
            tick = n;
        },
    };
}
function samples(updates = 1200, alter?: (f: ReturnType<typeof world>, tick: number) => void) {
    const f = world(),
        windows = new S1ActionWindows(names),
        sampler = new S1Sampler(names),
        result: S1Sample[] = [];
    windows.install("candidate", f.actions, f.game);
    windows.install("baseline", f.other, f.game);
    const ticks = [0];
    for (let t = 300; t <= updates; t += 300) ticks.push(t);
    if (ticks[ticks.length - 1] !== updates) ticks.push(updates);
    for (const tick of ticks) {
        f.setTick(tick);
        alter?.(f, tick);
        result.push(sampler.capture(f.game, { candidate: f.prod, baseline: f.prod }, f.missions, windows.take(tick)));
    }
    windows.finish({});
    windows.uninstall();
    return result;
}
describe("S1 frozen passive foundations (synthetic, no engine)", () => {
    it("reconstructs exactly 205 fresh definitions and 209 advancing episodes", () => {
        const p = buildStrategicS1Plan(maps());
        validateStrategicS1Plan(p);
        expect(p.cases).toHaveLength(200);
        expect(p.cases.map((c) => c.requestedEngineSeed)).toEqual(
            Array.from({ length: 200 }, (_, i) => 3350120000 + i),
        );
        expect(p.canaries.map((c) => c.requestedEngineSeed)).toEqual([3350121000, 3350121001, 3350121002, 3350121003]);
        expect(p.smoke.requestedEngineSeed).toBe(3350121100);
        expect(new Set([...p.cases, ...p.canaries, p.smoke].map((c) => c.requestedEngineSeed)).size).toBe(205);
        expect(p.counts.advancingEpisodes).toBe(209);
        expect(p.policy.arbiterEnabled).toBe(false);
        expect(p.counts.strata).toBe(25);
        expect(p.cases.filter((c) => c.opponent === "pinned_supalosa")).toHaveLength(120);
    });
    it("rejects seed, policy, population, country-ordinal or observer drift", () => {
        for (const mutate of [
            (p: any) => p.cases.pop(),
            (p: any) => p.cases[0].requestedEngineSeed++,
            (p: any) => (p.policy = { ...p.policy, arbiterEnabled: true }),
            (p: any) => (p.cases[2].countryOrdinal = 5),
            (p: any) => (p.observers = ["strategic", "endpoint_only"]),
        ]) {
            const p = structuredClone(buildStrategicS1Plan(maps()));
            mutate(p);
            expect(() => validateStrategicS1Plan(p)).toThrow();
        }
    });
    it("binds every public API enum to the fixed schema", () => expect(() => assertS1ApiEnums()).not.toThrow());
    it("returns null before startup and copies mission scalar/membership data", () => {
        const bot: any = new SupalosaBot(names.candidate, Countries.USA, [], false);
        expect(bot.getResearchMissionSnapshot()).toBe(null);
        const ids = [3, 1, 2],
            mission = {
                getUniqueName: () => "m",
                getPriority: () => 10,
                isActive: () => true,
                getUnitIds: () => ids,
                onAiUpdate: vi.fn(),
            };
        bot.missionController = { getMissions: () => [mission] };
        const s = bot.getResearchMissionSnapshot();
        expect(s[0].handle).toBe(mission);
        expect(s[0].unitIds).toEqual([1, 2, 3]);
        s[0].unitIds.push(99);
        s[0].name = "changed";
        expect(ids).toEqual([3, 1, 2]);
        expect(bot.getResearchMissionSnapshot()[0].name).toBe("m");
        expect(mission.onAiUpdate).not.toHaveBeenCalled();
    });
    it("forwards exact this, arguments and return value and restores descriptors", () => {
        const f = world(),
            w = new S1ActionWindows(names),
            before = Object.getOwnPropertyDescriptors(f.actions);
        w.install("candidate", f.actions, f.game);
        w.install("baseline", f.other, f.game);
        const ids = [1, 1, 2],
            ret = f.actions.orderUnits(ids, 0, 10, 20);
        expect(ret.receiver).toBe(f.actions);
        expect(ret.args[0]).toBe(ids);
        const first = w.take(0);
        expect(first.calls).toBe(1);
        expect(first.requestedUnitIdOccurrences.candidate).toBe(3);
        expect(first.bySideAndOrder).toEqual({ "candidate.Move": 1 });
        expect(first.bySideAndTarget).toEqual({ "candidate.position": 1 });
        w.finish({ "candidate.orderUnits": 1 });
        w.uninstall();
        expect(Object.getOwnPropertyDescriptors(f.actions)).toEqual(before);
    });
    it("keeps startup and subsequent windows nonoverlapping and conserves every call", () => {
        const f = world(),
            w = new S1ActionWindows(names);
        w.install("candidate", f.actions, f.game);
        w.install("baseline", f.other, f.game);
        f.actions.queueForProduction(3, "MTNK", 1);
        expect(w.take(0).afterTick).toBe(-1);
        f.setTick(1);
        f.actions.orderUnits([1], 2, 20);
        const x = w.take(300);
        expect(x.afterTick).toBe(0);
        expect(x.bySideAndTarget).toEqual({ "candidate.baseline/building/live": 1 });
        w.finish({ "candidate.queueForProduction": 1, "candidate.orderUnits": 1 });
        w.uninstall();
    });
    it("rejects unknown orders and malformed targets before original forwarding", () => {
        const f = world(),
            w = new S1ActionWindows(names),
            original = vi.fn();
        f.actions.orderUnits = original;
        w.install("candidate", f.actions, f.game);
        expect(() => f.actions.orderUnits([1], 19)).toThrow(/unknown/);
        expect(original).not.toHaveBeenCalled();
        w.uninstall();
    });
    it("rejects late same-tick action and inconsistent final call totals", () => {
        const f = world(),
            w = new S1ActionWindows(names);
        w.install("candidate", f.actions, f.game);
        w.install("baseline", f.other, f.game);
        w.take(0);
        expect(() => f.actions.quitGame()).toThrow(/clock/);
        expect(() => w.finish({ "candidate.quitGame": 1 })).toThrow(/conservation/);
        w.uninstall();
    });
    it("deduplicates events only within identical tick and event values", () => {
        const f = world(),
            w = new S1ActionWindows(names);
        w.install("candidate", f.actions, f.game);
        w.install("baseline", f.other, f.game);
        w.take(0);
        const e: any = { type: 2, target: 1 };
        w.observeEvent(1, e);
        w.observeEvent(1, e);
        w.observeEvent(2, e);
        const s = w.take(300);
        expect(s.events).toHaveLength(2);
        w.finish({});
        w.uninstall();
    });
    it("captures all mandatory channels and exact periodic samples", () => {
        const s = samples(3600);
        expect(s).toHaveLength(13);
        validateS1Sequence(s, 3600);
        expect(s[0].players.candidate.queues).toHaveLength(6);
        expect(s[0].units).toHaveLength(10);
        expect(s[0].missions[0]).not.toHaveProperty("handle");
        expect(s[1].missions[0].sampledAgeLowerBound).toBe(300);
    });
    it("retains nonperiodic final without duplication and without counting it as periodic", () => {
        const s = samples(1250);
        expect(s.map((x) => x.tick)).toEqual([0, 300, 600, 900, 1200, 1250]);
        expect(s[s.length - 1]?.periodic).toBe(false);
        expect(analyzeS1Episode(s, 1250).periodicSamples).toBe(4);
    });
    it("uses observer-owned identity so a replacement with the same name has age zero", () => {
        const s = samples(600, (f, t) => {
            if (t === 300) f.handles[0] = {};
        });
        expect(s[0].missions[0].id).toBe(0);
        expect(s[1].missions[0].id).toBe(1);
        expect(s[1].missions[0].sampledAgeLowerBound).toBe(0);
        validateS1Sequence(s, 600);
    });
    it("preserves unavailable optional fields without coercion to zero/false", () => {
        const s = samples(300, (f) => {
            delete f.units[0].purchaseValue;
            delete f.units[0].canMove;
            delete f.units[0].isIdle;
        });
        expect(s[1].units[0].purchaseValue).toBe(null);
        expect(s[1].units[0].canMove).toBe(null);
        expect(deriveS1Sample(s[1]).flags.idleForce).toBe(null);
        expect(
            deriveS1Sample(s[1]).sides.candidate.composition.find((x) => x.rulesName === "MTNK").missingPurchaseValue,
        ).toBe(1);
    });
    it("does not treat absent weapon data as known unarmed without observed rule slots", () => {
        const s = samples(300, (f) => {
            delete f.units[9].rules.primary;
            delete f.units[9].primaryWeapon;
            delete f.units[9].secondaryWeapon;
        });
        expect(deriveS1Sample(s[1]).flags.unopposedCloseout).toBe(null);
    });
    it("uses the literal public mobility predicate without silently imputing a missing flag", () => {
        const unit = samples(300)[1].units[0];
        expect(mobileS1({ ...unit, type: 2, canMove: true })).toBe(true);
        expect(mobileS1({ ...unit, type: 2, canMove: null })).toBe(null);
    });
    it("screens four consecutive periodic samples, not the initial sample or elapsed duration", () => {
        expect(analyzeS1Episode(samples(900), 900).screens.idleForce.anyFourSampleScreen).toBe(false);
        const a = analyzeS1Episode(samples(1200), 1200);
        for (const r of Object.values(a.screens)) {
            expect(r.anyFourSampleScreen).toBe(true);
            expect(r.maxConsecutivePeriodicSamples).toBe(4);
        }
    });
    it("resets runs on missing/ineligible readings", () => {
        const s = samples(1500, (f, t) => {
            if (t === 900) delete f.units[0].isIdle;
            else f.units[0].isIdle = true;
        });
        const a = analyzeS1Episode(s, 1500);
        expect(a.screens.idleForce.anyFourSampleScreen).toBe(false);
        expect(a.screens.idleForce.unavailableSamples).toBe(1);
    });
    it("requires the same mission identity for a four-sample dispersion screen", () => {
        const a = analyzeS1Episode(
            samples(1200, (f, t) => {
                if (t > 0) f.handles[0] = {};
            }),
            1200,
        );
        expect(a.screens.dispersedMission.trueSamples).toBe(4);
        expect(a.screens.dispersedMission.maxConsecutivePeriodicSamples).toBe(1);
        expect(a.screens.dispersedMission.anyFourSampleScreen).toBe(false);
    });
    it("does not count initial mission membership as observed additions", () => {
        const a = analyzeS1Episode(samples(300), 300);
        expect(a.membership[0].added).toBe(null);
        expect(a.membership[1].added).toBe(0);
    });
    it("does not add an active-mission eligibility condition to the frozen dispersion screen", () => {
        const s = samples(1200);
        for (const sample of s) sample.missions[0].active = false;
        expect(analyzeS1Episode(s, 1200).screens.dispersedMission.anyFourSampleScreen).toBe(true);
    });
    it("uses readiness, power and the vehicle queue rather than credits alone", () => {
        const s = samples(300, (f) => {
            f.units[8].isPoweredOn = false;
        });
        expect(deriveS1Sample(s[1]).flags.fundedEmptyVehicleQueue).toBe(false);
        s[1].units[8].isPoweredOn = null;
        expect(deriveS1Sample(s[1]).flags.fundedEmptyVehicleQueue).toBe(null);
    });
    it("excludes harvesters and non-live records without losing census counts", () => {
        const s = samples(300, (f) => {
            f.units[0].rules.name = "HARV";
            f.units[1].hitPoints = 0;
        });
        expect(s[1].units).toHaveLength(9);
        expect(s[1].unitCoverage.nonLive).toBe(1);
        expect(deriveS1Sample(s[1]).sides.candidate.excludedHarvesters).toBe(1);
        expect(deriveS1Sample(s[1]).sides.candidate.mobile).toBe(6);
    });
    it("does not mutate mission membership or source unit records", () => {
        const f = world(),
            w = new S1ActionWindows(names),
            s = new S1Sampler(names),
            before = structuredClone(f.units);
        w.install("candidate", f.actions, f.game);
        w.install("baseline", f.other, f.game);
        const record = s.capture(f.game, { candidate: f.prod, baseline: f.prod }, f.missions, w.take(0));
        record.units[0].x = 999;
        record.missions[0].unitIds.push(99);
        expect(f.units).toEqual(before);
        expect(f.missions()[0].unitIds).toHaveLength(8);
        w.finish({});
        w.uninstall();
    });
    it("rejects incomplete sampling grids and extra fields", () => {
        const s = samples();
        expect(() => validateS1Sequence(s.slice(1), 1200)).toThrow();
        expect(() => validateS1Sample({ ...s[0], extra: true })).toThrow();
    });
    it("rejects inconsistent public-call, order and target window counts", () => {
        const s = samples(300);
        s[1].window.calls = 1;
        expect(() => validateS1Sample(s[1])).toThrow(/conservation/);
    });
    it("rejects nonfinite public measurements, missing units, duplicate IDs and enum drift", () => {
        for (const alter of [
            (f: any) => (f.game.getPlayerData = () => ({ country: { name: "Americans" }, credits: NaN })),
            (f: any) => (f.game.getUnitData = () => undefined),
            (f: any) => (f.game.getAllUnits = () => [1, 1]),
            (f: any) => (f.prod.getQueueData = () => ({ type: 99 })),
        ])
            expect(() => samples(300, alter)).toThrow();
    });
    it("round-trips the complete strategic gzip ledger and reconstructed diagnostics", () => {
        const s = samples(),
            encoded = encodeS1Ledger(s, { caseIndex: 0, requestedEngineSeed: 3350120000, maxUpdates: 24000 }, 1200, {
                sha256: "a".repeat(64),
                bySideAndMethod: {},
            }),
            r = replayS1Ledger(encoded.ledger);
        expect(r.samples).toEqual(s);
        expect(r.analysis).toEqual(encoded.analysis);
        expect(r.analysis.screens.idleForce.anyFourSampleScreen).toBe(true);
    });
    it("rejects ledger checksum, size, seed, and action-conservation drift", () => {
        const s = samples(),
            binding = { caseIndex: 0, requestedEngineSeed: 3350120000, maxUpdates: 24000 as const },
            p = { sha256: "a".repeat(64), bySideAndMethod: {} };
        const { ledger } = encodeS1Ledger(s, binding, 1200, p);
        expect(() => replayS1Ledger({ ...ledger, gzipSha256: "0".repeat(64) })).toThrow();
        expect(() => replayS1Ledger({ ...ledger, plainBytes: S1_LEDGER_LIMITS.plainBytes + 1 })).toThrow();
        expect(() => encodeS1Ledger(s, { ...binding, requestedEngineSeed: 1 }, 1200, p)).toThrow(/seed/);
        expect(() =>
            encodeS1Ledger(s, binding, 1200, { ...p, bySideAndMethod: { "candidate.orderUnits": 1 } }),
        ).toThrow(/conservation/);
    });
});
