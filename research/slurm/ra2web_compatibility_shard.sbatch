#!/bin/bash
#SBATCH --job-name=chrono-ra2web-compat
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=03:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=6G
#SBATCH --array=0-17%18
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
RUNNER="$DRIVER/dist/training/ra2WebCompatibilityCell.js"
: "${CAMPAIGN_PATH:?CAMPAIGN_PATH is required}"
: "${CAMPAIGN_SHA256:?CAMPAIGN_SHA256 is required}"
: "${RESULTS_ROOT:?RESULTS_ROOT is required}"
[[ "$CAMPAIGN_SHA256" =~ ^[0-9a-f]{64}$ ]] || { echo "Invalid campaign SHA-256" >&2; exit 2; }
TASK_ID=${SLURM_ARRAY_TASK_ID:?SLURM_ARRAY_TASK_ID is required}
[[ "$TASK_ID" =~ ^[0-9]+$ && "$TASK_ID" -lt 18 ]] || { echo "Invalid task ID" >&2; exit 2; }
[[ -f "$CAMPAIGN_PATH" && "$(sha256sum "$CAMPAIGN_PATH" | cut -d' ' -f1)" == "$CAMPAIGN_SHA256" ]] || {
    echo "RA2Web compatibility campaign commitment drifted" >&2
    exit 2
}

JOB_LINE=$($SCONTROL show job -o "$SLURM_JOB_ID")
[[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) ]] || { echo "Missing account" >&2; exit 2; }
[[ "${BASH_REMATCH[2]}" == pi_jss233 ]] || { echo "Wrong account" >&2; exit 2; }
export SLURM_JOB_ACCOUNT=pi_jss233

cd "$REPO"
[[ "$(git branch --show-current)" == main && -z "$(git status --porcelain=v1 --untracked-files=no)" ]] || {
    echo "RA2Web compatibility requires clean tracked main" >&2
    exit 2
}
[[ "$(git rev-parse HEAD)" == "$(git rev-parse fork/main)" ]] || {
    echo "RA2Web compatibility requires pushed fork/main" >&2
    exit 2
}
TASK_LABEL=$(printf '%02d' "$TASK_ID")
JOB_ROOT="$RESULTS_ROOT/task-$TASK_LABEL"
[[ ! -e "$JOB_ROOT" ]] || { echo "Refusing to reuse RA2Web task root $JOB_ROOT" >&2; exit 2; }
install -d -m 0700 "$RESULTS_ROOT"
mkdir -m 0700 "$JOB_ROOT"
exec >"$JOB_ROOT/job.stdout.log" 2>"$JOB_ROOT/job.stderr.log"

cd "$DRIVER"
export CAMPAIGN_PATH CAMPAIGN_SHA256
export OUT_FILE="$JOB_ROOT/cell.json"
export BASELINE_PACKAGE_ROOT="$BASELINE"
export REQUIRE_EXTERNAL_BASELINE=true
"$NODE_BIN" --es-module-specifier-resolution=node "$RUNNER"
sha256sum "$OUT_FILE" >"$JOB_ROOT/cell.sha256"
printf '%s\n' COMPLETE_RA2WEB_OUTCOME_BLIND_COMPATIBILITY_CELL >"$JOB_ROOT/COMPLETE"
