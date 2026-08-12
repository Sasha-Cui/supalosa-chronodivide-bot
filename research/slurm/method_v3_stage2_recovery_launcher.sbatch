#!/bin/bash
#SBATCH --job-name=chrono-v3-s2-recover
#SBATCH --account=pi_jss233
#SBATCH --partition=devel
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
PRIMARY_DESIGN_BASE=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/design/method-v3-stage2-optimizer-v1
PRIMARY_RESULTS_BASE=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/method-v3/stage2-optimizer-v1
DESIGN_BASE=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/design/method-v3-stage2-recovery-v1
RESULTS_BASE=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/method-v3/stage2-recovery-v1
STAGE1_CAMPAIGN=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/design/method-v3-stage1-mechanism-v2/campaign.json
STAGE1_SCHEDULER_GATE=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/method-v3/stage1-mechanism-v1/scheduler-gate.json
STAGE1_ANALYSIS=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/method-v3/stage1-mechanism-v1/analysis.json
RECOVERY_AUDIT_ROOT="$PRIMARY_RESULTS_BASE/recovery-audit"
GENERATOR="$DRIVER_ROOT/dist/training/methodV3Stage2PlanGenerator.js"
SHARD_JOB="$REPO/research/slurm/method_v3_stage2_optimizer_shard.sbatch"
CONTROLLER_JOB="$REPO/research/slurm/method_v3_stage2_controller.sbatch"

: "${STAGE0_JOB_ID:?STAGE0_JOB_ID must identify the passed all-country interface diagnostic on this source}"
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
    echo "Refusing Stage-2 recovery launch under account $JOB_ACCOUNT" >&2
    exit 2
fi

for required in "$NODE_BIN" "$SBATCH" "$STAGE0_GATE" "$STAGE1_CAMPAIGN" "$STAGE1_SCHEDULER_GATE" \
    "$STAGE1_ANALYSIS" "$GENERATOR" "$SHARD_JOB" "$CONTROLLER_JOB" \
    "$RECOVERY_AUDIT_ROOT/run-0-stage-2.json" "$RECOVERY_AUDIT_ROOT/run-3-stage-2.json" \
    "$PRIVATE_ROLE_ROOT/train-families.json" "$BASELINE_ROOT/dist/bot/bot.js"; do
    if [[ ! -e "$required" ]]; then
        echo "Missing Stage-2 recovery input: $required" >&2
        exit 2
    fi
done
if [[ -e "$DESIGN_BASE" || -e "$RESULTS_BASE" ]]; then
    echo "Refusing to reuse a Stage-2 recovery design or evidence base" >&2
    exit 2
fi

cd "$REPO"
SOURCE_COMMIT=$(git rev-parse HEAD)
if [[ "$(git branch --show-current)" != "main" || -n "$(git status --porcelain=v1 --untracked-files=no)" ]]; then
    echo "Stage-2 recovery requires a clean tracked main checkout" >&2
    exit 2
fi

export STAGE0_GATE STAGE0_JOB_ID SOURCE_COMMIT RECOVERY_AUDIT_ROOT
"$NODE_BIN" --input-type=module <<'NODE'
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
const sha = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const gate = JSON.parse(fs.readFileSync(process.env.STAGE0_GATE, "utf8"));
if (
    gate.schemaVersion !== 1 ||
    gate.status !== "PASS_OUTCOME_FREE_METHOD_V3_STAGE0_COUNTRY_INTERFACE" ||
    gate.passed !== true ||
    gate.outcomeFree !== true ||
    String(gate.scheduler?.jobId) !== process.env.STAGE0_JOB_ID ||
    gate.scheduler?.account !== "pi_jss233" ||
    gate.sourceGitCommit !== process.env.SOURCE_COMMIT ||
    gate.countryCount !== 9 || gate.reciprocalSlotCount !== 2 ||
    gate.matchCount !== 18 || gate.maxTicks !== 1200 || gate.finisherActivationCount !== 18
) throw new Error("The all-country Stage-0 gate does not authorize this recovery source");
const expected = new Map([
    [0, { sha256: "9728b7859b2e580dc0df724cdd6a5804a1638592194ea3ba60113c7c95f5427a", completed: 185, cancelled: 12, jobId: "22024004" }],
    [3, { sha256: "28ec158cc141e89a29d2bac9680cbe1c7c4136f65afe12de6d487e813a9bca8e", completed: 181, cancelled: 16, jobId: "22025430" }],
]);
for (const [runIndex, spec] of expected) {
    const file = path.join(process.env.RECOVERY_AUDIT_ROOT, `run-${runIndex}-stage-2.json`);
    const audit = JSON.parse(fs.readFileSync(file, "utf8"));
    if (
        sha(file) !== spec.sha256 ||
        audit.status !== "INVALIDATED_COMPLETE_STAGE_REQUIRES_PROSPECTIVE_RECOVERY" ||
        audit.optimizerRunIndex !== runIndex || audit.stage !== 2 ||
        audit.schedulerAccount !== "pi_jss233" || audit.arrayLaunch?.jobId !== spec.jobId ||
        audit.schedulerTaskCount !== 198 || audit.completedTaskCount !== spec.completed ||
        audit.failedTaskCount !== 1 || audit.cancelledTaskCount !== spec.cancelled ||
        audit.failedTask?.jobId !== `${spec.jobId}_197` || audit.failedTask?.exitCode !== "141:0" ||
        audit.failureClass !== "PRE_GAME_SLURM_ACCOUNT_PARSER_SIGPIPE" ||
        audit.failedBeforeEvidenceDirectoryCreation !== true ||
        audit.outcomeInspectionForRecoveryDecision !== "none"
    ) throw new Error(`Run ${runIndex} invalidation audit changed or is incomplete`);
}
NODE

mkdir -m 0700 "$DESIGN_BASE"
mkdir -m 0700 "$RESULTS_BASE"
LAUNCH_ROOT="$RESULTS_BASE/launcher-$SLURM_JOB_ID"
mkdir -m 0700 "$LAUNCH_ROOT"
exec >"$LAUNCH_ROOT/job.stdout.log" 2>"$LAUNCH_ROOT/job.stderr.log"

# Freeze both complete replacement campaigns before submitting either simulation.
cd "$DRIVER_ROOT"
for RUN_INDEX in 0 3; do
    mkdir -m 0700 "$DESIGN_BASE/run-$RUN_INDEX"
    export STAGE=2
    export OPTIMIZER_RUN_INDEX="$RUN_INDEX"
    export METHOD_V3_STAGE2_CAMPAIGN_VERSION=stage2-recovery-v1
    export RESEARCH_PRIVATE_ROLE_ROOT="$PRIVATE_ROLE_ROOT"
    export OUT_ROOT="$DESIGN_BASE/run-$RUN_INDEX/stage-2"
    export PARENT_CAMPAIGN="$PRIMARY_DESIGN_BASE/run-$RUN_INDEX/stage-1/campaign.json"
    export SURVIVOR_FILE="$PRIMARY_RESULTS_BASE/run-$RUN_INDEX/stage-1/survivors.json"
    export STAGE1_CAMPAIGN STAGE1_SCHEDULER_GATE STAGE1_ANALYSIS
    export BASELINE_PACKAGE_ROOT="$BASELINE_ROOT"
    export REQUIRE_EXTERNAL_BASELINE=true
    "$NODE_BIN" --es-module-specifier-resolution=node "$GENERATOR"
done

write_array_record() {
    local record_path=$1 run_index=$2 job_id=$3 shard_count=$4 campaign=$5
    RECORD_PATH="$record_path" RECORD_RUN_INDEX="$run_index" RECORD_JOB_ID="$job_id" \
        RECORD_SHARD_COUNT="$shard_count" RECORD_CAMPAIGN="$campaign" RECORD_PARENT_JOB_ID="$SLURM_JOB_ID" \
        "$NODE_BIN" --input-type=module <<'NODE'
import crypto from "node:crypto";
import fs from "node:fs";
const bytes = fs.readFileSync(process.env.RECORD_CAMPAIGN);
const record = {
    schemaVersion: 1, kind: "stage2_array_launch", generatedAt: new Date().toISOString(),
    schedulerAccount: "pi_jss233", jobId: process.env.RECORD_JOB_ID,
    parentRecoveryLauncherJobId: process.env.RECORD_PARENT_JOB_ID,
    optimizerRunIndex: Number(process.env.RECORD_RUN_INDEX), stage: 2,
    shardCount: Number(process.env.RECORD_SHARD_COUNT), campaignPath: process.env.RECORD_CAMPAIGN,
    campaignSha256: crypto.createHash("sha256").update(bytes).digest("hex"),
};
fs.writeFileSync(process.env.RECORD_PATH, JSON.stringify(record, null, 2) + "\n", { flag: "wx", mode: 0o600 });
NODE
}

write_controller_record() {
    local record_path=$1 run_index=$2 job_id=$3 array_job_id=$4
    RECORD_PATH="$record_path" RECORD_RUN_INDEX="$run_index" RECORD_JOB_ID="$job_id" \
        RECORD_PARENT_JOB_ID="$array_job_id" "$NODE_BIN" --input-type=module <<'NODE'
import fs from "node:fs";
const record = {
    schemaVersion: 1, kind: "stage2_controller_launch", generatedAt: new Date().toISOString(),
    schedulerAccount: "pi_jss233", jobId: process.env.RECORD_JOB_ID,
    parentArrayJobId: process.env.RECORD_PARENT_JOB_ID,
    optimizerRunIndex: Number(process.env.RECORD_RUN_INDEX), stage: 2,
};
fs.writeFileSync(process.env.RECORD_PATH, JSON.stringify(record, null, 2) + "\n", { flag: "wx", mode: 0o600 });
NODE
}

for RUN_INDEX in 0 3; do
    CAMPAIGN_ROOT="$DESIGN_BASE/run-$RUN_INDEX/stage-2"
    CAMPAIGN="$CAMPAIGN_ROOT/campaign.json"
    EVIDENCE_BASE="$RESULTS_BASE/run-$RUN_INDEX/stage-2"
    SHARD_COUNT=$(wc -l < "$CAMPAIGN_ROOT/plan-files.txt")
    if [[ "$SHARD_COUNT" != "198" ]]; then
        echo "Recovery run $RUN_INDEX has $SHARD_COUNT shards, expected 198" >&2
        exit 2
    fi
    mkdir -p -m 0700 "$(dirname "$EVIDENCE_BASE")"
    mkdir -m 0700 "$EVIDENCE_BASE"
    ARRAY_JOB_ID=$($SBATCH --parsable --array="0-197%20" \
        --export="ALL,CAMPAIGN_ROOT=$CAMPAIGN_ROOT,EVIDENCE_BASE=$EVIDENCE_BASE" "$SHARD_JOB")
    ARRAY_JOB_ID=${ARRAY_JOB_ID%%;*}
    [[ "$ARRAY_JOB_ID" =~ ^[1-9][0-9]*$ ]] || { echo "Invalid recovery array job ID" >&2; exit 2; }
    write_array_record "$EVIDENCE_BASE/array-launch.json" "$RUN_INDEX" "$ARRAY_JOB_ID" "$SHARD_COUNT" "$CAMPAIGN"

    CONTROLLER_JOB_ID=$($SBATCH --parsable --dependency="afterok:$ARRAY_JOB_ID" \
        --export="ALL,METHOD_V3_STAGE2_DESIGN_BASE=$DESIGN_BASE,METHOD_V3_STAGE2_RESULTS_BASE=$RESULTS_BASE,OPTIMIZER_RUN_INDEX=$RUN_INDEX,STAGE=2,ARRAY_JOB_ID=$ARRAY_JOB_ID" \
        "$CONTROLLER_JOB")
    CONTROLLER_JOB_ID=${CONTROLLER_JOB_ID%%;*}
    [[ "$CONTROLLER_JOB_ID" =~ ^[1-9][0-9]*$ ]] || { echo "Invalid recovery controller job ID" >&2; exit 2; }
    write_controller_record "$EVIDENCE_BASE/controller-launch.json" "$RUN_INDEX" "$CONTROLLER_JOB_ID" "$ARRAY_JOB_ID"
done

export LAUNCH_ROOT DESIGN_BASE RESULTS_BASE STAGE0_GATE SOURCE_COMMIT
"$NODE_BIN" --input-type=module <<'NODE'
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
const sha = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const launches = [0, 3].map((optimizerRunIndex) => {
    const root = path.join(process.env.RESULTS_BASE, `run-${optimizerRunIndex}`, "stage-2");
    return {
        optimizerRunIndex,
        array: JSON.parse(fs.readFileSync(path.join(root, "array-launch.json"), "utf8")),
        controller: JSON.parse(fs.readFileSync(path.join(root, "controller-launch.json"), "utf8")),
    };
});
const output = {
    schemaVersion: 1, status: "LAUNCHED_COMPLETE_METHOD_V3_STAGE2_RECOVERY_V1",
    generatedAt: new Date().toISOString(), schedulerAccount: "pi_jss233",
    launcherJobId: process.env.SLURM_JOB_ID, sourceGitCommit: process.env.SOURCE_COMMIT,
    stage0Gate: { path: process.env.STAGE0_GATE, sha256: sha(process.env.STAGE0_GATE) },
    campaignVersion: "stage2-recovery-v1", optimizerRunIndices: [0, 3],
    replacementGameCountPerRun: 1188, partialPrimaryEvidenceExcluded: true, launches,
};
fs.writeFileSync(path.join(process.env.LAUNCH_ROOT, "launch-manifest.json"), JSON.stringify(output, null, 2) + "\n", {
    flag: "wx", mode: 0o600,
});
NODE
