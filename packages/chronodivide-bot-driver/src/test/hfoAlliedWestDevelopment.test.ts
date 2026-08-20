import { describe, expect, it } from "vitest";
import {
    HFO_ALLIED_WEST_GUARD_VARIANTS,
    HFO_ALLIED_WEST_REPLICATION_ARMS,
    HFO_ALLIED_WEST_VARIANTS,
} from "../training/hfoAlliedWestDevelopment.js";

describe("HFO Allied west development variants", () => {
    it("keeps the prospectively fixed declaration order", () => {
        expect(HFO_ALLIED_WEST_VARIANTS.map((variant) => variant.id)).toEqual([
            "default",
            "rush_tanks",
            "rush_infantry",
            "rush_assault",
            "antiinf_assault",
            "rush_assault_pillbox",
        ]);
    });

    it("isolates plan, composition, and pillbox mechanisms", () => {
        const byId = Object.fromEntries(HFO_ALLIED_WEST_VARIANTS.map((variant) => [variant.id, variant]));
        expect(byId.default.strategyOptions).toEqual({});
        expect(byId.rush_tanks.strategyOptions).toEqual({ strategicPlan: { enabled: true, plan: "rush" } });
        expect(byId.rush_infantry.strategyOptions.base?.attackCompositionPolicy).toBe("infantry");
        expect(byId.rush_assault.strategyOptions.base?.attackCompositionPolicy).toBe("assault");
        expect(byId.antiinf_assault.strategyOptions.strategicPlan?.plan).toBe("otmqAntiInfantry");
        expect(byId.rush_assault_pillbox.strategyOptions).toMatchObject({
            strategicPlan: { enabled: true, plan: "rush" },
            base: { attackCompositionPolicy: "assault" },
            staticDefenseBoost: {
                enabled: true,
                hfoBottomOnly: false,
                startTick: 2_700,
                targetCount: 2,
                priority: 132,
                placementAnchors: [{ x: 50, y: 91 }, { x: 54, y: 95 }],
            },
        });
    });

    it("freezes the V2 group-guard mechanisms independently", () => {
        expect(HFO_ALLIED_WEST_GUARD_VARIANTS.map((variant) => variant.id)).toEqual([
            "default",
            "rush_tanks",
            "hfo_guard_hold_9600",
            "rush_guard_hold_9600",
            "rush_guard_group_9600",
            "rush_guard_hold_12000",
        ]);
        const byId = Object.fromEntries(HFO_ALLIED_WEST_GUARD_VARIANTS.map((variant) => [variant.id, variant]));
        expect(byId.default.botOptions).toBeUndefined();
        expect(byId.rush_tanks.botOptions).toBeUndefined();
        expect(byId.hfo_guard_hold_9600.strategyOptions).toEqual({});
        expect(byId.rush_guard_hold_9600.strategyOptions.strategicPlan?.plan).toBe("rush");
        expect(byId.rush_guard_hold_9600.botOptions?.hfoWestHomeGuard).toMatchObject({
            enabled: true,
            untilTick: 9_600,
            radius: 72,
            engageCombatantAdvantage: 0,
            alliedOnly: true,
        });
        expect(byId.rush_guard_group_9600.botOptions?.hfoWestHomeGuard?.engageCombatantAdvantage).toBe(-4);
        expect(byId.rush_guard_hold_12000.botOptions?.hfoWestHomeGuard?.untilTick).toBe(12_000);

    });
    it("replicates the winner through a conditional profile", () => {
        expect(HFO_ALLIED_WEST_REPLICATION_ARMS.map((variant) => variant.id)).toEqual([
            "default",
            "winner_conditional",
        ]);
        const winner = HFO_ALLIED_WEST_REPLICATION_ARMS[1];
        expect(winner.strategyOptions).toEqual({ hfoAlliedWestProfile: true });
        expect(winner.botOptions?.hfoWestHomeGuard).toEqual({
            enabled: true,
            untilTick: 9_600,
            radius: 72,
            orderIntervalTicks: 6,
            engageMinCombatants: 4,
            engageCombatantAdvantage: 0,
            alliedOnly: true,
        });
    });
});
