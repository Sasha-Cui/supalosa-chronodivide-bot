import crypto from "node:crypto";
import { Bot } from "@chronodivide/game-api";
import { describe, expect, it } from "vitest";
import {
    Ra2WebOpponentDescriptor,
    evaluateRa2WebAmdBundle,
} from "../training/ra2WebOpponentBundle.js";

const sha = (value: string): string => crypto.createHash("sha256").update(value).digest("hex");
const bundle = (body: string): string =>
    `define("SPBots",["@chronodivide/game-api","three"],(api,three)=>{${body}});`;
const descriptor = (code: string, overrides: Partial<Ra2WebOpponentDescriptor> = {}): Ra2WebOpponentDescriptor => ({
    opponentId: "ra2web_standard",
    clientDifficulty: "Medium",
    bundleFile: "spbots.min.js",
    bundleSha256: sha(code),
    expectedVersion: "test-version",
    expectedBuildId: null,
    ...overrides,
});

describe("RA2Web opponent bundle adapter", () => {
    it("loads one exact AMD module with the simulator Bot identity", () => {
        const code = bundle(`
            class SyntheticBot extends api.Bot {}
            return { SupalosaBot: SyntheticBot, version: "test-version" };
        `);
        const module = evaluateRa2WebAmdBundle(code, descriptor(code));
        expect(module.version).toBe("test-version");
        expect(new module.SupalosaBot("synthetic", "Americans")).toBeInstanceOf(Bot);
    });

    it("rejects byte drift before evaluating external code", () => {
        const code = bundle(`
            class SyntheticBot extends api.Bot {}
            return { SupalosaBot: SyntheticBot, version: "test-version" };
        `);
        expect(() => evaluateRa2WebAmdBundle(code + " ", descriptor(code))).toThrow(/SHA-256 drifted/);
    });

    it("rejects unexpected module names and dependency surfaces", () => {
        const wrongName = `define("Other",["@chronodivide/game-api","three"],()=>({}));`;
        expect(() => evaluateRa2WebAmdBundle(wrongName, descriptor(wrongName)))
            .toThrow(/invalid AMD definition/);
        const wrongDependency = `define("SPBots",["@chronodivide/game-api","node:fs"],()=>({}));`;
        expect(() => evaluateRa2WebAmdBundle(wrongDependency, descriptor(wrongDependency)))
            .toThrow(/dependencies drifted/);
    });

    it("rejects duplicate definitions and missing constructors", () => {
        const one = bundle(`return { version: "test-version" };`);
        const duplicate = one + one;
        expect(() => evaluateRa2WebAmdBundle(duplicate, descriptor(duplicate)))
            .toThrow(/defined more than once/);
        expect(() => evaluateRa2WebAmdBundle(one, descriptor(one)))
            .toThrow(/did not export one SupalosaBot/);
    });

    it("rejects a constructor from a second physical Bot class", () => {
        const code = bundle(`
            class OtherBot {}
            return { SupalosaBot: OtherBot, version: "test-version" };
        `);
        expect(() => evaluateRa2WebAmdBundle(code, descriptor(code)))
            .toThrow(/second physical game-api Bot class/);
    });

    it("validates the complete Advanced build identity", () => {
        const code = bundle(`
            class SyntheticBot extends api.Bot {}
            return {
                SupalosaBot: SyntheticBot,
                version: "0.83.1-bot3",
                telemetrySchemaVersion: 111,
                buildInfo: {
                    generation: 3,
                    buildId: "ra2web-0.83.1-ai-old-priest-phase258-20260716",
                    rulesDriven: true,
                    telemetrySchemaVersion: 111,
                    replacesExistingDifficulty: false
                }
            };
        `);
        const advanced = descriptor(code, {
            opponentId: "ra2web_advanced_old_priest",
            clientDifficulty: "Advanced",
            bundleFile: "spbots3.min.js",
            expectedVersion: "0.83.1-bot3",
            expectedBuildId: "ra2web-0.83.1-ai-old-priest-phase258-20260716",
        });
        expect(evaluateRa2WebAmdBundle(code, advanced).telemetrySchemaVersion).toBe(111);
        const drifted = code.replace("phase258", "phase259");
        expect(() => evaluateRa2WebAmdBundle(drifted, { ...advanced, bundleSha256: sha(drifted) }))
            .toThrow(/build identity drifted/);
    });

    it("rejects Bot3 metadata on non-Advanced bundles", () => {
        const code = bundle(`
            class SyntheticBot extends api.Bot {}
            return { SupalosaBot: SyntheticBot, version: "test-version", buildInfo: { generation: 3 } };
        `);
        expect(() => evaluateRa2WebAmdBundle(code, descriptor(code)))
            .toThrow(/unexpectedly exported Bot3 metadata/);
    });
});
