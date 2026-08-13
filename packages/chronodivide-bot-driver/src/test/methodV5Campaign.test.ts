import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import {
    METHOD_V5_COUNTRIES,
    METHOD_V5_TRAINING_POPULATION_SHA256,
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

    test("requires one exact representative map per frozen family", () => {
        const repoRoot = path.basename(process.cwd()).startsWith(".method-v5-typecheck.")
            ? path.resolve(process.cwd(), "..", "..", "..")
            : path.resolve(process.cwd(), "..", "..");
        const relative = "packages/chronodivide-bot-driver/data/simple-1v1-no-preview.map";
        const fullPath = path.join(repoRoot, relative);
        const sha256 = crypto.createHash("sha256").update(fs.readFileSync(fullPath)).digest("hex");
            const source = {
                kind: "method-v4-lifecycle-screen",
                sourcePopulationCommitmentSha256: METHOD_V5_TRAINING_POPULATION_SHA256,
                selectedFamilies: [{ familyId: "mf_a", representativeSha256: sha256 }],
            };
            const catalog = { families: [{ familyId: "mf_a", mapPaths: [relative] }] };
            source.selectedFamilies = Array.from({ length: 22 }, (_, index) => ({
                familyId: `mf_${index}`,
                representativeSha256: sha256,
            }));
            catalog.families = Array.from({ length: 22 }, (_, index) => ({
                familyId: `mf_${index}`,
                mapPaths: [relative],
            }));
            expect(bindMethodV5Families(source, catalog, repoRoot)).toHaveLength(22);
            const drifted = {
                ...source,
                selectedFamilies: source.selectedFamilies.map((row) => ({ ...row, representativeSha256: "0".repeat(64) })),
            };
            expect(() => bindMethodV5Families(drifted, catalog, repoRoot)).toThrow(/exact representative maps/);
    });
});
