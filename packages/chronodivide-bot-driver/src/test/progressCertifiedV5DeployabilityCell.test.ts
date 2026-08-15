import { describe, expect, it } from "vitest";
import {
    DeployabilityOrderRecord,
    reciprocalStartsPass,
} from "../training/progressCertifiedV5DeployabilityCell.js";

const record = (
    order: DeployabilityOrderRecord["order"],
    alphaStart: { x: number; y: number },
    betaStart: { x: number; y: number },
): DeployabilityOrderRecord => ({
    order,
    requestedEngineSeed: 4_231_000_000,
    initialTick: 0,
    finalTick: 12,
    updateCount: 12,
    tickArithmeticConsistent: true,
    alphaStart,
    betaStart,
    distinctStarts: true,
    startsDeclared: true,
    alphaEstablished: true,
    betaEstablished: true,
    alphaFirstBuildingTick: 10,
    betaFirstBuildingTick: 12,
    warnings: [],
    warningCaptureTruncated: false,
    error: null,
    failureCategories: [],
    reviewCategories: [],
});

describe("V5 deployability reciprocal start validation", () => {
    it("accepts an exact identity-to-physical-start swap", () => {
        const forward = record(["alpha", "beta"], { x: 10, y: 20 }, { x: 30, y: 40 });
        const reverse = record(["beta", "alpha"], { x: 30, y: 40 }, { x: 10, y: 20 });
        expect(reciprocalStartsPass(forward, reverse)).toBe(true);
    });

    it("rejects two runs that leave identities at the same physical starts", () => {
        const forward = record(["alpha", "beta"], { x: 10, y: 20 }, { x: 30, y: 40 });
        const reverse = record(["beta", "alpha"], { x: 10, y: 20 }, { x: 30, y: 40 });
        expect(reciprocalStartsPass(forward, reverse)).toBe(false);
    });
});
