import { describe, expect, test } from "vitest";
import { parseMethodV4LifecycleSacct, validateMethodV4ActualWin } from "../training/methodV4LifecycleTechnicalGate.js";

describe("method-v4 lifecycle technical gate", () => {
    test("accepts only complete successful pi_jss233 scheduler accounting", () => {
        const raw = Array.from({ length: 198 }, (_, index) =>
            `123_${index}|${9000 + index}|COMPLETED|0:0|pi_jss233`,
        ).join("\n");
        expect(parseMethodV4LifecycleSacct(raw, "123")).toHaveLength(198);
        expect(() => parseMethodV4LifecycleSacct(raw.replace("COMPLETED", "FAILED"), "123")).toThrow();
        expect(() => parseMethodV4LifecycleSacct(raw.replace("pi_jss233", "other"), "123")).toThrow();
    });

    test("requires literal terminal building elimination for either winner", () => {
        const base = {
            candidate: { buildings: 2 },
            baseline: { buildings: 0 },
            finished: true,
            winner: "candidate",
            candidateDefeated: false,
            baselineDefeated: true,
        };
        expect(() => validateMethodV4ActualWin(base, "e0")).not.toThrow();
        expect(() => validateMethodV4ActualWin({ ...base, baseline: { buildings: 1 } }, "e0")).toThrow();
        expect(() => validateMethodV4ActualWin({
            ...base,
            finished: false,
            winner: "draw",
            candidateDefeated: false,
            baselineDefeated: false,
            baseline: { buildings: 0 },
        }, "e1")).not.toThrow();
        expect(() => validateMethodV4ActualWin({
            ...base,
            winner: "draw",
            candidateDefeated: false,
            baselineDefeated: true,
        }, "e2")).toThrow();
    });
});
