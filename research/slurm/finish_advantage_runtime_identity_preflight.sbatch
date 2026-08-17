#!/bin/bash
#SBATCH --job-name=chrono-finish-runtime-preflight
#SBATCH --account=pi_jss233
#SBATCH --partition=devel
#SBATCH --time=00:10:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=4G
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
BASELINE=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/supalosa-chronodivide-bot/packages/chronodivide-bot
RUNNER="$DRIVER/dist/training/finishAdvantageRuntimeIdentityPreflight.js"
: "${CAMPAIGN_PATH:?CAMPAIGN_PATH is required}"
: "${CAMPAIGN_SHA256:?CAMPAIGN_SHA256 is required}"
: "${PREFLIGHT_ROOT:?PREFLIGHT_ROOT is required}"
[[ "$CAMPAIGN_SHA256" =~ ^[0-9a-f]{64}$ ]] || { echo "Invalid campaign SHA-256" >&2; exit 2; }
[[ -f "$CAMPAIGN_PATH" && "$(sha256sum "$CAMPAIGN_PATH" | cut -d' ' -f1)" == "$CAMPAIGN_SHA256" ]] || {
    echo "Runtime-preflight campaign commitment drifted" >&2
    exit 2
}

JOB_LINE=$($SCONTROL show job -o "$SLURM_JOB_ID")
[[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) ]] || { echo "Missing account" >&2; exit 2; }
[[ "${BASH_REMATCH[2]}" == pi_jss233 ]] || { echo "Wrong account" >&2; exit 2; }
export SLURM_JOB_ACCOUNT=pi_jss233

cd "$REPO"
[[ "$(git branch --show-current)" == main && -z "$(git status --porcelain=v1 --untracked-files=no)" ]] || {
    echo "Runtime preflight requires clean tracked main" >&2
    exit 2
}
[[ "$(git rev-parse HEAD)" == "$(git rev-parse fork/main)" ]] || {
    echo "Runtime preflight requires pushed fork/main" >&2
    exit 2
}
[[ ! -e "$PREFLIGHT_ROOT" ]] || { echo "Refusing to reuse preflight root $PREFLIGHT_ROOT" >&2; exit 2; }
install -d -m 0700 "$PREFLIGHT_ROOT"
exec >"$PREFLIGHT_ROOT/job.stdout.log" 2>"$PREFLIGHT_ROOT/job.stderr.log"

cd "$DRIVER"
export BASELINE_PACKAGE_ROOT="$BASELINE"
export REQUIRE_EXTERNAL_BASELINE=true
export CAMPAIGN_PATH CAMPAIGN_SHA256
export OUT_FILE="$PREFLIGHT_ROOT/runtime-identity-preflight.json"
"$NODE_BIN" --es-module-specifier-resolution=node "$RUNNER"
sha256sum "$OUT_FILE" >"$PREFLIGHT_ROOT/runtime-identity-preflight.sha256"
printf '%s\n' PASS_OUTCOME_FREE_FINISH_ADVANTAGE_RUNTIME_IDENTITY_PREFLIGHT >"$PREFLIGHT_ROOT/COMPLETE"
