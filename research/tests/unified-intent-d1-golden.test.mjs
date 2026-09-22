import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { test } from "node:test";
import { D1_GOLDEN_SOURCE, D1_GOLDEN_URL, referenceD1Traces } from "../runtime/unified-intent-d1-golden.mjs";
test("pre-D1 disabled, hard-total and capped V2 full action/telemetry golden traces remain exact", () => {
    const fixture = JSON.parse(fs.readFileSync(D1_GOLDEN_URL, "utf8"));
    assert.equal(fixture.sourceCommit, D1_GOLDEN_SOURCE);
    assert.equal(fixture.syntheticOnly, true);
    assert.equal(fixture.gameInitializations, 0);
    assert.equal(fixture.advancingEpisodes, 0);
    assert.equal(fixture.generatorSha256, crypto.createHash("sha256").update(fs.readFileSync(
        new URL("../runtime/unified-intent-d1-golden.mjs", import.meta.url))).digest("hex"));
    assert.deepEqual(referenceD1Traces(), fixture.expected);
});
