#!/bin/bash
#SBATCH --job-name=chrono-v3-stage1
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=06:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=6G
#SBATCH --array=0-125%20
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
RUNNER="$DRIVER_ROOT/dist/training/researchPlanRunner.js"

: "${CAMPAIGN_ROOT:?CAMPAIGN_ROOT must name the frozen method-v3 Stage-1 campaign}"
: "${EVIDENCE_BASE:?EVIDENCE_BASE must name a new durable Stage-1 evidence parent}"

TASK_ID=${SLURM_ARRAY_TASK_ID:?SLURM_ARRAY_TASK_ID is required}
ARRAY_JOB_ID=${SLURM_ARRAY_JOB_ID:?SLURM_ARRAY_JOB_ID is required}
PLAN_LIST="$CAMPAIGN_ROOT/plan-files.txt"
CAMPAIGN="$CAMPAIGN_ROOT/campaign.json"
if [[ ! -f "$PLAN_LIST" || ! -f "$CAMPAIGN" ]]; then
    echo "Frozen campaign plan list or manifest is missing: $CAMPAIGN_ROOT" >&2
    exit 2
fi
if [[ "$(wc -l < "$PLAN_LIST")" -ne 126 ]]; then
    echo "Method-v3 Stage 1 requires exactly 126 plan shards" >&2
    exit 2
fi
PLAN_NUMBER=$((TASK_ID + 1))
RESEARCH_PLAN=$(sed -n "${PLAN_NUMBER}p" "$PLAN_LIST")
if [[ -z "$RESEARCH_PLAN" || ! -f "$RESEARCH_PLAN" ]]; then
    echo "No method-v3 plan for zero-based shard $TASK_ID" >&2
    exit 2
fi
case "$(realpath "$RESEARCH_PLAN")" in
    "$(realpath "$CAMPAIGN_ROOT")"/plans/*) ;;
    *)
        echo "Research plan escapes the frozen campaign plans directory" >&2
        exit 2
        ;;
esac

JOB_LINE=$($SCONTROL show job -o "$SLURM_JOB_ID")
JOB_ACCOUNT=$(tr ' ' '\n' <<< "$JOB_LINE" | awk -F= '$1 == "Account" {print $2; exit}')
if [[ "$JOB_ACCOUNT" != "pi_jss233" ]]; then
    echo "Refusing method-v3 Stage 1 under account $JOB_ACCOUNT" >&2
    exit 2
fi
export SLURM_JOB_ACCOUNT="$JOB_ACCOUNT"

for required in "$NODE_BIN" "$SCONTROL" "$RUNNER" "$PRIVATE_ROLE_ROOT/train-families.json" "$BASELINE_ROOT/dist/bot/bot.js"; do
    if [[ ! -e "$required" ]]; then
        echo "Required method-v3 Stage-1 input is unavailable: $required" >&2
        exit 2
    fi
done
cd "$REPO"
if [[ "$(git branch --show-current)" != "main" || -n "$(git status --porcelain=v1 --untracked-files=no)" ]]; then
    echo "Method-v3 Stage 1 requires a clean tracked main checkout" >&2
    exit 2
fi

install -d -m 0700 "$EVIDENCE_BASE"
JOB_ROOT="$EVIDENCE_BASE/${ARRAY_JOB_ID}_${TASK_ID}"
OUT_DIR="$JOB_ROOT/run"
if [[ -e "$JOB_ROOT" ]]; then
    echo "Refusing to reuse method-v3 Stage-1 output: $JOB_ROOT" >&2
    exit 2
fi
mkdir -m 0700 "$JOB_ROOT"
exec >"$JOB_ROOT/job.stdout.log" 2>"$JOB_ROOT/job.stderr.log"

cd "$DRIVER_ROOT"
export RESEARCH_PLAN
export RESEARCH_PRIVATE_ROLE_ROOT="$PRIVATE_ROLE_ROOT"
export OUT_DIR
export BASELINE_PACKAGE_ROOT="$BASELINE_ROOT"
export REQUIRE_EXTERNAL_BASELINE=true
"$NODE_BIN" --es-module-specifier-resolution=node "$RUNNER"
