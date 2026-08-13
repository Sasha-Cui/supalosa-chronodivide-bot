import { describe, expect, it } from "vitest";
import {
    TERMINAL_OBJECTIVE_ARM_ORDER,
    TerminalObjectivePolicy,
    buildTerminalObjectiveArms,
    terminalObjectivePolicySha256,
    validateTerminalObjectivePolicy,
} from "../training/terminalObjectivePolicy.js";

const full = buildTerminalObjectiveArms().find(({ armId }) => armId === "full_sufficient_strike")!;

describe("terminal-objective policy", () => {
    it("has a closed, canonical schema", () => {
        const reversed = Object.fromEntries(
            Object.entries(full.policy).reverse(),
        ) as TerminalObjectivePolicy;
        expect(terminalObjectivePolicySha256(reversed)).toBe(full.policyId);
        expect(() => validateTerminalObjectivePolicy({
            ...full.policy,
            unknown: 1,
        } as TerminalObjectivePolicy)).toThrow("invalid exact schema");
        expect(() => validateTerminalObjectivePolicy({
            ...full.policy,
            directCompletionSafetyMarginTicks: -1,
        })).toThrow("directCompletionSafetyMarginTicks");
    });

    it("materializes exactly the frozen nested causal arms", () => {
        const arms = buildTerminalObjectiveArms();
        expect(arms.map(({ armId }) => armId)).toEqual([...TERMINAL_OBJECTIVE_ARM_ORDER]);
        expect(new Set(arms.map(({ policyId }) => policyId)).size).toBe(arms.length);
        expect(arms[0].policy.enabled).toBe(false);
        expect(arms.slice(1).map(({ policy }) => policy.mechanism)).toEqual([
            "persistent_liveness",
            "blocker_scheduler",
            "terminal_candidate",
            "full_sufficient_strike",
        ]);
    });
});
