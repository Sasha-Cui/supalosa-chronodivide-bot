import { describe, expect, it, vi } from "vitest";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { buildFinishAdvantageIrreversiblePolicy } from "../training/finishAdvantagePolicy.js";
import { FinishAdvantageStrategy } from "../training/finishAdvantageStrategy.js";
import { createFinishAdvantageCompositeCandidate } from "../training/finishAdvantageCompositeCandidate.js";
import { buildProgressCertifiedConversionPolicyV5 } from "../training/progressCertifiedConversionPolicyV5.js";
import { TerminalObjectiveStrategy } from "../training/terminalObjectiveStrategy.js";

const factoryHarness = () => {
    let inner: any;
    inner = { onAiUpdate: vi.fn(() => inner) };
    const baseline = { kind: "exact-baseline" };
    let installed: unknown = null;
    const factory = {
        create: vi.fn(() => baseline),
        createDefaultStrategy: vi.fn(() => inner),
        createWithStrategy: vi.fn((_name, _country, strategy) => {
            installed = strategy;
            return { kind: "composite" };
        }),
    };
    return { factory, baseline, inner, installed: () => installed };
};

describe("finish-advantage composite candidate", () => {
    it("returns the exact baseline construction path when both overlays are disabled", () => {
        const harness = factoryHarness();
        const result = createFinishAdvantageCompositeCandidate(
            harness.factory as any,
            "candidate",
            Countries.USA,
            buildProgressCertifiedConversionPolicyV5({ enabled: false }),
            buildFinishAdvantageIrreversiblePolicy({ enabled: false }),
            { terminalBaseRaceMode: "legacy_v5_ignore_own_base_loss" },
        );
        expect(result).toBe(harness.baseline);
        expect(harness.factory.create).toHaveBeenCalledWith("candidate", Countries.USA);
        expect(harness.factory.createDefaultStrategy).not.toHaveBeenCalled();
        expect(harness.factory.createWithStrategy).not.toHaveBeenCalled();
    });

    it("installs exact Supalosa, then finish advantage, then termination-aware V5", () => {
        const harness = factoryHarness();
        createFinishAdvantageCompositeCandidate(
            harness.factory as any,
            "candidate",
            Countries.USA,
            buildProgressCertifiedConversionPolicyV5({
                enabled: true,
                conversionScope: "final_building_only",
                terminalReserveCombatants: 0,
            }),
            buildFinishAdvantageIrreversiblePolicy({ enabled: true }),
            { terminalBaseRaceMode: "strict_literal_endpoint_base_race" },
        );
        const outer = harness.installed();
        expect(outer).toBeInstanceOf(TerminalObjectiveStrategy);
        expect((outer as any).terminalBaseRaceMode).toBe("strict_literal_endpoint_base_race");
        const middle = (outer as any).inner;
        expect(middle).toBeInstanceOf(FinishAdvantageStrategy);
        expect((middle as any).inner).toBe(harness.inner);
    });

    it("does not instantiate the middle layer for the V5 ablation", () => {
        const harness = factoryHarness();
        createFinishAdvantageCompositeCandidate(
            harness.factory as any,
            "candidate",
            Countries.IRAQ,
            buildProgressCertifiedConversionPolicyV5({ enabled: true }),
            buildFinishAdvantageIrreversiblePolicy({ enabled: false }),
            { terminalBaseRaceMode: "legacy_v5_ignore_own_base_loss" },
        );
        const outer = harness.installed();
        expect(outer).toBeInstanceOf(TerminalObjectiveStrategy);
        expect((outer as any).terminalBaseRaceMode).toBe("legacy_v5_ignore_own_base_loss");
        expect((outer as any).inner).toBe(harness.inner);
    });

    it("does not instantiate V5 for the finish-only structural ablation", () => {
        const harness = factoryHarness();
        createFinishAdvantageCompositeCandidate(
            harness.factory as any,
            "candidate",
            Countries.CUBA,
            buildProgressCertifiedConversionPolicyV5({ enabled: false }),
            buildFinishAdvantageIrreversiblePolicy({ enabled: true }),
            { terminalBaseRaceMode: "strict_literal_endpoint_base_race" },
        );
        expect(harness.installed()).toBeInstanceOf(FinishAdvantageStrategy);
        expect((harness.installed() as any).inner).toBe(harness.inner);
    });
});
