import { describe, expect, test } from "vitest";
import crypto from "node:crypto";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import {
    parseMethodV3Stage2Sacct,
    validateMethodV3Stage2ArrayLaunch,
    validateMethodV3Stage2PolicyTelemetry,
} from "../training/methodV3Stage2TechnicalGate.js";
import { MethodV3Stage2Campaign } from "../training/methodV3Stage2PlanGenerator.js";

describe("method-v3 Stage-2 technical gate", () => {
    test("requires every scheduler task to complete cleanly under pi_jss233", () => {
        const parsed = parseMethodV3Stage2Sacct(
            [
                "2200_0|2201|COMPLETED|0:0|pi_jss233",
                "2200_1|2202|COMPLETED|0:0|pi_jss233",
                "",
            ].join("\n"),
            "2200",
            2,
        );
        expect([...parsed.entries()]).toEqual([
            [0, { schedulerJobId: "2201", state: "COMPLETED", exitCode: "0:0", account: "pi_jss233" }],
            [1, { schedulerJobId: "2202", state: "COMPLETED", exitCode: "0:0", account: "pi_jss233" }],
        ]);
        expect(() => parseMethodV3Stage2Sacct(
            "2200_0|2201|TIMEOUT|0:0|pi_jss233\n",
            "2200",
            1,
        )).toThrow(/failed/);
        expect(() => parseMethodV3Stage2Sacct(
            "2200_0|2201|COMPLETED|0:0|wrong\n",
            "2200",
            1,
        )).toThrow(/failed/);
    });

    test("binds the exact array launch to its campaign and scheduler job", () => {
        const campaignPath = fileURLToPath(import.meta.url);
        const campaign = {
            optimizerRunIndex: 2,
            stage: 1,
            shards: [{ shardIndex: 0 }, { shardIndex: 1 }],
        } as unknown as MethodV3Stage2Campaign;
        const record = {
            schemaVersion: 1,
            kind: "stage2_array_launch",
            schedulerAccount: "pi_jss233",
            jobId: "2200",
            parentControllerJobId: "2199",
            optimizerRunIndex: 2,
            stage: 1,
            shardCount: 2,
            campaignPath,
            campaignSha256: crypto.createHash("sha256").update(fs.readFileSync(campaignPath)).digest("hex"),
        };
        expect(() => validateMethodV3Stage2ArrayLaunch(record, campaign, campaignPath, "2200")).not.toThrow();
        expect(() => validateMethodV3Stage2ArrayLaunch({ ...record, jobId: "2201" }, campaign, campaignPath, "2200"))
            .toThrow(/launch record differs/);
    });

    test("accepts only the frozen telemetry schema/event pairs", () => {
        const values = [
            { schemaVersion: 1, event: "activated", tick: 1, observationMode: "publicApi", ownCombatants: 2, enemyCombatants: 0, reservedCombatants: 0, preemptedMissions: [] },
            { schemaVersion: 1, event: "memory_invalidated", tick: 2, buildingIds: [1] },
            { schemaVersion: 1, event: "target_orders", tick: 3, attackerCount: 2, targets: [{ id: 1, name: "GAPOWR", x: 2, y: 3, visible: true }] },
            { schemaVersion: 1, event: "sweep_orders", tick: 4, attackerCount: 2, targets: [{ x: 2, y: 3 }] },
            { schemaVersion: 2, event: "activation_blocked", tick: 5, reason: "insufficient_advantage", ownCombatants: 2, enemyCombatants: 2, reservedCombatants: 1 },
            { schemaVersion: 2, event: "target_progress", tick: 6, targetId: 1, targetName: "GAPOWR", hitPoints: 100, previousHitPoints: 200, damage: 100 },
            { schemaVersion: 2, event: "target_stalled", tick: 7, targetId: 1, targetName: "GAPOWR", hitPoints: 100, lastDamageTick: 1, stallTicks: 300 },
            { schemaVersion: 2, event: "assignment_summary", tick: 8, eligibleAttackers: 2, assignedAttackers: 1, incompatiblePairs: 1, unreachablePairs: 0, targetCount: 1 },
            { schemaVersion: 2, event: "capability_production", tick: 9, stalledBuildingIds: [1], incompatibleBuildingIds: [], unreachableBuildingIds: [], requestedStructures: ["GAAIRC"], requestedUnits: ["JUMPJET"] },
        ];
        for (const value of values) expect(() => validateMethodV3Stage2PolicyTelemetry(value)).not.toThrow();
    });

    test("rejects unknown events and version drift", () => {
        expect(() => validateMethodV3Stage2PolicyTelemetry({ schemaVersion: 1, event: "target_progress", tick: 1 })).toThrow();
        expect(() => validateMethodV3Stage2PolicyTelemetry({ schemaVersion: 2, event: "target_orders", tick: 1 })).toThrow();
        expect(() => validateMethodV3Stage2PolicyTelemetry({ schemaVersion: 3, event: "capability_production", tick: 1 })).toThrow();
        expect(() => validateMethodV3Stage2PolicyTelemetry({ schemaVersion: 2, event: "target_stalled", tick: 1 })).toThrow();
    });
});
