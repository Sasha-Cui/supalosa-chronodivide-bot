import { describe, expect, test } from "vitest";
import { parseTerminalFreshDevelopmentSacct } from "../training/terminalObjectiveFreshDevelopmentTechnicalGate.js";

describe("fresh terminal-objective fail-closed scheduler gate", () => {
    const complete = Array.from({ length: 360 }, (_, index) =>
        `123_${index}|${900000 + index}|COMPLETED|0:0|pi_jss233`,
    ).join("\n");

    test("accepts exactly one authorized completion per frozen shard", () => {
        const tasks = parseTerminalFreshDevelopmentSacct(complete, "123");
        expect(tasks.size).toBe(360);
        expect(tasks.get(359)?.schedulerJobId).toBe("900359");
    });

    test("rejects partial, duplicate, failed, and unauthorized rows", () => {
        expect(() => parseTerminalFreshDevelopmentSacct(complete.split("\n").slice(1).join("\n"), "123"))
            .toThrow(/359\/360/);
        expect(() => parseTerminalFreshDevelopmentSacct(`${complete}\n${complete.split("\n")[0]}`, "123")).toThrow();
        expect(() => parseTerminalFreshDevelopmentSacct(complete.replace("COMPLETED|0:0", "FAILED|1:0"), "123"))
            .toThrow();
        expect(() => parseTerminalFreshDevelopmentSacct(complete.replace("pi_jss233", "other"), "123")).toThrow();
    });
});
