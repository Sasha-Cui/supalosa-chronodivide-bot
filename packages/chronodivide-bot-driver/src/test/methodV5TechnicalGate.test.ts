import { describe, expect, test } from "vitest";
import { METHOD_V5_SHARD_COUNT } from "../training/methodV5Campaign.js";
import { parseMethodV5Sacct, validateMethodV5Telemetry } from "../training/methodV5TechnicalGate.js";

describe("Method-v5 fail-closed scheduler gate", () => {
    const complete = Array.from({ length: METHOD_V5_SHARD_COUNT }, (_, index) =>
        `123_${index}|${900000 + index}|COMPLETED|0:0|pi_jss233`,
    ).join("\n");

    test("accepts exactly the complete supported-population array", () => {
        const tasks = parseMethodV5Sacct(complete, "123");
        expect(tasks.size).toBe(METHOD_V5_SHARD_COUNT);
        expect(tasks.get(METHOD_V5_SHARD_COUNT - 1)?.schedulerJobId).toBe(String(900000 + METHOD_V5_SHARD_COUNT - 1));
    });

    test("rejects partial, failed, duplicated, or wrong-account evidence", () => {
        expect(() => parseMethodV5Sacct(complete.split("\n").slice(0, -1).join("\n"), "123")).toThrow(
            new RegExp(`${METHOD_V5_SHARD_COUNT - 1}\\/${METHOD_V5_SHARD_COUNT}`),
        );
        expect(() => parseMethodV5Sacct(complete.replace("COMPLETED|0:0", "FAILED|1:0"), "123")).toThrow();
        expect(() => parseMethodV5Sacct(complete.replace("pi_jss233", "other"), "123")).toThrow();
        expect(() => parseMethodV5Sacct(`${complete}\n${complete.split("\n")[0]}`, "123")).toThrow();
    });

    test("accepts only exact aggregate capability telemetry", () => {
        expect(validateMethodV5Telemetry({
            schemaVersion: 2,
            event: "capability_request",
            tick: 7200,
            unitName: "JUMPJET",
            targetCount: 4,
            currentCount: 0,
            requestedStructure: "GAAIRC",
        }).event).toBe("capability_request");
        expect(() => validateMethodV5Telemetry({
            schemaVersion: 2,
            event: "capability_request",
            tick: 7200,
            unitName: "ZEP",
            targetCount: 4,
            currentCount: 0,
            requestedStructure: "GAAIRC",
        })).toThrow(/invalid unit or structure/);
        expect(() => validateMethodV5Telemetry({
            schemaVersion: 2,
            event: "search_orders",
            tick: 7200,
            attackerCount: 4,
            searchPointCount: -1,
            reservedCombatants: 3,
            visibleEnemyCombatants: 0,
        })).toThrow(/nonnegative integer/);
        expect(validateMethodV5Telemetry({
            schemaVersion: 2,
            event: "target_orders",
            tick: 7200,
            attackerCount: 5,
            compatibleAttackerCount: 6,
            ownEligibleCombatants: 9,
            reservedCombatants: 3,
            visibleEnemyCombatants: 100,
            visibleTargetCount: 1,
            rememberedTargetCount: 1,
            assignedTargetCount: 1,
            selectedTargetId: 42,
            selectedTargetHitPoints: 300,
            selectedTargetVisible: true,
            estimatedVolleys: 1,
            ticksSinceLastDamage: 0,
            targetAssignmentMode: "focused",
        }).event).toBe("target_orders");
    });
});
