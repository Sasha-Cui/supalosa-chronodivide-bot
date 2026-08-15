import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_COUNTRIES } from
    "../training/missionNativeCloseoutOpenDevelopmentCampaign.js";
import {
    validateMissionNativeCloseoutEvaluationFileCommitments,
    validateMissionNativeExposureByCountryAndSlot,
} from
    "../training/missionNativeCloseoutOpenDevelopmentTechnicalGate.js";

const ARMS = ["mission_native_v34_no_deadline", "mission_native_v35_deadline"] as const;
const temporaryRoots: string[] = [];
afterEach(() => temporaryRoots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true })));
const completeExposure = (): Map<string, Set<string>> => new Map(
    MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_COUNTRIES.map((country) => [
        country,
        new Set(ARMS.flatMap((armId) => [`${armId}|slot0`, `${armId}|slot1`])),
    ]),
);

describe("mission-native closeout open-development technical gate", () => {
    it("accepts exact evaluation-file commitments and rejects post-campaign drift", () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), "mission-native-closeout-gate-"));
        temporaryRoots.push(root);
        const relativePath = "policy.js";
        const absolutePath = path.join(root, relativePath);
        fs.writeFileSync(absolutePath, "frozen-policy\n");
        const sha256 = crypto.createHash("sha256").update("frozen-policy\n").digest("hex");
        expect(validateMissionNativeCloseoutEvaluationFileCommitments(root, [[relativePath, sha256]]))
            .toEqual({ [relativePath]: sha256 });
        fs.writeFileSync(absolutePath, "changed-policy\n");
        expect(() => validateMissionNativeCloseoutEvaluationFileCommitments(root, [[relativePath, sha256]]))
            .toThrow(/evaluation file drifted.*policy\.js/);
    });

    it("accepts intervention exposure in every country and reciprocal slot", () => {
        expect(() => validateMissionNativeExposureByCountryAndSlot(completeExposure(), ARMS)).not.toThrow();
    });

    it("fails closed when one country lacks one V35 reciprocal slot", () => {
        const exposure = completeExposure();
        exposure.get(MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_COUNTRIES[3])!
            .delete("mission_native_v35_deadline|slot1");
        expect(() => validateMissionNativeExposureByCountryAndSlot(exposure, ARMS))
            .toThrow(/Germans.*mission_native_v35_deadline\|slot1/);
    });

    it("does not let aggregate exposure in another country rescue a missing country", () => {
        const exposure = completeExposure();
        exposure.set(MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_COUNTRIES[8], new Set());
        expect(() => validateMissionNativeExposureByCountryAndSlot(exposure, ARMS))
            .toThrow(/Russians/);
    });
});
