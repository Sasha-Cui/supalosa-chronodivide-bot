import { describe, expect, it } from "vitest";
import {
    TerminalRacePolicy,
    buildTerminalRaceArms,
    terminalRacePolicySha256,
    validateTerminalRacePolicy,
} from "../training/terminalRacePolicy.js";

const arms = new Map(buildTerminalRaceArms().map((arm) => [arm.armId, arm]));

describe("terminal-race policy", () => {
    it("freezes six unique canonical arms in protocol order", () => {
        expect([...arms.keys()]).toEqual([
            "baseline_control",
            "visible_conservative",
            "visible_role_calibrated",
            "public_terminal_race_late",
            "public_terminal_race_trigger",
            "public_terminal_race_rapid",
        ]);
        expect(new Set([...arms.values()].map(({ policyId }) => policyId)).size).toBe(6);
        for (const arm of arms.values()) expect(terminalRacePolicySha256(arm.policy)).toBe(arm.policyId);
    });

    it("rejects an unguarded or visibility-limited count trigger", () => {
        const trigger = arms.get("public_terminal_race_trigger")!.policy;
        expect(() => validateTerminalRacePolicy({
            ...trigger,
            requireObservedCountAboveThreshold: false,
        })).toThrow("transition-guarded");
        expect(() => validateTerminalRacePolicy({
            ...trigger,
            informationInterface: "visible_memory",
        })).toThrow("requires public_complete_state");
    });

    it("rejects extra fields from the exact policy schema", () => {
        expect(() => validateTerminalRacePolicy({
            ...arms.get("visible_conservative")!.policy,
            futureLeak: true,
        } as TerminalRacePolicy)).toThrow("invalid exact schema");
    });
});
