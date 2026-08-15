#!/bin/bash
#SBATCH --job-name=chrono-pcv5-confirm
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=08:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=6G
#SBATCH --array=0-476%40
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
RUNNER="$DRIVER/dist/training/progressCertifiedPlanRunner.js"
: "${CAMPAIGN_ROOT:?CAMPAIGN_ROOT is required}"
: "${CAMPAIGN_SHA256:?CAMPAIGN_SHA256 is required}"
: "${EVIDENCE_BASE:?EVIDENCE_BASE is required}"
[[ "$CAMPAIGN_SHA256" =~ ^[0-9a-f]{64}$ ]] || { echo "Invalid campaign SHA-256" >&2; exit 2; }
TASK_ID=${SLURM_ARRAY_TASK_ID:?SLURM_ARRAY_TASK_ID is required}
ARRAY_JOB_ID=${SLURM_ARRAY_JOB_ID:?SLURM_ARRAY_JOB_ID is required}

[[ -f "$CAMPAIGN_ROOT/campaign.json" && \
   "$(sha256sum "$CAMPAIGN_ROOT/campaign.json" | cut -d' ' -f1)" == "$CAMPAIGN_SHA256" ]] || {
    echo "V5 confirmatory campaign commitment drifted" >&2
    exit 2
}
PLAN_LIST="$CAMPAIGN_ROOT/plan-files.txt"
[[ -f "$PLAN_LIST" && "$(wc -l < "$PLAN_LIST")" -eq 477 ]] || {
    echo "V5 repaired confirmatory campaign lacks exactly 477 plans" >&2
    exit 2
}
PROGRESS_CERTIFIED_PLAN=$(sed -n "$((TASK_ID + 1))p" "$PLAN_LIST")
[[ -n "$PROGRESS_CERTIFIED_PLAN" && -f "$PROGRESS_CERTIFIED_PLAN" ]] || {
    echo "No V5 confirmatory plan for shard $TASK_ID" >&2
    exit 2
}
case "$(realpath "$PROGRESS_CERTIFIED_PLAN")" in
    "$(realpath "$CAMPAIGN_ROOT")"/plans/*) ;;
    *) echo "V5 confirmatory plan escapes campaign root" >&2; exit 2 ;;
esac

JOB_LINE=$($SCONTROL show job -o "$SLURM_JOB_ID")
[[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) ]] || { echo "Missing account" >&2; exit 2; }
[[ "${BASH_REMATCH[2]}" == pi_jss233 ]] || { echo "Wrong account" >&2; exit 2; }
export SLURM_JOB_ACCOUNT=pi_jss233

cd "$REPO"
[[ "$(git branch --show-current)" == main && -z "$(git status --porcelain=v1 --untracked-files=no)" ]] || {
    echo "V5 confirmatory campaign requires clean tracked main" >&2
    exit 2
}
install -d -m 0700 "$EVIDENCE_BASE"
JOB_ROOT="$EVIDENCE_BASE/${ARRAY_JOB_ID}_${TASK_ID}"
OUT_DIR="$JOB_ROOT/run"
[[ ! -e "$JOB_ROOT" ]] || { echo "Refusing to reuse V5 confirmatory output $JOB_ROOT" >&2; exit 2; }
mkdir -m 0700 "$JOB_ROOT"
exec >"$JOB_ROOT/job.stdout.log" 2>"$JOB_ROOT/job.stderr.log"

cd "$DRIVER"
export PROGRESS_CERTIFIED_PLAN OUT_DIR
export BASELINE_PACKAGE_ROOT="$BASELINE"
export REQUIRE_EXTERNAL_BASELINE=true
"$NODE_BIN" --es-module-specifier-resolution=node "$RUNNER"
