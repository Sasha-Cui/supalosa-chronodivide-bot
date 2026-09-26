import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import {
    referenceS1Traces,
    syntheticS1BotTrace,
    S1_GOLDEN_URL,
    S1_GOLDEN_SOURCE,
} from "../runtime/strategic-s1-golden.mjs";
const expected = JSON.parse(fs.readFileSync(S1_GOLDEN_URL));
test("pre-S1 baseline source and current disabled/default action traces remain exact", () => {
    assert.equal(expected.sourceCommit, S1_GOLDEN_SOURCE);
    assert.equal(
        expected.generatorSha256,
        crypto
            .createHash("sha256")
            .update(fs.readFileSync(new URL("../runtime/strategic-s1-golden.mjs", import.meta.url)))
            .digest("hex"),
    );
    assert.deepEqual(referenceS1Traces(), expected.expected);
});
test("research accessor calls do not alter inherited policy control flow", () =>
    assert.deepEqual(syntheticS1BotTrace(true).behavior, expected.expected.inheritedPolicy));
