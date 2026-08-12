import { describe, expect, test } from "vitest";
import {
    METHOD_V3_STAGE2_COUNTRY_COUNTS,
    METHOD_V3_STAGE2_FAMILY_COUNTS,
    METHOD_V3_STAGE2_RECOVERY_V1_ENGINE_SEED_BASE,
    rankMethodV3Stage2Countries,
    selectMethodV3Stage2Schedule,
} from "../training/methodV3Stage2Schedule.js";
import { RoleTarget } from "../training/researchPlanRunner.js";

const targets = Array.from({ length: 22 }, (_, index): RoleTarget => ({
    familyId: `family_${index}`,
    representative: { path: `/private/family_${index}.map`, sha256: `${index}`.padStart(64, "0") },
    descriptors: { startCount: 2 },
}));

describe("method-v3 Stage-2 nested schedule", () => {
    test("nests family and country schedules within each optimizer run", () => {
        for (let runIndex = 0; runIndex < 5; runIndex++) {
            const schedules = ([0, 1, 2] as const).map((stage) =>
                selectMethodV3Stage2Schedule(targets, runIndex, stage),
            );
            schedules.forEach((schedule, stage) => {
                expect(schedule.families).toHaveLength(METHOD_V3_STAGE2_FAMILY_COUNTS[stage]);
                expect(schedule.countries).toHaveLength(METHOD_V3_STAGE2_COUNTRY_COUNTS[stage]);
            });
            expect(schedules[1].families.slice(0, 6)).toEqual(schedules[0].families);
            expect(schedules[2].families.slice(0, 12)).toEqual(schedules[1].families);
            expect(schedules[1].countries.slice(0, 3)).toEqual(schedules[0].countries);
            expect(schedules[2].countries.slice(0, 6)).toEqual(schedules[1].countries);
            expect(schedules[2].countries).toEqual(rankMethodV3Stage2Countries(runIndex));
            expect(new Set(schedules.map(({ engineSeedBase }) => engineSeedBase)).size).toBe(3);
        }
    });

    test("gives all five runs disjoint seed domains and varying early country subsets", () => {
        const bases = new Set<number>();
        const countrySubsets = new Set<string>();
        for (let runIndex = 0; runIndex < 5; runIndex++) {
            for (const stage of [0, 1, 2] as const) {
                const schedule = selectMethodV3Stage2Schedule(targets, runIndex, stage);
                expect(bases.has(schedule.engineSeedBase)).toBe(false);
                bases.add(schedule.engineSeedBase);
                if (stage === 0) countrySubsets.add(schedule.countries.join(","));
            }
        }
        expect(countrySubsets.size).toBeGreaterThan(1);
    });

    test("uses a fresh, narrowly scoped domain for complete-stage recovery", () => {
        for (const runIndex of [0, 3]) {
            const primary = selectMethodV3Stage2Schedule(targets, runIndex, 2);
            const recovery = selectMethodV3Stage2Schedule(targets, runIndex, 2, "stage2-recovery-v1");
            expect(recovery.families).toEqual(primary.families);
            expect(recovery.countries).toEqual(primary.countries);
            expect(recovery.engineSeedBase).toBe(
                METHOD_V3_STAGE2_RECOVERY_V1_ENGINE_SEED_BASE + runIndex * 10_000_000 + 2_000_000,
            );
            expect(recovery.engineSeedBase).not.toBe(primary.engineSeedBase);
        }
        expect(() => selectMethodV3Stage2Schedule(targets, 1, 2, "stage2-recovery-v1")).toThrow();
        expect(() => selectMethodV3Stage2Schedule(targets, 0, 1, "stage2-recovery-v1")).toThrow();
    });
});
