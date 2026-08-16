#!/bin/bash
#SBATCH --job-name=chrono-finish-state-audit-gate
#SBATCH --account=pi_jss233
#SBATCH --partition=devel
#SBATCH --time=01:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=8G
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
export TZ=UTC LC_ALL=C PYTHONHASHSEED=0 PYTHONDONTWRITEBYTECODE=1
unset NODE_OPTIONS

REPO=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
DRIVER="$REPO/packages/chronodivide-bot-driver"
FINALIZER="$DRIVER/dist/training/finishAdvantageStateAuditAggregate.js"
: "${CAMPAIGN_PATH:?CAMPAIGN_PATH is required}"
: "${CAMPAIGN_SHA256:?CAMPAIGN_SHA256 is required}"
: "${RESULTS_ROOT:?RESULTS_ROOT is required}"
: "${ARRAY_JOB_ID:?ARRAY_JOB_ID is required}"
: "${CONTROLLER_ROOT:?CONTROLLER_ROOT is required}"
[[ "$ARRAY_JOB_ID" =~ ^[0-9]+$ && "$CAMPAIGN_SHA256" =~ ^[0-9a-f]{64}$ ]] || {
    echo "State-audit controller identifiers are invalid" >&2
    exit 2
}
[[ -f "$CAMPAIGN_PATH" && "$(sha256sum "$CAMPAIGN_PATH" | cut -d' ' -f1)" == "$CAMPAIGN_SHA256" ]] || {
    echo "State-audit campaign commitment drifted" >&2
    exit 2
}

JOB_LINE=$($SCONTROL show job -o "$SLURM_JOB_ID")
[[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) ]] || { echo "Missing account" >&2; exit 2; }
[[ "${BASH_REMATCH[2]}" == pi_jss233 ]] || { echo "Wrong account" >&2; exit 2; }
export SLURM_JOB_ACCOUNT=pi_jss233

[[ ! -e "$CONTROLLER_ROOT" ]] || { echo "Refusing to reuse controller root $CONTROLLER_ROOT" >&2; exit 2; }
install -d -m 0700 "$CONTROLLER_ROOT"
exec >"$CONTROLLER_ROOT/job.stdout.log" 2>"$CONTROLLER_ROOT/job.stderr.log"

cd "$REPO"
[[ "$(git branch --show-current)" == main && -z "$(git status --porcelain=v1 --untracked-files=no)" ]] || {
    echo "State-audit controller requires clean tracked main" >&2
    exit 2
}
cd "$DRIVER"
export CAMPAIGN="$CAMPAIGN_PATH"
export CAMPAIGN_SHA256
export RESULTS_ROOT
export ARRAY_JOB_ID
export OUT_FILE="$CONTROLLER_ROOT/state-audit-finalizer.json"
"$NODE_BIN" --es-module-specifier-resolution=node "$FINALIZER"
sha256sum "$OUT_FILE" >"$CONTROLLER_ROOT/state-audit-finalizer.sha256"
printf '%s\n' COMPLETE_FINISH_ADVANTAGE_OUTCOME_BLIND_STATE_AUDIT >"$CONTROLLER_ROOT/COMPLETE"
