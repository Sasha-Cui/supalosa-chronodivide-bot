#!/bin/bash
#SBATCH --job-name=chrono-dev-plan
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=06:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=6G
#SBATCH --output=/nfs/roberts/scratch/pi_jss233/zc362/chrono_divide-paper-audit/slurm/research-dev-%A_%a.out
#SBATCH --error=/nfs/roberts/scratch/pi_jss233/zc362/chrono_divide-paper-audit/slurm/research-dev-%A_%a.err

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

: "${CAMPAIGN_ROOT:?CAMPAIGN_ROOT must name a generated private development campaign directory}"
: "${EVIDENCE_BASE:?EVIDENCE_BASE must name a new durable evidence parent}"

TASK_ID=${SLURM_ARRAY_TASK_ID:-0}
PLAN_LIST="$CAMPAIGN_ROOT/plan-files.txt"
CAMPAIGN_MANIFEST="$CAMPAIGN_ROOT/campaign.json"
if [[ ! -f "$PLAN_LIST" || ! -f "$CAMPAIGN_MANIFEST" ]]; then
    echo "Development campaign plan list or manifest is missing: $CAMPAIGN_ROOT" >&2
    exit 2
fi
PLAN_NUMBER=$((TASK_ID + 1))
RESEARCH_PLAN=$(sed -n "${PLAN_NUMBER}p" "$PLAN_LIST")
if [[ -z "$RESEARCH_PLAN" || ! -f "$RESEARCH_PLAN" ]]; then
    echo "No development plan for zero-based shard $TASK_ID in $PLAN_LIST" >&2
    exit 2
fi

JOB_LINE=$("$SCONTROL" show job -o "$SLURM_JOB_ID")
if [[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) ]]; then
    JOB_ACCOUNT=${BASH_REMATCH[2]}
else
    echo "Authoritative Slurm account is absent from scontrol output" >&2
    exit 2
fi
if [[ "$JOB_ACCOUNT" != "pi_jss233" ]]; then
    echo "Refusing development plan: authoritative Slurm account is $JOB_ACCOUNT, expected pi_jss233" >&2
    exit 2
fi
export SLURM_JOB_ACCOUNT="$JOB_ACCOUNT"

for executable in "$NODE_BIN" "$SCONTROL"; do
    if [[ ! -x "$executable" ]]; then
        echo "Required pinned executable is unavailable: $executable" >&2
        exit 2
    fi
done
for required in "$RUNNER" "$PRIVATE_ROLE_ROOT/development-families.json" "$BASELINE_ROOT/dist/bot/bot.js"; do
    if [[ ! -e "$required" ]]; then
        echo "Required committed development input is unavailable: $required" >&2
        exit 2
    fi
done

install -d -m 0700 "$EVIDENCE_BASE"
ARRAY_JOB_ID=${SLURM_ARRAY_JOB_ID:-$SLURM_JOB_ID}
OUT_DIR="$EVIDENCE_BASE/${ARRAY_JOB_ID}_${TASK_ID}"
if [[ -e "$OUT_DIR" ]]; then
    echo "Refusing to reuse development shard output: $OUT_DIR" >&2
    exit 2
fi

cd "$DRIVER_ROOT"
export RESEARCH_PLAN
export RESEARCH_PRIVATE_ROLE_ROOT="$PRIVATE_ROLE_ROOT"
export OUT_DIR
export BASELINE_PACKAGE_ROOT="$BASELINE_ROOT"
export REQUIRE_EXTERNAL_BASELINE=true
"$NODE_BIN" --es-module-specifier-resolution=node "$RUNNER"
