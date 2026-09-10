import { describe, expect, it } from "vitest";
import {
    buildUnifiedIntentGate3DiagnosticPlan,
    UNIFIED_INTENT_GATE3_DIAGNOSTIC_SEED_BASE,
    validateUnifiedIntentGate3DiagnosticPlan,
} from "../training/unifiedIntentGate3DiagnosticPlan.js";
import { UnifiedIntentGate3Map } from "../training/unifiedIntentGate3Plan.js";

const maps = (): UnifiedIntentGate3Map[] => ["hfo-le", "tour-of-egypt"].map(
    (id, index) => ({
        id,
        label: id,
        fileName: id + ".map",
        absolutePath: "/maps/" + id + ".map",
        sha256: index.toString(16).padStart(64, "0"),
        starts: [index + ",1", index + ",2"],
        advancedEligible: id === "hfo-le",
    }),
);

describe("unified intent Gate 3 A1 diagnostic plan", () => {
    it("builds the exact complete 72-case and 288-task crossing", () => {
        const plan = buildUnifiedIntentGate3DiagnosticPlan(maps());
        expect(plan.counts).toEqual({
            maps: 2,
            cases: 72,
            tasks: 288,
            arms: 4,
            distinctSeeds: 72,
        });
        expect(new Set(plan.cases.map((value) => [
            value.mapId,
            value.directionOrdinal,
            value.country,
            value.candidateSlot,
        ].join("|"))).size).toBe(72);
    });

    it("uses one fresh seed per case shared across four separate arm tasks", () => {
        const plan = buildUnifiedIntentGate3DiagnosticPlan(maps());
        expect(plan.cases[0].requestedEngineSeed)
            .toBe(UNIFIED_INTENT_GATE3_DIAGNOSTIC_SEED_BASE);
        expect(plan.cases[71].requestedEngineSeed)
            .toBe(UNIFIED_INTENT_GATE3_DIAGNOSTIC_SEED_BASE + 71);
        for (const caseValue of plan.cases) {
            expect(plan.tasks.filter((value) => value.caseIndex === caseValue.caseIndex))
                .toHaveLength(4);
        }
    });

    it("fails closed on task or arm drift", () => {
        const plan = buildUnifiedIntentGate3DiagnosticPlan(maps());
        plan.tasks[1].armOrdinal = 3;
        expect(() => validateUnifiedIntentGate3DiagnosticPlan(plan)).toThrow(/task/);
    });
});
