import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = "/nfs/roberts/project/pi_jss233/zc362/chrono_divide";
const freezePath = path.join(
    root,
    "research-evidence/fresh-dual-endpoint-v1/execution-v1/",
    "runtime-freeze/runtime-freeze.json",
);
const hash = (file) => crypto.createHash("sha256")
    .update(fs.readFileSync(file))
    .digest("hex");
assert.equal(
    hash(freezePath),
    "be47027c8526daa961500a1ca2acc3c04dd1a487460d4dec78361faa03ece649",
);
const freeze = JSON.parse(fs.readFileSync(freezePath));
const assets = freeze.frozen.assets;
assert.equal(assets.count, 335);
assert.equal(assets.entries.length, assets.count);
for (const entry of assets.entries) {
    assert.deepEqual(Object.keys(entry).sort(), ["name", "sha256"]);
    assert.equal(typeof entry.name, "string");
    assert.match(entry.sha256, /^[0-9a-f]{64}$/);
    const file = path.join(assets.root, entry.name);
    assert.equal(fs.statSync(file).isFile(), true);
    assert.equal(hash(file), entry.sha256);
}
console.log(JSON.stringify({
    passed: true,
    runtimeFreezeSha256: hash(freezePath),
    assetCount: assets.count,
}));
