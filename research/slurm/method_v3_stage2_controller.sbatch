#!/bin/bash
#SBATCH --job-name=chrono-v3-s2-control
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=02:00:00
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
GATE_PROGRAM="$DRIVER_ROOT/dist/training/methodV3Stage2TechnicalGate.js"
REDUCER="$DRIVER_ROOT/dist/training/methodV3Stage2StageReducer.js"
FINALIZER="$DRIVER_ROOT/dist/training/methodV3Stage2Finalizer.js"
SHARD_JOB="$REPO/research/slurm/method_v3_stage2_optimizer_shard.sbatch"
CONTROLLER_JOB="$REPO/research/slurm/method_v3_stage2_controller.sbatch"

: "${OPTIMIZER_RUN_INDEX:?OPTIMIZER_RUN_INDEX is required}"
: "${STAGE:?STAGE is required}"
: "${ARRAY_JOB_ID:?ARRAY_JOB_ID is required}"
if [[ ! "$OPTIMIZER_RUN_INDEX" =~ ^[0-4]$ || ! "$STAGE" =~ ^[0-2]$ || ! "$ARRAY_JOB_ID" =~ ^[1-9][0-9]*$ ]]; then
    echo "Invalid optimizer run, stage, or parent array job ID" >&2
    exit 2
fi

CAMPAIGN_ROOT="$DESIGN_BASE/run-$OPTIMIZER_RUN_INDEX/stage-$STAGE"
EVIDENCE_BASE="$RESULTS_BASE/run-$OPTIMIZER_RUN_INDEX/stage-$STAGE"
CAMPAIGN="$CAMPAIGN_ROOT/campaign.json"
ARRAY_LAUNCH="$EVIDENCE_BASE/array-launch.json"
CONTROLLER_LAUNCH="$EVIDENCE_BASE/controller-launch.json"
GATE="$EVIDENCE_BASE/technical-gate.json"
SURVIVOR="$EVIDENCE_BASE/survivors.json"
RUN_FINALIZER="$EVIDENCE_BASE/run-finalizer.json"
CONTROL_ROOT="$EVIDENCE_BASE/controller-${SLURM_JOB_ID:?SLURM_JOB_ID is required}"
if [[ -e "$CONTROL_ROOT" ]]; then
    echo "Refusing to reuse Stage-2 controller evidence $CONTROL_ROOT" >&2
    exit 2
fi
mkdir -m 0700 "$CONTROL_ROOT"
exec >"$CONTROL_ROOT/job.stdout.log" 2>"$CONTROL_ROOT/job.stderr.log"

JOB_LINE=$($SCONTROL show job -o "$SLURM_JOB_ID")
JOB_ACCOUNT=$(tr ' ' '\n' <<< "$JOB_LINE" | awk -F= '$1 == "Account" {print $2; exit}')
if [[ "$JOB_ACCOUNT" != "pi_jss233" ]]; then
    echo "Refusing Stage-2 control under account $JOB_ACCOUNT" >&2
    exit 2
fi
for required in "$NODE_BIN" "$SBATCH" "$CAMPAIGN" "$ARRAY_LAUNCH" "$CONTROLLER_LAUNCH" \
    "$STAGE1_CAMPAIGN" "$STAGE1_SCHEDULER_GATE" "$STAGE1_ANALYSIS" \
    "$GENERATOR" "$GATE_PROGRAM" "$REDUCER" "$FINALIZER" "$SHARD_JOB" "$CONTROLLER_JOB" \
    "$PRIVATE_ROLE_ROOT/train-families.json" "$BASELINE_ROOT/dist/bot/bot.js"; do
    if [[ ! -e "$required" ]]; then
        echo "Missing Stage-2 controller input: $required" >&2
        exit 2
    fi
done
if [[ -e "$GATE" || -e "$SURVIVOR" || -e "$RUN_FINALIZER" ]]; then
    echo "Refusing to overwrite an existing Stage-2 gate, reduction, or finalizer" >&2
    exit 2
fi

export CAMPAIGN ARRAY_LAUNCH CONTROLLER_LAUNCH ARRAY_JOB_ID OPTIMIZER_RUN_INDEX STAGE
"$NODE_BIN" --input-type=module <<'NODE'
import crypto from "node:crypto";
import fs from "node:fs";
const campaignBytes = fs.readFileSync(process.env.CAMPAIGN);
const launch = JSON.parse(fs.readFileSync(process.env.ARRAY_LAUNCH, "utf8"));
const controller = JSON.parse(fs.readFileSync(process.env.CONTROLLER_LAUNCH, "utf8"));
if (
    launch.schemaVersion !== 1 ||
    launch.kind !== "stage2_array_launch" ||
    launch.schedulerAccount !== "pi_jss233" ||
    String(launch.jobId) !== process.env.ARRAY_JOB_ID ||
    launch.optimizerRunIndex !== Number(process.env.OPTIMIZER_RUN_INDEX) ||
    launch.stage !== Number(process.env.STAGE) ||
    launch.campaignPath !== process.env.CAMPAIGN ||
    launch.campaignSha256 !== crypto.createHash("sha256").update(campaignBytes).digest("hex")
) {
    throw new Error("Stage-2 controller parent array launch record is missing or mismatched");
}
if (
    controller.schemaVersion !== 1 ||
    controller.kind !== "stage2_controller_launch" ||
    controller.schedulerAccount !== "pi_jss233" ||
    String(controller.jobId) !== process.env.SLURM_JOB_ID ||
    String(controller.parentArrayJobId) !== process.env.ARRAY_JOB_ID ||
    controller.optimizerRunIndex !== Number(process.env.OPTIMIZER_RUN_INDEX) ||
    controller.stage !== Number(process.env.STAGE)
) {
    throw new Error("Stage-2 controller launch record is missing or mismatched");
}
NODE
cd "$REPO"
if [[ "$(git branch --show-current)" != "main" || -n "$(git status --porcelain=v1 --untracked-files=no)" ]]; then
    echo "Stage-2 control requires a clean tracked main checkout" >&2
    exit 2
fi

cd "$DRIVER_ROOT"
export CAMPAIGN RESULTS_ROOT="$EVIDENCE_BASE" ARRAY_JOB_ID
export OUT_FILE="$GATE"
"$NODE_BIN" --es-module-specifier-resolution=node "$GATE_PROGRAM"

if [[ "$STAGE" == "2" ]]; then
    export TECHNICAL_GATE="$GATE"
    export OUT_FILE="$RUN_FINALIZER"
    "$NODE_BIN" --es-module-specifier-resolution=node "$FINALIZER"
    exit 0
fi

export TECHNICAL_GATE="$GATE"
export OUT_FILE="$SURVIVOR"
"$NODE_BIN" --es-module-specifier-resolution=node "$REDUCER"

NEXT_STAGE=$((STAGE + 1))
NEXT_CAMPAIGN_ROOT="$DESIGN_BASE/run-$OPTIMIZER_RUN_INDEX/stage-$NEXT_STAGE"
NEXT_EVIDENCE_BASE="$RESULTS_BASE/run-$OPTIMIZER_RUN_INDEX/stage-$NEXT_STAGE"
if [[ -e "$NEXT_CAMPAIGN_ROOT" || -e "$NEXT_EVIDENCE_BASE" ]]; then
    echo "Refusing to reuse next-stage design or evidence roots" >&2
    exit 2
fi
export STAGE="$NEXT_STAGE"
export OPTIMIZER_RUN_INDEX
export RESEARCH_PRIVATE_ROLE_ROOT="$PRIVATE_ROLE_ROOT"
export OUT_ROOT="$NEXT_CAMPAIGN_ROOT"
export STAGE1_CAMPAIGN STAGE1_SCHEDULER_GATE STAGE1_ANALYSIS
export PARENT_CAMPAIGN="$CAMPAIGN"
export SURVIVOR_FILE="$SURVIVOR"
export BASELINE_PACKAGE_ROOT="$BASELINE_ROOT"
export REQUIRE_EXTERNAL_BASELINE=true
"$NODE_BIN" --es-module-specifier-resolution=node "$GENERATOR"

SHARD_COUNT=$(wc -l < "$NEXT_CAMPAIGN_ROOT/plan-files.txt")
if [[ ! "$SHARD_COUNT" =~ ^[1-9][0-9]*$ ]]; then
    echo "Generated Stage-2 campaign has an invalid shard count" >&2
    exit 2
fi
mkdir -m 0700 "$NEXT_EVIDENCE_BASE"
NEXT_ARRAY_JOB_ID=$($SBATCH --parsable --array="0-$((SHARD_COUNT - 1))%20" \
    --export="ALL,CAMPAIGN_ROOT=$NEXT_CAMPAIGN_ROOT,EVIDENCE_BASE=$NEXT_EVIDENCE_BASE" \
    "$SHARD_JOB")
NEXT_ARRAY_JOB_ID=${NEXT_ARRAY_JOB_ID%%;*}
if [[ ! "$NEXT_ARRAY_JOB_ID" =~ ^[1-9][0-9]*$ ]]; then
    echo "Stage-2 next-array submission returned an invalid job ID" >&2
    exit 2
fi
export RECORD_PATH="$NEXT_EVIDENCE_BASE/array-launch.json"
export RECORD_KIND=stage2_array_launch
export RECORD_JOB_ID="$NEXT_ARRAY_JOB_ID"
export RECORD_PARENT_JOB_ID="$SLURM_JOB_ID"
export RECORD_RUN_INDEX="$OPTIMIZER_RUN_INDEX"
export RECORD_STAGE="$NEXT_STAGE"
export RECORD_SHARD_COUNT="$SHARD_COUNT"
export RECORD_CAMPAIGN="$NEXT_CAMPAIGN_ROOT/campaign.json"
"$NODE_BIN" --input-type=module <<'NODE'
import crypto from "node:crypto";
import fs from "node:fs";
const bytes = fs.readFileSync(process.env.RECORD_CAMPAIGN);
const record = {
    schemaVersion: 1,
    kind: process.env.RECORD_KIND,
    generatedAt: new Date().toISOString(),
    schedulerAccount: "pi_jss233",
    jobId: process.env.RECORD_JOB_ID,
    parentControllerJobId: process.env.RECORD_PARENT_JOB_ID,
    optimizerRunIndex: Number(process.env.RECORD_RUN_INDEX),
    stage: Number(process.env.RECORD_STAGE),
    shardCount: Number(process.env.RECORD_SHARD_COUNT),
    campaignPath: process.env.RECORD_CAMPAIGN,
    campaignSha256: crypto.createHash("sha256").update(bytes).digest("hex"),
};
fs.writeFileSync(process.env.RECORD_PATH, JSON.stringify(record, null, 2) + "\n", { flag: "wx", mode: 0o600 });
NODE

NEXT_CONTROLLER_JOB_ID=$($SBATCH --parsable --dependency="afterok:$NEXT_ARRAY_JOB_ID" \
    --export="ALL,OPTIMIZER_RUN_INDEX=$OPTIMIZER_RUN_INDEX,STAGE=$NEXT_STAGE,ARRAY_JOB_ID=$NEXT_ARRAY_JOB_ID" \
    "$CONTROLLER_JOB")
NEXT_CONTROLLER_JOB_ID=${NEXT_CONTROLLER_JOB_ID%%;*}
if [[ ! "$NEXT_CONTROLLER_JOB_ID" =~ ^[1-9][0-9]*$ ]]; then
    echo "Stage-2 next-controller submission returned an invalid job ID" >&2
    exit 2
fi
export RECORD_PATH="$NEXT_EVIDENCE_BASE/controller-launch.json"
export RECORD_KIND=stage2_controller_launch
export RECORD_JOB_ID="$NEXT_CONTROLLER_JOB_ID"
export RECORD_PARENT_JOB_ID="$NEXT_ARRAY_JOB_ID"
"$NODE_BIN" --input-type=module <<'NODE'
import fs from "node:fs";
const record = {
    schemaVersion: 1,
    kind: process.env.RECORD_KIND,
    generatedAt: new Date().toISOString(),
    schedulerAccount: "pi_jss233",
    jobId: process.env.RECORD_JOB_ID,
    parentArrayJobId: process.env.RECORD_PARENT_JOB_ID,
    optimizerRunIndex: Number(process.env.RECORD_RUN_INDEX),
    stage: Number(process.env.RECORD_STAGE),
};
fs.writeFileSync(process.env.RECORD_PATH, JSON.stringify(record, null, 2) + "\n", { flag: "wx", mode: 0o600 });
NODE
