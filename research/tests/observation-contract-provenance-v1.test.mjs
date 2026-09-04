import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const external = "/nfs/roberts/project/pi_jss233/zc362/chrono_divide/supalosa-chronodivide-bot";
const externalDist = path.join(external, "packages/chronodivide-bot/dist");
const workspaceAliasDist = path.join(
    repo,
    "packages/chronodivide-bot-driver/node_modules/@supalosa/chronodivide-bot/dist",
);
const candidateDist = path.join(repo, "packages/chronodivide-bot/dist");

const files = (root) => {
    const output = [];
    const visit = (directory) => {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })
            .sort((left, right) => left.name.localeCompare(right.name))) {
            const absolute = path.join(directory, entry.name);
            if (entry.isDirectory()) visit(absolute);
            else if (entry.isFile()) output.push(absolute);
        }
    };
    visit(root);
    return output;
};
const javascript = (root) => files(root).filter((file) => file.endsWith(".js"));
const count = (root, literal) => javascript(root).reduce((total, file) =>
    total + fs.readFileSync(file, "utf8").split(literal).length - 1, 0);
const manifest = (root) => Object.fromEntries(files(root).map((file) => [
    path.relative(root, file),
    crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
]));

test("resolves the pinned external baseline rather than the workspace file dependency", () => {
    assert.equal(execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: external,
        encoding: "utf8",
    }).trim(), "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f");
    assert.notEqual(fs.realpathSync(externalDist), fs.realpathSync(workspaceAliasDist));
    assert.deepEqual(manifest(workspaceAliasDist), manifest(candidateDist));
});

test("pins the audited observation-call counts for both compiled bot trees", () => {
    assert.deepEqual({
        getAllUnits: count(externalDist, ".getAllUnits("),
        getVisibleUnits: count(externalDist, ".getVisibleUnits("),
        getUnitsInArea: count(externalDist, ".getUnitsInArea("),
    }, { getAllUnits: 0, getVisibleUnits: 34, getUnitsInArea: 4 });
    assert.equal(count(workspaceAliasDist, ".getAllUnits("), 11);
});

test("finds no direct opponent-credit access pattern in pinned external JavaScript", () => {
    const source = javascript(externalDist).map((file) => fs.readFileSync(file, "utf8")).join("\n");
    assert.doesNotMatch(source, /getPlayerData\([^)]*\)\.credits/);
});
