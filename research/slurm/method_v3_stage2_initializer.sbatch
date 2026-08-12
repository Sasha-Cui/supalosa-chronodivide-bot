#!/bin/bash
#SBATCH --job-name=chrono-v3-s2-init
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=00:30:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=4G
#SBATCH --no-requeue
#SBATCH --output=/dev/null
#SBATCH --error=/dev/null

set -euo pipefail
umask 077

NODE_RUNTIME_ROOT=/apps/software/2024a/software/nodejs/20.13.1-GCCcore-13.3.0
ICU_RUNTIME_ROOT=/apps/software/2024a/software/ICU/75.1-GCCcore-13.3.0
GCC_RUNTIME_ROOT=/apps/software/system/software/GCCcore/13.3.0
OPENSSL_RUNTIME_ROOT=/apps/software/system/software/OpenSSL/3
NODE_BIN="$NODE_RUNTIME_ROOT/bin/node"
SCONTROL=/opt/slurm/25.11.6/bin/scontrol
SBATCH=/opt/slurm/25.11.6/bin/sbatch
export PATH="$NODE_RUNTIME_ROOT/bin:/opt/slurm/25.11.6/bin:/usr/local/bin:/usr/bin:/bin"
export LD_LIBRARY_PATH="$ICU_RUNTIME_ROOT/lib:$GCC_RUNTIME_ROOT/lib64:$OPENSSL_RUNTIME_ROOT/lib64:$NODE_RUNTIME_ROOT/lib"
export TZ=UTC
export LC_ALL=C
export PYTHONHASHSEED=0
export PYTHONDONTWRITEBYTECODE=1
unset NODE_OPTIONS

REPO=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
DRIVER_ROOT="$REPO/packages/chronodivide-bot-driver"
PRIVATE_ROLE_ROOT=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/design/family-split-v1
BASELINE_ROOT=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/supalosa-chronodivide-bot/packages/chronodivide-bot
DESIGN_BASE=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/design/method-v3-stage2-optimizer-v1
RESULTS_BASE=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/method-v3/stage2-optimizer-v1
STAGE1_CAMPAIGN=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/design/method-v3-stage1-mechanism-v2/campaign.json
STAGE1_SCHEDULER_GATE=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/method-v3/stage1-mechanism-v1/scheduler-gate.json
STAGE1_ANALYSIS=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/method-v3/stage1-mechanism-v1/analysis.json
GENERATOR="$DRIVER_ROOT/dist/training/methodV3Stage2PlanGenerator.js"
SHARD_JOB="$REPO/research/slurm/method_v3_stage2_optimizer_shard.sbatch"
CONTROLLER_JOB="$REPO/research/slurm/method_v3_stage2_controller.sbatch"

: "${STAGE0_JOB_ID:?STAGE0_JOB_ID must identify the passed all-country interface diagnostic}"
if [[ ! "$STAGE0_JOB_ID" =~ ^[1-9][0-9]*$ ]]; then
    echo "STAGE0_JOB_ID must be numeric" >&2
    exit 2
fi
STAGE0_GATE=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/method-v3/stage0-country-interface/$STAGE0_JOB_ID/stage0-gate.json

JOB_LINE=$($SCONTROL show job -o "${SLURM_JOB_ID:?SLURM_JOB_ID is required}")
if [[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) ]]; then
    JOB_ACCOUNT=${BASH_REMATCH[2]}
else
    echo "Authoritative Slurm account is absent from scontrol output" >&2
    exit 2
fi
if [[ "$JOB_ACCOUNT" != "pi_jss233" ]]; then
    echo "Refusing Stage-2 initialization under account $JOB_ACCOUNT" >&2
    exit 2
fi
for required in "$NODE_BIN" "$SBATCH" "$STAGE0_GATE" "$STAGE1_CAMPAIGN" "$STAGE1_SCHEDULER_GATE" \
    "$STAGE1_ANALYSIS" \
    "$GENERATOR" "$SHARD_JOB" "$CONTROLLER_JOB" "$PRIVATE_ROLE_ROOT/train-families.json" \
    "$BASELINE_ROOT/dist/bot/bot.js"; do
    if [[ ! -e "$required" ]]; then
        echo "Missing Stage-2 initialization input: $required" >&2
        exit 2
    fi
done
if [[ -e "$DESIGN_BASE" || -e "$RESULTS_BASE" ]]; then
    echo "Refusing to reuse a Stage-2 design or evidence base" >&2
    exit 2
fi
cd "$REPO"
SOURCE_COMMIT=$(git rev-parse HEAD)
if [[ "$(git branch --show-current)" != "main" || -n "$(git status --porcelain=v1 --untracked-files=no)" ]]; then
    echo "Stage-2 initialization requires a clean tracked main checkout" >&2
    exit 2
fi

export STAGE0_GATE SOURCE_COMMIT STAGE0_JOB_ID
"$NODE_BIN" --input-type=module <<'NODE'
import fs from "node:fs";
const gate = JSON.parse(fs.readFileSync(process.env.STAGE0_GATE, "utf8"));
if (
    gate.schemaVersion !== 1 ||
    gate.status !== "PASS_OUTCOME_FREE_METHOD_V3_STAGE0_COUNTRY_INTERFACE" ||
    gate.passed !== true ||
    gate.outcomeFree !== true ||
    String(gate.scheduler?.jobId) !== process.env.STAGE0_JOB_ID ||
    gate.scheduler?.account !== "pi_jss233" ||
    gate.sourceGitCommit !== process.env.SOURCE_COMMIT ||
    gate.countryCount !== 9 ||
    gate.reciprocalSlotCount !== 2 ||
    gate.matchCount !== 18 ||
    gate.maxTicks !== 1200 ||
    gate.finisherActivationCount !== 18
) {
    throw new Error("The all-country Stage-0 gate does not authorize Stage-2 initialization");
}
NODE

mkdir -m 0700 "$DESIGN_BASE"
mkdir -m 0700 "$RESULTS_BASE"
INIT_ROOT="$RESULTS_BASE/initializer-$SLURM_JOB_ID"
mkdir -m 0700 "$INIT_ROOT"
exec >"$INIT_ROOT/job.stdout.log" 2>"$INIT_ROOT/job.stderr.log"

# Generate all five frozen stage-0 campaigns before submitting any simulation.
# A generation failure therefore cannot leave a selectively launched search.
cd "$DRIVER_ROOT"
for RUN_INDEX in 0 1 2 3 4; do
    mkdir -m 0700 "$DESIGN_BASE/run-$RUN_INDEX"
    export STAGE=0
    export OPTIMIZER_RUN_INDEX="$RUN_INDEX"
    export RESEARCH_PRIVATE_ROLE_ROOT="$PRIVATE_ROLE_ROOT"
    export OUT_ROOT="$DESIGN_BASE/run-$RUN_INDEX/stage-0"
    export STAGE1_CAMPAIGN STAGE1_SCHEDULER_GATE STAGE1_ANALYSIS
    export BASELINE_PACKAGE_ROOT="$BASELINE_ROOT"
    export REQUIRE_EXTERNAL_BASELINE=true
    "$NODE_BIN" --es-module-specifier-resolution=node "$GENERATOR"
done

write_array_record() {
    local record_path=$1
    local run_index=$2
    local job_id=$3
    local shard_count=$4
    local campaign=$5
    RECORD_PATH="$record_path" RECORD_RUN_INDEX="$run_index" RECORD_JOB_ID="$job_id" \
        RECORD_SHARD_COUNT="$shard_count" RECORD_CAMPAIGN="$campaign" \
        RECORD_PARENT_JOB_ID="$SLURM_JOB_ID" "$NODE_BIN" --input-type=module <<'NODE'
import crypto from "node:crypto";
import fs from "node:fs";
const bytes = fs.readFileSync(process.env.RECORD_CAMPAIGN);
const record = {
    schemaVersion: 1,
    kind: "stage2_array_launch",
    generatedAt: new Date().toISOString(),
    schedulerAccount: "pi_jss233",
    jobId: process.env.RECORD_JOB_ID,
    parentInitializerJobId: process.env.RECORD_PARENT_JOB_ID,
    optimizerRunIndex: Number(process.env.RECORD_RUN_INDEX),
    stage: 0,
    shardCount: Number(process.env.RECORD_SHARD_COUNT),
    campaignPath: process.env.RECORD_CAMPAIGN,
    campaignSha256: crypto.createHash("sha256").update(bytes).digest("hex"),
};
fs.writeFileSync(process.env.RECORD_PATH, JSON.stringify(record, null, 2) + "\n", { flag: "wx", mode: 0o600 });
NODE
}

write_controller_record() {
    local record_path=$1
    local run_index=$2
    local job_id=$3
    local array_job_id=$4
    RECORD_PATH="$record_path" RECORD_RUN_INDEX="$run_index" RECORD_JOB_ID="$job_id" \
        RECORD_PARENT_JOB_ID="$array_job_id" "$NODE_BIN" --input-type=module <<'NODE'
import fs from "node:fs";
const record = {
    schemaVersion: 1,
    kind: "stage2_controller_launch",
    generatedAt: new Date().toISOString(),
    schedulerAccount: "pi_jss233",
    jobId: process.env.RECORD_JOB_ID,
    parentArrayJobId: process.env.RECORD_PARENT_JOB_ID,
    optimizerRunIndex: Number(process.env.RECORD_RUN_INDEX),
    stage: 0,
};
fs.writeFileSync(process.env.RECORD_PATH, JSON.stringify(record, null, 2) + "\n", { flag: "wx", mode: 0o600 });
NODE
}

for RUN_INDEX in 0 1 2 3 4; do
    CAMPAIGN_ROOT="$DESIGN_BASE/run-$RUN_INDEX/stage-0"
    CAMPAIGN="$CAMPAIGN_ROOT/campaign.json"
    EVIDENCE_BASE="$RESULTS_BASE/run-$RUN_INDEX/stage-0"
    SHARD_COUNT=$(wc -l < "$CAMPAIGN_ROOT/plan-files.txt")
    if [[ "$SHARD_COUNT" != "18" ]]; then
        echo "Run $RUN_INDEX Stage-2 stage 0 has $SHARD_COUNT shards, expected 18" >&2
        exit 2
    fi
    mkdir -m 0700 "$EVIDENCE_BASE"
    ARRAY_JOB_ID=$($SBATCH --parsable --array="0-17%20" \
        --export="ALL,CAMPAIGN_ROOT=$CAMPAIGN_ROOT,EVIDENCE_BASE=$EVIDENCE_BASE" \
        "$SHARD_JOB")
    ARRAY_JOB_ID=${ARRAY_JOB_ID%%;*}
    if [[ ! "$ARRAY_JOB_ID" =~ ^[1-9][0-9]*$ ]]; then
        echo "Run $RUN_INDEX initial array submission returned an invalid job ID" >&2
        exit 2
    fi
    write_array_record "$EVIDENCE_BASE/array-launch.json" "$RUN_INDEX" "$ARRAY_JOB_ID" "$SHARD_COUNT" "$CAMPAIGN"

    CONTROLLER_JOB_ID=$($SBATCH --parsable --dependency="afterok:$ARRAY_JOB_ID" \
        --export="ALL,OPTIMIZER_RUN_INDEX=$RUN_INDEX,STAGE=0,ARRAY_JOB_ID=$ARRAY_JOB_ID" \
        "$CONTROLLER_JOB")
    CONTROLLER_JOB_ID=${CONTROLLER_JOB_ID%%;*}
    if [[ ! "$CONTROLLER_JOB_ID" =~ ^[1-9][0-9]*$ ]]; then
        echo "Run $RUN_INDEX initial controller submission returned an invalid job ID" >&2
        exit 2
    fi
    write_controller_record "$EVIDENCE_BASE/controller-launch.json" "$RUN_INDEX" "$CONTROLLER_JOB_ID" "$ARRAY_JOB_ID"
done

export INIT_ROOT STAGE0_GATE STAGE1_CAMPAIGN STAGE1_SCHEDULER_GATE STAGE1_ANALYSIS SOURCE_COMMIT
"$NODE_BIN" --input-type=module <<'NODE'
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const launches = Array.from({ length: 5 }, (_, optimizerRunIndex) => {
    const root = path.join(path.dirname(process.env.INIT_ROOT), `run-${optimizerRunIndex}`, "stage-0");
    return {
        optimizerRunIndex,
        array: JSON.parse(fs.readFileSync(path.join(root, "array-launch.json"), "utf8")),
        controller: JSON.parse(fs.readFileSync(path.join(root, "controller-launch.json"), "utf8")),
    };
});
const output = {
    schemaVersion: 1,
    status: "LAUNCHED_ALL_FIVE_METHOD_V3_STAGE2_STAGE0_SEARCHES",
    generatedAt: new Date().toISOString(),
    schedulerAccount: "pi_jss233",
    initializerJobId: process.env.SLURM_JOB_ID,
    sourceGitCommit: process.env.SOURCE_COMMIT,
    stage0Gate: { path: process.env.STAGE0_GATE, sha256: sha256(process.env.STAGE0_GATE) },
    stage1Campaign: { path: process.env.STAGE1_CAMPAIGN, sha256: sha256(process.env.STAGE1_CAMPAIGN) },
    stage1SchedulerGate: { path: process.env.STAGE1_SCHEDULER_GATE, sha256: sha256(process.env.STAGE1_SCHEDULER_GATE) },
    stage1Analysis: { path: process.env.STAGE1_ANALYSIS, sha256: sha256(process.env.STAGE1_ANALYSIS) },
    launches,
};
fs.writeFileSync(path.join(process.env.INIT_ROOT, "launch-manifest.json"), JSON.stringify(output, null, 2) + "\n", {
    flag: "wx",
    mode: 0o600,
});
NODE
