import { ObjectType, QueueStatus, QueueType } from "@chronodivide/game-api";
import { describe, expect, it, vi } from "vitest";
import { HFO_ADVANCED_V6_COMPETITIVE_ARMS, HFO_ADVANCED_V6_COMPETITIVE_COUNTRIES,
    HFO_ADVANCED_V6_COMPETITIVE_POPULATIONS, HFO_ADVANCED_V6_COMPETITIVE_SPEC,
    createV6CompetitiveOverlay, v6StageArms } from
    "../training/hfoAdvancedEarlyProductionCompetitive.js";

const fixture = (candidateStart: { x: number; y: number }, tick = 1_200) => {
    const infantry = { name: "E1", type: ObjectType.Infantry }, tank = { name: "MTNK", type: 0 };
    const spies = { queueForProduction: vi.fn(), unqueueFromProduction: vi.fn(), pauseProduction: vi.fn(),
        resumeProduction: vi.fn(), orderUnits: vi.fn(), quitGame: vi.fn() }, actions = { ...spies },
        production = { getAvailableObjects: (queue: QueueType) => queue === QueueType.Infantry ? [infantry] :
            queue === QueueType.Vehicles ? [tank] : [],
        getQueueData: (queue: QueueType) => ({ type: queue, status: QueueStatus.Idle, items: [] }) },
        bot = { lastPlayerActions: actions, lastPlayerProduction: production } as any,
        game = { getCurrentTick: () => tick,
            getPlayerData: (name: string) => ({ startLocation: name === "first" ? candidateStart :
                candidateStart.x === 39 ? { x: 151, y: 119 } : { x: 39, y: 82 } }),
            getVisibleUnits: () => [], getUnitData: () => undefined } as any;
    return { spies, bot, game };
};

describe("HFO Advanced V6 competitive design", () => {
    it("freezes all populations, arms, and maximum stage counts", () => {
        expect(HFO_ADVANCED_V6_COMPETITIVE_COUNTRIES).toHaveLength(9);
        expect(HFO_ADVANCED_V6_COMPETITIVE_ARMS).toEqual([
            "noop", "infantry_rush", "tank_rush", "dual_rush", "tank_production_only", "vehicle_assault",
        ]);
        expect(HFO_ADVANCED_V6_COMPETITIVE_POPULATIONS.map((row) => [row.id, row.seedBase,
            row.starts.length, row.casesPerCell])).toEqual([
            ["development", 4_278_000_000, 1, 2], ["validation", 4_279_000_000, 4, 1],
            ["replication", 4_280_000_000, 4, 5],
        ]);
        expect(HFO_ADVANCED_V6_COMPETITIVE_SPEC).toEqual({ maxOffsets: 100, maxUpdates: 90_000,
            selectionCaseCount: 468, stage0CaseCount: 36, stage0ArmCount: 6, stage0TaskCount: 216,
            stage1CaseCount: 72, stage2CaseCount: 360, clusterCount: 36, clusterTCritical: 1.68957 });
        const selected = HFO_ADVANCED_V6_COMPETITIVE_POPULATIONS.reduce((total, row) =>
            total + 9 * row.starts.length * 2 * row.casesPerCell, 0);
        expect(selected).toBe(468);
    });

    it("keeps every intervention inert at non-west starts", () => {
        for (const id of HFO_ADVANCED_V6_COMPETITIVE_ARMS) {
            const f = fixture({ x: 151, y: 119 }, 7_200), overlay =
                createV6CompetitiveOverlay(id, "Americans" as any, "first", "opponent");
            overlay.afterGameStart?.(f.game, f.bot); overlay.afterGameTick?.(f.game, f.bot);
            expect(f.spies.queueForProduction).not.toHaveBeenCalled();
            expect(f.spies.unqueueFromProduction).not.toHaveBeenCalled();
            expect(f.spies.orderUnits).not.toHaveBeenCalled();
        }
    });

    it("uses the exact tested infantry production behavior at west", () => {
        const f = fixture({ x: 39, y: 82 }), overlay =
            createV6CompetitiveOverlay("infantry_rush", "Americans" as any, "first", "opponent");
        overlay.afterGameStart?.(f.game, f.bot); overlay.afterGameTick?.(f.game, f.bot);
        expect(f.spies.queueForProduction).toHaveBeenCalledWith(QueueType.Infantry, "E1", ObjectType.Infantry, 1);
        expect(f.spies.unqueueFromProduction).not.toHaveBeenCalled();
    });

    it("binds later stages to immutable survivors and one champion", () => {
        expect(v6StageArms(0, null)).toEqual(HFO_ADVANCED_V6_COMPETITIVE_ARMS);
        expect(v6StageArms(1, { survivors: [{ id: "dual_rush" }, { id: "infantry_rush" }] }))
            .toEqual(["noop", "dual_rush", "infantry_rush"]);
        expect(v6StageArms(2, { champion: { id: "dual_rush" } })).toEqual(["noop", "dual_rush"]);
        expect(() => v6StageArms(1, { survivors: [] })).toThrow("survivors drifted");
        expect(() => v6StageArms(2, { champion: null })).toThrow("champion drifted");
    });
});
