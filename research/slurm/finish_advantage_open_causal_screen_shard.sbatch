#!/bin/bash
#SBATCH --job-name=chrono-finish-open
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=12:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=8G
#SBATCH --array=0-89%64
#SBATCH --output=/dev/null
#SBATCH --error=/dev/null

set -euo pipefail
umask 077

NODE_RUNTIME_ROOT=/apps/software/2024a/software/nodejs/20.13.1-GCCcore-13.3.0
ICU_RUNTIME_ROOT=/apps/software/2024a/software/ICU/75.1-GCCcore-13.3.0
GCC_RUNTIME_ROOT=/apps/software/system/software/GCCcore/13.3.0
OPENSSL_RUNTIME_ROOT=/apps/software/system/software/OpenSSL/3
NODE_BIN="$NODE_RUNTIME_ROOT/bin/node"
SCONTROL=/opt/slurm/current/bin/scontrol
export PATH="$NODE_RUNTIME_ROOT/bin:/opt/slurm/current/bin:/usr/local/bin:/usr/bin:/bin"
export LD_LIBRARY_PATH="$ICU_RUNTIME_ROOT/lib:$GCC_RUNTIME_ROOT/lib64:$OPENSSL_RUNTIME_ROOT/lib64:$NODE_RUNTIME_ROOT/lib"
export TZ=UTC LC_ALL=C PYTHONHASHSEED=0 PYTHONDONTWRITEBYTECODE=1 DEBUG_LOGGING=0
unset NODE_OPTIONS

REPO=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
DRIVER="$REPO/packages/chronodivide-bot-driver"
BASELINE=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/supalosa-chronodivide-bot/packages/chronodivide-bot
RUNNER="$DRIVER/dist/training/finishAdvantageOpenCausalScreenCell.js"
: "${CAMPAIGN:?CAMPAIGN is required}"
: "${CAMPAIGN_SHA256:?CAMPAIGN_SHA256 is required}"
: "${RESULTS_ROOT:?RESULTS_ROOT is required}"
: "${SHARD_SCRIPT_SHA256:?SHARD_SCRIPT_SHA256 is required}"
[[ "$CAMPAIGN_SHA256" =~ ^[0-9a-f]{64}$ && "$SHARD_SCRIPT_SHA256" =~ ^[0-9a-f]{64}$ ]] || {
    echo "Invalid open-screen SHA-256 input" >&2
    exit 2
}
[[ -f "$CAMPAIGN" && -f "$RUNNER" ]] || { echo "Open-screen campaign or runner is missing" >&2; exit 2; }
[[ "$(sha256sum "$0" | awk '{print $1}')" == "$SHARD_SCRIPT_SHA256" ]] || {
    echo "Open-screen shard script commitment drifted" >&2
    exit 2
}

JOB_LINE=$($SCONTROL show job -o "$SLURM_JOB_ID")
[[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) ]] || { echo "Missing account" >&2; exit 2; }
[[ "${BASH_REMATCH[2]}" == pi_jss233 ]] || { echo "Wrong account" >&2; exit 2; }
export SLURM_JOB_ACCOUNT=pi_jss233

TASK_INDEX=${SLURM_ARRAY_TASK_ID:?SLURM_ARRAY_TASK_ID is required}
[[ "$TASK_INDEX" =~ ^[0-9]+$ && "$TASK_INDEX" -lt 90 ]] || { echo "Invalid task index" >&2; exit 2; }
TASK_ROOT="$RESULTS_ROOT/task-$(printf '%03d' "$TASK_INDEX")"
[[ ! -e "$TASK_ROOT" ]] || { echo "Refusing to reuse $TASK_ROOT" >&2; exit 2; }
install -d -m 0700 "$TASK_ROOT"
exec >"$TASK_ROOT/job.stdout.log" 2>"$TASK_ROOT/job.stderr.log"

cd "$REPO"
[[ "$(git branch --show-current)" == main && -z "$(git status --porcelain=v1 --untracked-files=no)" ]] || {
    echo "Open-screen shard requires clean tracked main" >&2
    exit 2
}
cd "$DRIVER"
export CAMPAIGN CAMPAIGN_SHA256 TASK_INDEX
export OUT_DIR="$TASK_ROOT/run"
export BASELINE_PACKAGE_ROOT="$BASELINE"
export REQUIRE_EXTERNAL_BASELINE=true
"$NODE_BIN" --es-module-specifier-resolution=node "$RUNNER"
sha256sum "$OUT_DIR/manifest.json" "$OUT_DIR/events.jsonl" "$OUT_DIR/summary.json" >"$TASK_ROOT/artifacts.sha256"
printf '%s\n' COMPLETE_FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_SHARD >"$TASK_ROOT/COMPLETE"
