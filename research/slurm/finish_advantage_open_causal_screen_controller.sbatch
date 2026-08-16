#!/bin/bash
#SBATCH --job-name=chrono-finish-open-finalize
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=02:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=12G
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
FINALIZER="$DRIVER/dist/training/finishAdvantageOpenCausalScreenFinalizer.js"
: "${CAMPAIGN:?CAMPAIGN is required}"
: "${CAMPAIGN_SHA256:?CAMPAIGN_SHA256 is required}"
: "${RESULTS_ROOT:?RESULTS_ROOT is required}"
: "${ARRAY_JOB_ID:?ARRAY_JOB_ID is required}"
: "${FINALIZER_ROOT:?FINALIZER_ROOT is required}"
: "${CONTROLLER_SCRIPT_SHA256:?CONTROLLER_SCRIPT_SHA256 is required}"
[[ "$CAMPAIGN_SHA256" =~ ^[0-9a-f]{64}$ && "$CONTROLLER_SCRIPT_SHA256" =~ ^[0-9a-f]{64}$ ]] || {
    echo "Invalid open-screen finalizer SHA-256 input" >&2
    exit 2
}
[[ "$ARRAY_JOB_ID" =~ ^[0-9]+$ && -f "$CAMPAIGN" && -f "$FINALIZER" ]] || {
    echo "Open-screen finalizer input is invalid" >&2
    exit 2
}
[[ "$(sha256sum "$0" | awk '{print $1}')" == "$CONTROLLER_SCRIPT_SHA256" ]] || {
    echo "Open-screen controller script commitment drifted" >&2
    exit 2
}

JOB_LINE=$($SCONTROL show job -o "$SLURM_JOB_ID")
[[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) ]] || { echo "Missing account" >&2; exit 2; }
[[ "${BASH_REMATCH[2]}" == pi_jss233 ]] || { echo "Wrong account" >&2; exit 2; }
export SLURM_JOB_ACCOUNT=pi_jss233

[[ ! -e "$FINALIZER_ROOT" ]] || { echo "Refusing to reuse $FINALIZER_ROOT" >&2; exit 2; }
install -d -m 0700 "$FINALIZER_ROOT"
exec >"$FINALIZER_ROOT/job.stdout.log" 2>"$FINALIZER_ROOT/job.stderr.log"

cd "$REPO"
[[ "$(git branch --show-current)" == main && -z "$(git status --porcelain=v1 --untracked-files=no)" ]] || {
    echo "Open-screen finalizer requires clean tracked main" >&2
    exit 2
}
cd "$DRIVER"
export CAMPAIGN CAMPAIGN_SHA256 RESULTS_ROOT ARRAY_JOB_ID
export OUT_FILE="$FINALIZER_ROOT/open-causal-screen-finalizer.json"
"$NODE_BIN" --es-module-specifier-resolution=node "$FINALIZER"
sha256sum "$OUT_FILE" >"$FINALIZER_ROOT/open-causal-screen-finalizer.sha256"
printf '%s\n' COMPLETE_FINISH_ADVANTAGE_OPEN_CAUSAL_SCREEN_FINALIZER >"$FINALIZER_ROOT/COMPLETE"
