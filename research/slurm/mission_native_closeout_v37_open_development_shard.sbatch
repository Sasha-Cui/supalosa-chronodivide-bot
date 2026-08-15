#!/bin/bash
#SBATCH --job-name=chrono-v37-open
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=08:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=6G
#SBATCH --array=0-89%40
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
DRIVER_ROOT="$REPO/packages/chronodivide-bot-driver"
BASELINE_ROOT=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/supalosa-chronodivide-bot/packages/chronodivide-bot
RUNNER="$DRIVER_ROOT/dist/training/missionNativeCloseoutOpenDevelopmentPlanRunner.js"

: "${CAMPAIGN_ROOT:?CAMPAIGN_ROOT must name the frozen V37 campaign}"
: "${CAMPAIGN_SHA256:?CAMPAIGN_SHA256 must bind the frozen V37 campaign}"
: "${EVIDENCE_BASE:?EVIDENCE_BASE must name a new V37 evidence parent}"
[[ "$CAMPAIGN_SHA256" =~ ^[0-9a-f]{64}$ ]] || { echo "CAMPAIGN_SHA256 is invalid" >&2; exit 2; }
TASK_ID=${SLURM_ARRAY_TASK_ID:?SLURM_ARRAY_TASK_ID is required}
ARRAY_JOB_ID=${SLURM_ARRAY_JOB_ID:?SLURM_ARRAY_JOB_ID is required}
PLAN_LIST="$CAMPAIGN_ROOT/plan-files.txt"
[[ -f "$CAMPAIGN_ROOT/campaign.json" && "$(sha256sum "$CAMPAIGN_ROOT/campaign.json" | cut -d' ' -f1)" == "$CAMPAIGN_SHA256" ]] || {
    echo "V37 campaign commitment drifted" >&2
    exit 2
}
[[ -f "$PLAN_LIST" && "$(wc -l < "$PLAN_LIST")" -eq 90 ]] || {
    echo "V37 campaign does not contain exactly 90 plans" >&2
    exit 2
}
MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_PLAN=$(sed -n "$((TASK_ID + 1))p" "$PLAN_LIST")
[[ -n "$MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_PLAN" && -f "$MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_PLAN" ]] || {
    echo "No V37 plan for shard $TASK_ID" >&2
    exit 2
}
case "$(realpath "$MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_PLAN")" in
    "$(realpath "$CAMPAIGN_ROOT")"/plans/*) ;;
    *) echo "V37 plan escapes the frozen plans directory" >&2; exit 2 ;;
esac

JOB_LINE=$($SCONTROL show job -o "$SLURM_JOB_ID")
[[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) ]] || { echo "Authoritative Slurm account is absent" >&2; exit 2; }
[[ "${BASH_REMATCH[2]}" == pi_jss233 ]] || { echo "Wrong Slurm account" >&2; exit 2; }
export SLURM_JOB_ACCOUNT=pi_jss233

for required in "$NODE_BIN" "$RUNNER" "$BASELINE_ROOT/dist/bot/bot.js"; do
    [[ -e "$required" ]] || { echo "Required V37 input is unavailable: $required" >&2; exit 2; }
done
cd "$REPO"
[[ "$(git branch --show-current)" == main && -z "$(git status --porcelain=v1 --untracked-files=no)" ]] || {
    echo "V37 campaign requires clean tracked main" >&2
    exit 2
}

install -d -m 0700 "$EVIDENCE_BASE"
JOB_ROOT="$EVIDENCE_BASE/${ARRAY_JOB_ID}_${TASK_ID}"
OUT_DIR="$JOB_ROOT/run"
[[ ! -e "$JOB_ROOT" ]] || { echo "Refusing to reuse V37 output $JOB_ROOT" >&2; exit 2; }
mkdir -m 0700 "$JOB_ROOT"
exec >"$JOB_ROOT/job.stdout.log" 2>"$JOB_ROOT/job.stderr.log"

cd "$DRIVER_ROOT"
export MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_PLAN OUT_DIR
export BASELINE_PACKAGE_ROOT="$BASELINE_ROOT"
export REQUIRE_EXTERNAL_BASELINE=true
"$NODE_BIN" --es-module-specifier-resolution=node "$RUNNER"
