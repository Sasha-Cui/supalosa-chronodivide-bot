import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const strongBotPath = path.resolve(
    process.cwd(),
    "../chronodivide-bot/src/bot/strongBot.ts",
);

const directOrderInventory = (source: string): Record<string, number> => {
    const result: Record<string, number> = {};
    let method = "";
    for (const line of source.split("\n")) {
        const declaration = /^    (?:private |public |protected |override )?(?:async )?([A-Za-z0-9_]+)\(/.exec(line);
        if (declaration) method = declaration[1];
        if (line.includes("this.player.actions.orderUnits(")) {
            result[method] = (result[method] ?? 0) + 1;
        }
    }
    return result;
};

describe("unified intent source inventory", () => {
    it("binds all 52 direct StrongBot sites in 29 routines", () => {
        const source = fs.readFileSync(strongBotPath, "utf8");
        expect(directOrderInventory(source)).toEqual({
            maybeOtmqFinalSweep: 1,
            orderOtmqNeCleanup: 1,
            orderOtmqFullMapCleanup: 1,
            maybeHfoBottomChokeIntercept: 1,
            maybeHfoBottomSiegeControl: 3,
            maybeHfoBottomTopBaseBreak: 1,
            maybeHfoBottomHomeGuard: 2,
            maybeHfoWestHomeGuard: 1,
            orderWeakStartHomeGuardUnits: 1,
            maybeWeakStartCloseout: 2,
            maybePeakCloseout: 1,
            maybeHfoSideCloseout: 1,
            maybeHfoBottomRetarget: 1,
            maybeHfoWestRetarget: 1,
            maybeHfoBottomPincer: 2,
            orderPincerGroupToWaypoint: 1,
            orderBottomDemolitionRoute: 1,
            prepareUnitsForAttackMove: 1,
            orderPreparedUnitsToNearestTargets: 2,
            orderGenericCloseoutTargets: 1,
            orderHfoBottomMopUpTargets: 2,
            executeStagedSweep: 4,
            maybeHfoCloseout: 3,
            maybeEmergencyDefend: 2,
            maybeRouteAttack: 4,
            maybeHarvesterHarass: 2,
            maybeHarass: 2,
            maybeIslandTechAttack: 3,
            maybeForceAttack: 4,
        });
    });

    it("binds every top-level tactic to the frozen semantic scope", () => {
        const source = fs.readFileSync(strongBotPath, "utf8");
        const pattern =
            /runIntentScope\("([^"]+)", \(\) => this\.(maybe[A-Za-z0-9_]+)\(game(?:, true)?\)\)/g;
        const observed = [...source.matchAll(pattern)].map((match) => match[1] + "|" + match[2]);
        expect(observed).toEqual([
            "objective_closeout|maybeHfoBottomRetarget",
            "objective_closeout|maybeHfoWestRetarget",
            "objective_closeout|maybeHfoBottomCriticalCleanup",
            "home_guard|maybeHfoBottomHomeGuard",
            "objective_closeout|maybeOtmqFinalSweep",
            "objective_closeout|maybeWeakStartCloseout",
            "tactical_assault|maybeWeakStartProxyAttack",
            "home_guard|maybeWeakStartHomeGuard",
            "objective_closeout|maybeWeakStartCloseout",
            "objective_closeout|maybePeakCloseout",
            "objective_closeout|maybeHfoSideCloseout",
            "terminal_objective|maybeWonGameCloseout",
            "emergency_defense|maybePeakEmergencyDefend",
            "home_guard|maybeHfoWestHomeGuard",
            "emergency_defense|maybeEmergencyDefend",
            "emergency_defense|maybeHfoBottomChokeIntercept",
            "emergency_defense|maybeHfoBottomSiegeControl",
            "tactical_assault|maybeHfoBottomTopBaseBreak",
            "terminal_objective|maybeHfoBottomLastBuildingCleanup",
            "terminal_objective|maybeHfoFinalBuildingAttack",
            "route_sweep|maybeHfoWestSweep",
            "route_sweep|maybeHfoEastSweep",
            "objective_closeout|maybeHfoBottomDesperationFinish",
            "objective_closeout|maybeHfoLateMopUp",
            "tactical_assault|maybeHfoBottomWestExpansionAttack",
            "tactical_assault|maybeHfoBottomPincer",
            "tactical_assault|maybeHfoBottomDemolition",
            "objective_closeout|maybeHfoBottomCloseout",
            "route_sweep|maybeHfoBottomSweep",
            "objective_closeout|maybeHfoCloseout",
            "tactical_assault|maybeIslandTechAttack",
            "route_sweep|maybeRouteAttack",
            "harassment|maybeHarvesterHarass",
            "harassment|maybeHarass",
            "tactical_assault|maybeWeakStartPressure",
            "tactical_assault|maybeForceAttack",
        ]);
        expect(source).toContain(
            'runIntentScope("baseline_core", () => super.onGameTick(game))',
        );
        expect(source).toContain(
            "if (boundary) this.lastUnifiedIntentTelemetry = boundary.flush();",
        );
    });
});
