import { describe, expect, it } from "vitest";
import { V8_POPULATIONS, V8_SELECTION_CASE_COUNT, V8_TECHNICAL_ARMS, V8_TECHNICAL_TRACE_UPDATES, V8_TECHNICAL_CASE_COUNT,
    V8_TECHNICAL_FIXTURE_IDS, V8_TECHNICAL_TASK_COUNT, v8PopulationCounts, v8TechnicalAssignment } from
    "../training/hfoAdvancedStateConditionedV8Technical.js";

describe("HFO Advanced V8 technical campaign", () => {
    it("freezes every selector population and exact 1620-case total", () => {
        expect(V8_POPULATIONS.map((row) => [row.id, row.seedBase, row.starts.length, row.casesPerCell,
            row.opponent])).toEqual([
            ["technical", 3_100_000_000, 1, 1, "both"],
            ["run-0-generation-0", 3_101_000_000, 1, 1, "advanced"],
            ["run-1-generation-0", 3_102_000_000, 1, 1, "advanced"],
            ["run-2-generation-0", 3_103_000_000, 1, 1, "advanced"],
            ["run-0-generation-1", 3_104_000_000, 1, 2, "advanced"],
            ["run-1-generation-1", 3_105_000_000, 1, 2, "advanced"],
            ["run-2-generation-1", 3_106_000_000, 1, 2, "advanced"],
            ["run-0-generation-2", 3_107_000_000, 4, 1, "advanced"],
            ["run-1-generation-2", 3_108_000_000, 4, 1, "advanced"],
            ["run-2-generation-2", 3_109_000_000, 4, 1, "advanced"],
            ["championship", 3_110_000_000, 4, 2, "advanced"],
            ["replication", 3_111_000_000, 4, 5, "advanced"],
            ["adaptive-advanced", 3_112_000_000, 4, 5, "advanced"],
            ["adaptive-supalosa", 3_113_000_000, 4, 5, "supalosa"],
        ]);
        const counts = v8PopulationCounts();
        expect(Object.values(counts).reduce((sum, value) => sum + value, 0)).toBe(V8_SELECTION_CASE_COUNT);
        expect(counts).toMatchObject({ technical: 18, championship: 144, replication: 360,
            "adaptive-advanced": 360, "adaptive-supalosa": 360 });
    });

    it("maps all 234 tasks over six fixtures, two opponents, and one control", () => {
        expect(V8_TECHNICAL_FIXTURE_IDS).toEqual(["fallback_only", "defense", "recover", "mixed", "raid", "closeout"]);
        expect(V8_TECHNICAL_CASE_COUNT).toBe(18);
        expect(V8_TECHNICAL_TRACE_UPDATES).toBe(9_600);
        expect(V8_TECHNICAL_ARMS).toHaveLength(13);
        expect(V8_TECHNICAL_TASK_COUNT).toBe(234);
        expect(v8TechnicalAssignment(0)).toMatchObject({ armIndex: 0, caseIndex: 0,
            arm: { id: "advanced-fallback_only", opponent: "advanced", decorated: true } });
        expect(v8TechnicalAssignment(107)).toMatchObject({ armIndex: 5, caseIndex: 17,
            arm: { id: "advanced-closeout" } });
        expect(v8TechnicalAssignment(108)).toMatchObject({ armIndex: 6, caseIndex: 0,
            arm: { id: "supalosa-fallback_only", opponent: "supalosa", decorated: true } });
        expect(v8TechnicalAssignment(233)).toMatchObject({ armIndex: 12, caseIndex: 17,
            arm: { id: "supalosa-control", decorated: false } });
        expect(() => v8TechnicalAssignment(234)).toThrow("task index invalid");
    });
});
