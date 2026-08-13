import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import {
    METHOD_V5_COUNTRIES,
    METHOD_V5_ECONOMIC_START_GATE_SHA256,
    METHOD_V5_FAMILY_COUNT,
    METHOD_V5_SOURCE_CAMPAIGN_SHA256,
    bindMethodV5Families,
    buildMethodV5Episodes,
} from "../training/methodV5Campaign.js";
import { buildMethodV5CloseoutArms } from "../training/methodV5CloseoutPolicies.js";

describe("Method-v5 campaign construction", () => {
    test("generates common-seed reciprocal slots for every frozen arm", () => {
        const arms = buildMethodV5CloseoutArms();
        const episodes = buildMethodV5Episodes(arms);
        expect(episodes).toHaveLength(arms.length * 2);
        for (const arm of arms) {
            expect(episodes.filter((row) => row.armId === arm.armId).map((row) => row.candidateSlot)).toEqual([0, 1]);
        }
        expect(METHOD_V5_COUNTRIES).toHaveLength(9);
    });

    test("requires the exact outcome-free supported population and maps", () => {
        const repoRoot = path.basename(process.cwd()).startsWith(".method-v5-typecheck.")
            ? path.resolve(process.cwd(), "..", "..", "..")
            : path.resolve(process.cwd(), "..", "..");
        const dataRoot = path.join(repoRoot, "packages", "chronodivide-bot-driver", "data");
        const allMaps = fs.readdirSync(dataRoot).filter((name) => /\.(map|mpr)$/i.test(name));
        const seen = new Set<string>();
        const supportedFamilies = allMaps.flatMap((mapName) => {
            const mapSha256 = crypto.createHash("sha256").update(fs.readFileSync(path.join(dataRoot, mapName))).digest("hex");
            if (seen.has(mapSha256) || seen.size >= METHOD_V5_FAMILY_COUNT) return [];
            seen.add(mapSha256);
            return [{ familyId: `mf_${seen.size - 1}`, mapName, mapSha256 }];
        });
        expect(supportedFamilies).toHaveLength(METHOD_V5_FAMILY_COUNT);
        const supported = {
            schemaVersion: 1,
            status: "FROZEN_METHOD_V6_OPEN_TRAINING_ECONOMIC_START_SUPPORTED_POPULATION",
            authorizedUse: "generate_complete_replacement_method_v6_open_training_campaign_with_fresh_seeds",
            outcomeFree: true,
            sourceFamilyCount: 22,
            supportedFamilyCount: METHOD_V5_FAMILY_COUNT,
            unsupportedFamilyCount: 3,
            sourceOpenCampaignSha256: METHOD_V5_SOURCE_CAMPAIGN_SHA256,
            economicStartGateSha256: METHOD_V5_ECONOMIC_START_GATE_SHA256,
            forbiddenInputs: ["winner", "score", "candidateScore", "outcomeStatus", "policyArmPerformance"],
            supportedFamilies,
            unsupportedFamilies: Array.from({ length: 3 }, (_, index) => ({ familyId: `unsupported_${index}` })),
        };
        expect(bindMethodV5Families(supported, repoRoot)).toHaveLength(METHOD_V5_FAMILY_COUNT);
        expect(supported.sourceOpenCampaignSha256).toBe(METHOD_V5_SOURCE_CAMPAIGN_SHA256);
        expect(supported.economicStartGateSha256).toBe(METHOD_V5_ECONOMIC_START_GATE_SHA256);
        expect(() => bindMethodV5Families({ ...supported, outcomeFree: false }, repoRoot)).toThrow(/invalid schema/);
        expect(() => bindMethodV5Families({
            ...supported,
            supportedFamilies: supported.supportedFamilies.map((row: { mapSha256: string }, index: number) =>
                index === 0 ? { ...row, mapSha256: "0".repeat(64) } : row),
        }, repoRoot)).toThrow(/exact committed map/);
    });
});
