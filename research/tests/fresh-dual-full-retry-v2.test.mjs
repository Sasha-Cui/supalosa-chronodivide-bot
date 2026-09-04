import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const runner = fs.readFileSync(
    path.join(root, "research/scripts/fresh-dual-competitive-v2.mjs"),
    "utf8",
);
const slurm = fs.readFileSync(
    path.join(root, "research/slurm/fresh_dual_competitive_v2.sbatch"),
    "utf8",
);

test("full retry binds the failed V1 population and corrected analysis", () => {
    assert.match(runner, /137575de8d55b7a832ceced58f23f22b84b132416bb4d58ff7ec43e9bb1a7197/);
    assert.match(runner, /assert\.deepEqual\(assignments, v1Manifest\.value\.assignments\)/);
    assert.match(runner, /analyzeFreshDualRowsV2\(rows\)/);
    assert.match(runner, /fresh-dual-analysis-v2\.mjs/);
    assert.match(runner, /execution-v2-full-retry-a1/);
    assert.match(runner, /fresh-dual-full-retry-v2-amendment-a1\.md/);
    assert.match(runner, /v1CombinedWithV2: false/);
});

test("Slurm replacement is CPU-only, non-requeueing, and excludes incident nodes", () => {
    assert.match(slurm, /^#SBATCH --account=pi_jss233$/m);
    assert.match(slurm, /^#SBATCH --partition=day$/m);
    assert.match(slurm, /^#SBATCH --cpus-per-task=1$/m);
    assert.match(slurm, /^#SBATCH --no-requeue$/m);
    assert.match(slurm, /^#SBATCH --exclude=c1102u03n03,c1102u07n01$/m);
    assert.doesNotMatch(slurm, /^#SBATCH --(?:gres|gpus?)(?:=|-)/mi);
    assert.match(slurm, /fresh-dual-competitive-v2\.mjs/);
    assert.doesNotMatch(slurm, /fresh-dual-competitive-v1\.mjs/);
});

test("replacement uses exclusive V2 markers and output paths", () => {
    assert.match(slurm, /execution-v2-full-retry-a1\/cells/);
    assert.match(slurm, /execution-v2-full-retry-a1\/finalizer/);
    assert.match(slurm, /COMPLETE_FRESH_DUAL_COMPETITIVE_CELL_V2/);
    assert.match(slurm, /COMPLETE_FRESH_DUAL_COMPETITIVE_AGGREGATE_V2/);
    assert.match(runner, /COMPLETE_FRESH_DUAL_COMPETITIVE_MANIFEST_V2/);
});
