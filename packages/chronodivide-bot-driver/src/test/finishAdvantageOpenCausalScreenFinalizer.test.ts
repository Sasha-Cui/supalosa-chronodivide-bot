import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
    countFinishAdvantageMechanismTransitions,
    matchesOpenScreenRuntimeTrees,
    parseFinishAdvantageOpenSacct,
} from "../training/finishAdvantageOpenCausalScreenFinalizer.js";

const rows = (arrayJobId = "12345") => Array.from({ length: 90 }, (_, taskIndex) =>
    `${arrayJobId}_${taskIndex}|${Number(arrayJobId) + taskIndex}|COMPLETED|0:0|pi_jss233`,
).join("\n") + "\n";

describe("finish-advantage open causal-screen finalizer", () => {
    it("counts explicit certificate revocations and stall-recovery invocations", () => {
        expect(countFinishAdvantageMechanismTransitions([
            { irreversibleCertificateRevoked: false, stalledTargetId: null },
            { irreversibleCertificateRevoked: true, stalledTargetId: null },
            { irreversibleCertificateRevoked: false, stalledTargetId: 100 },
            { irreversibleCertificateRevoked: true, stalledTargetId: 101 },
        ] as any)).toEqual({ certificateRevocations: 2, stallRecoveries: 2 });
    });

    it("requires the provenance runtime-tree array and its exact canonical commitment", () => {
        const trees = [{ root: "/a", sha256: "a".repeat(64) }, { root: "/b", sha256: "b".repeat(64) }];
        const commitment = createHash("sha256")
            .update(JSON.stringify(trees)).digest("hex");
        expect(matchesOpenScreenRuntimeTrees(trees, commitment)).toBe(true);
        expect(matchesOpenScreenRuntimeTrees({ ...trees }, commitment)).toBe(false);
        expect(matchesOpenScreenRuntimeTrees(trees.slice().reverse(), commitment)).toBe(false);
    });

    it("requires all 90 exact successful pi_jss233 scheduler tasks", () => {
        const parsed = parseFinishAdvantageOpenSacct(rows(), "12345");
        expect(parsed.size).toBe(90);
        expect(parsed.get(0)).toEqual({
            schedulerJobId: "12345",
            state: "COMPLETED",
            exitCode: "0:0",
            account: "pi_jss233",
        });
        expect(parsed.get(89)?.schedulerJobId).toBe("12434");
    });

    it("fails closed on incomplete scheduler evidence", () => {
        expect(() => parseFinishAdvantageOpenSacct(
            rows().split("\n").slice(0, 89).join("\n") + "\n",
            "12345",
        )).toThrow("89/90");
    });

    it("rejects a failed task or wrong account", () => {
        expect(() => parseFinishAdvantageOpenSacct(
            rows().replace("12345_7|12352|COMPLETED|0:0|pi_jss233", "12345_7|12352|FAILED|1:0|pi_jss233"),
            "12345",
        )).toThrow("failed, duplicate, or unauthorized");
        expect(() => parseFinishAdvantageOpenSacct(
            rows().replace("12345_8|12353|COMPLETED|0:0|pi_jss233", "12345_8|12353|COMPLETED|0:0|other"),
            "12345",
        )).toThrow("failed, duplicate, or unauthorized");
    });

    it("rejects duplicates and out-of-range tasks", () => {
        expect(() => parseFinishAdvantageOpenSacct(
            rows() + "12345_0|99999|COMPLETED|0:0|pi_jss233\n",
            "12345",
        )).toThrow("failed, duplicate, or unauthorized");
        expect(() => parseFinishAdvantageOpenSacct(
            rows().replace("12345_89|12434", "12345_90|12435"),
            "12345",
        )).toThrow("failed, duplicate, or unauthorized");
    });
});
