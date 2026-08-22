import { describe, expect, it } from "vitest";
import {
    HFO_BOTTOM_REPLICATION_ARMS,
    HFO_BOTTOM_ALL_COUNTRY_REPLICATION_SPEC,
    HFO_BOTTOM_RETARGET_SAFETY_SPEC,
    HFO_BOTTOM_RETARGET_SAFETY_VARIANTS,
    HFO_KOREA_BOTTOM_DEFENSE_VARIANTS,
    HFO_KOREA_BOTTOM_REPLICATION_ARMS,
    HFO_BOTTOM_RETARGET_VARIANTS,
} from "../training/hfoBottomDevelopment.js";

describe("HFO bottom building-retarget variants", () => {
    it("keeps the frozen declaration order", () => {
        expect(HFO_BOTTOM_RETARGET_VARIANTS.map((variant) => variant.id)).toEqual([
            "default",
            "stalled_rotate_600",
            "stalled_rotate_1200",
            "round_robin_600",
            "top_first_600",
            "split_buildings",
        ]);
    });

    it("isolates target-rotation mechanisms", () => {
        const byId = Object.fromEntries(HFO_BOTTOM_RETARGET_VARIANTS.map((variant) => [variant.id, variant]));
        expect(byId.default.botOptions).toEqual({});
        expect(byId.stalled_rotate_600.botOptions.hfoBottomRetarget).toMatchObject({
            enabled: true,
            minTick: 42_000,
            maxEnemyBuildings: 6,
            maxEnemyCombatants: 4,
            stallTicks: 600,
            mode: "stalled_rotate",
        });
        expect(byId.stalled_rotate_1200.botOptions.hfoBottomRetarget?.stallTicks).toBe(1_200);
        expect(byId.round_robin_600.botOptions.hfoBottomRetarget?.mode).toBe("round_robin");
        expect(byId.top_first_600.botOptions.hfoBottomRetarget?.mode).toBe("top_first");
        expect(byId.split_buildings.botOptions.hfoBottomRetarget?.mode).toBe("split");
    });

    it("freezes the V2 paired replication arms", () => {
        expect(HFO_BOTTOM_REPLICATION_ARMS.map((variant) => variant.id)).toEqual([
            "default",
            "winner_retarget",
        ]);
        expect(HFO_BOTTOM_REPLICATION_ARMS[1].botOptions.hfoBottomRetarget).toMatchObject({
            enabled: true,
            mode: "stalled_rotate",
            stallTicks: 600,
            rotationTicks: 600,
        });
    });

    it("freezes the V5 all-country sample", () => {
        expect(HFO_BOTTOM_ALL_COUNTRY_REPLICATION_SPEC).toEqual({
            seedBase: 4_248_000_000,
            casesPerCountry: 30,
            maxTicks: 90_000,
        });
    });

    it("freezes the V6 safety margins and sample", () => {
        expect(HFO_BOTTOM_RETARGET_SAFETY_SPEC).toEqual({
            seedBase: 4_249_000_000,
            casesPerCountry: 8,
            maxTicks: 90_000,
        });
        expect(HFO_BOTTOM_RETARGET_SAFETY_VARIANTS.map((variant) => variant.id)).toEqual([
            "default",
            "current_retarget",
            "advantage_2",
            "advantage_4",
            "zero_enemy_combatants",
        ]);
        const byId = Object.fromEntries(HFO_BOTTOM_RETARGET_SAFETY_VARIANTS.map((variant) =>
            [variant.id, variant]));
        expect(byId.current_retarget.botOptions.hfoBottomRetarget).toMatchObject({
            combatantAdvantage: 0,
            maxEnemyCombatants: 4,
        });
        expect(byId.advantage_2.botOptions.hfoBottomRetarget?.combatantAdvantage).toBe(2);
        expect(byId.advantage_4.botOptions.hfoBottomRetarget?.combatantAdvantage).toBe(4);
        expect(byId.zero_enemy_combatants.botOptions.hfoBottomRetarget?.maxEnemyCombatants).toBe(0);
    });

    it("freezes the Korea defense mechanisms", () => {
        expect(HFO_KOREA_BOTTOM_DEFENSE_VARIANTS.map((variant) => variant.id)).toEqual([
            "retarget_control",
            "pillbox_2",
            "pillbox_4",
            "wide_guard",
            "pillbox_2_wide_guard",
            "pillbox_4_wide_guard",
        ]);
        const byId = Object.fromEntries(HFO_KOREA_BOTTOM_DEFENSE_VARIANTS.map((variant) => [variant.id, variant]));
        expect(byId.retarget_control.botOptions.hfoBottomRetarget?.enabled).toBe(true);
        expect(byId.pillbox_2.strategyOptions?.staticDefenseBoost?.targetCount).toBe(2);
        expect(byId.pillbox_4.strategyOptions?.staticDefenseBoost?.targetCount).toBe(4);
        expect(byId.wide_guard.botOptions.hfoBottomHomeGuard).toEqual({
            enabled: true,
            untilTick: 42_000,
            radius: 72,
            orderIntervalTicks: 6,
        });
        expect(byId.pillbox_2_wide_guard.strategyOptions?.staticDefenseBoost?.targetCount).toBe(2);
        expect(byId.pillbox_4_wide_guard.botOptions.hfoBottomHomeGuard?.untilTick).toBe(42_000);
    });

    it("freezes the Korea defense replication arms", () => {
        expect(HFO_KOREA_BOTTOM_REPLICATION_ARMS.map((variant) => variant.id)).toEqual([
            "retarget_control",
            "pillbox_2",
        ]);
        expect(HFO_KOREA_BOTTOM_REPLICATION_ARMS[1].strategyOptions?.staticDefenseBoost).toEqual({
            enabled: true,
            hfoBottomOnly: true,
            startTick: 5_400,
            targetCount: 2,
            priority: 132,
        });
    });
});
