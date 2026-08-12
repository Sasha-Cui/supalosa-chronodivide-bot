import { describe, expect, test } from "vitest";
import {
    hasCompleteMethodV3Stage1SchedulerTasks,
    parseMethodV3Stage1Sacct,
} from "../training/methodV3Stage1SchedulerGate.js";

describe("method-v3 Stage-1 scheduler gate", () => {
    test("requires every exact task to finish under pi_jss233", () => {
        const rows = parseMethodV3Stage1Sacct([
            "2198_0|2201|COMPLETED|0:0|pi_jss233",
            "2198_1|2202|COMPLETED|0:0|pi_jss233",
            "",
        ].join("\n"), "2198", 2);
        expect(rows).toEqual([
            { arrayTaskId: 0, schedulerJobId: "2201", state: "COMPLETED", exitCode: "0:0", account: "pi_jss233" },
            { arrayTaskId: 1, schedulerJobId: "2202", state: "COMPLETED", exitCode: "0:0", account: "pi_jss233" },
        ]);
        expect(() => parseMethodV3Stage1Sacct(
            "2198_0|2201|RUNNING|0:0|pi_jss233\n",
            "2198",
            1,
        )).toThrow(/failed/);
        expect(() => parseMethodV3Stage1Sacct(
            "2198_0|2201|COMPLETED|0:0|wrong\n",
            "2198",
            1,
        )).toThrow(/failed/);
    });

    test("requires ordered unique task identities in a complete artifact", () => {
        const tasks = Array.from({ length: 198 }, (_, arrayTaskId) => ({
            arrayTaskId,
            schedulerJobId: String(3000 + arrayTaskId),
            state: "COMPLETED" as const,
            exitCode: "0:0" as const,
            account: "pi_jss233" as const,
        }));
        expect(hasCompleteMethodV3Stage1SchedulerTasks(tasks)).toBe(true);
        expect(hasCompleteMethodV3Stage1SchedulerTasks(tasks.map((task, index) =>
            index === 9 ? { ...task, schedulerJobId: tasks[8].schedulerJobId } : task,
        ))).toBe(false);
        expect(hasCompleteMethodV3Stage1SchedulerTasks(tasks.slice(1))).toBe(false);
    });
});
