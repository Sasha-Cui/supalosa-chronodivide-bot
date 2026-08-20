import { describe, expect, it } from "vitest";
import {
    HFO_BOTTOM_REPLICATION_ARMS,
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
});
