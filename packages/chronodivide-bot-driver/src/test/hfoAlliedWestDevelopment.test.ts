import { describe, expect, it } from "vitest";
import { HFO_ALLIED_WEST_VARIANTS } from "../training/hfoAlliedWestDevelopment.js";

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
});
