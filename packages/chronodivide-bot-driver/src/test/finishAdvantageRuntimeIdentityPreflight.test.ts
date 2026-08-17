import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { assertSamePhysicalRuntime } from "../training/finishAdvantageRuntimeIdentityPreflight.js";

const temporaryRoots: string[] = [];
afterEach(() => {
    for (const root of temporaryRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("finish-advantage runtime-identity preflight", () => {
    it("accepts distinct symlinks only when they resolve to the same physical runtime", () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), "finish-runtime-preflight-"));
        temporaryRoots.push(root);
        const runtime = path.join(root, "runtime.js");
        fs.writeFileSync(runtime, "export const identity = true;\n");
        const driverLink = path.join(root, "driver.js");
        const externalLink = path.join(root, "external.js");
        fs.symlinkSync(runtime, driverLink);
        fs.symlinkSync(runtime, externalLink);
        expect(assertSamePhysicalRuntime(driverLink, externalLink)).toBe(fs.realpathSync(runtime));
    });

    it("rejects byte-identical code loaded from two physical files", () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), "finish-runtime-preflight-"));
        temporaryRoots.push(root);
        const left = path.join(root, "left.js");
        const right = path.join(root, "right.js");
        fs.writeFileSync(left, "export const identity = true;\n");
        fs.copyFileSync(left, right);
        expect(() => assertSamePhysicalRuntime(left, right)).toThrow(/physical runtime mismatch/);
    });
});
