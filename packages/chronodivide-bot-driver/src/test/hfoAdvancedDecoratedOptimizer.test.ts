import { describe, expect, it, vi } from "vitest";
import { decorateExternalBaselineLifecycle } from "../training/externalBaselineLifecycleDecorator.js";
import { HFO_ADVANCED_V5_CANDIDATES, HFO_ADVANCED_V5_COUNTRIES, HFO_ADVANCED_V5_POPULATIONS,
    HFO_ADVANCED_V5_SPEC, sampledAdvancedWestCandidates } from "../training/hfoAdvancedDecoratedOptimizer.js";

describe("HFO Advanced decorated-baseline optimizer V5", () => {
    it("freezes the master selection and equivalence design", () => {
        expect(HFO_ADVANCED_V5_SPEC).toEqual({ maxOffsets: 100, maxTicks: 90_000, snapshotInterval: 60,
            selectedCaseCount: 954, equivalenceCaseCount: 72, equivalenceArmCount: 2, equivalenceTaskCount: 144 });
        expect(HFO_ADVANCED_V5_COUNTRIES).toHaveLength(9);
        expect(HFO_ADVANCED_V5_POPULATIONS).toHaveLength(12);
        expect(HFO_ADVANCED_V5_POPULATIONS.map((row) => row.id)).toEqual([
            "equivalence", "run-0-stage-0", "run-1-stage-0", "run-2-stage-0",
            "run-0-stage-1", "run-1-stage-1", "run-2-stage-1",
            "run-0-stage-2", "run-1-stage-2", "run-2-stage-2", "championship", "replication",
        ]);
        const cases = HFO_ADVANCED_V5_POPULATIONS.reduce((total, row) =>
            total + 9 * row.starts.length * 2 * row.casesPerCell, 0);
        expect(cases).toBe(HFO_ADVANCED_V5_SPEC.selectedCaseCount);
        expect(Math.max(...HFO_ADVANCED_V5_POPULATIONS.map((row) => row.seedBase + 8 * 10_000 +
            3 * 1_000 + 100 + 99))).toBeLessThan(2 ** 32);
    });

    it("freezes 324 candidates and deterministic run samples", () => {
        expect(HFO_ADVANCED_V5_CANDIDATES).toHaveLength(324);
        for (const run of [0, 1, 2]) {
            const first = sampledAdvancedWestCandidates(run), second = sampledAdvancedWestCandidates(run);
            expect(first).toHaveLength(24); expect(first).toEqual(second);
            expect(new Set(first.map((row) => JSON.stringify(row))).size).toBe(24);
        }
        expect(() => sampledAdvancedWestCandidates(3)).toThrow("Invalid V5 optimizer run");
    });

    it("calls the pinned lifecycle before overlay callbacks and rejects double decoration", () => {
        const order: string[] = [];
        const bot = {
            onGameStart: vi.fn(() => order.push("baseline-start")),
            onGameTick: vi.fn(() => order.push("baseline-tick")),
            onGameEvent: vi.fn(() => order.push("baseline-event")),
        } as any;
        decorateExternalBaselineLifecycle(bot, {
            afterGameStart: () => { order.push("overlay-start"); },
            afterGameTick: () => { order.push("overlay-tick"); },
            afterGameEvent: () => { order.push("overlay-event"); },
        });
        bot.onGameStart({}); bot.onGameTick({}); bot.onGameEvent({});
        expect(order).toEqual(["baseline-start", "overlay-start", "baseline-tick", "overlay-tick",
            "baseline-event", "overlay-event"]);
        expect(() => decorateExternalBaselineLifecycle(bot, {})).toThrow("already decorated");
    });

    it("makes an empty decorator a lifecycle no-op", () => {
        const calls = { start: 0, tick: 0, event: 0 };
        const bot = {
            onGameStart: () => { calls.start += 1; }, onGameTick: () => { calls.tick += 1; },
            onGameEvent: () => { calls.event += 1; },
        } as any;
        decorateExternalBaselineLifecycle(bot, {});
        bot.onGameStart({}); bot.onGameTick({}); bot.onGameEvent({});
        expect(calls).toEqual({ start: 1, tick: 1, event: 1 });
    });
});
