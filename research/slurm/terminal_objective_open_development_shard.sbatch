#!/bin/bash
#SBATCH --job-name=chrono-terminal-open
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=08:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=6G
#SBATCH --array=0-179%40
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
RUNNER="$DRIVER_ROOT/dist/training/terminalObjectivePlanRunner.js"

: "${CAMPAIGN_ROOT:?CAMPAIGN_ROOT must name the frozen terminal-objective campaign}"
: "${EVIDENCE_BASE:?EVIDENCE_BASE must name a new terminal-objective evidence parent}"
TASK_ID=${SLURM_ARRAY_TASK_ID:?SLURM_ARRAY_TASK_ID is required}
ARRAY_JOB_ID=${SLURM_ARRAY_JOB_ID:?SLURM_ARRAY_JOB_ID is required}
PLAN_LIST="$CAMPAIGN_ROOT/plan-files.txt"
if [[ ! -f "$PLAN_LIST" || ! -f "$CAMPAIGN_ROOT/campaign.json" || "$(wc -l < "$PLAN_LIST")" -ne 180 ]]; then
    echo "Terminal-objective campaign is missing or does not contain 180 plans" >&2
    exit 2
fi
TERMINAL_OBJECTIVE_PLAN=$(sed -n "$((TASK_ID + 1))p" "$PLAN_LIST")
if [[ -z "$TERMINAL_OBJECTIVE_PLAN" || ! -f "$TERMINAL_OBJECTIVE_PLAN" ]]; then
    echo "No terminal-objective plan for shard $TASK_ID" >&2
    exit 2
fi
case "$(realpath "$TERMINAL_OBJECTIVE_PLAN")" in
    "$(realpath "$CAMPAIGN_ROOT")"/plans/*) ;;
    *) echo "Terminal-objective plan escapes the frozen plans directory" >&2; exit 2 ;;
esac

JOB_LINE=$($SCONTROL show job -o "$SLURM_JOB_ID")
[[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) ]] || { echo "Authoritative Slurm account is absent" >&2; exit 2; }
[[ "${BASH_REMATCH[2]}" == pi_jss233 ]] || { echo "Wrong Slurm account" >&2; exit 2; }
export SLURM_JOB_ACCOUNT=pi_jss233

for required in "$NODE_BIN" "$SCONTROL" "$RUNNER" "$BASELINE_ROOT/dist/bot/bot.js"; do
    [[ -e "$required" ]] || { echo "Required terminal-objective input is unavailable: $required" >&2; exit 2; }
done
cd "$REPO"
[[ "$(git branch --show-current)" == main && -z "$(git status --porcelain=v1 --untracked-files=no)" ]] || {
    echo "Terminal-objective campaign requires a clean tracked main checkout" >&2
    exit 2
}

install -d -m 0700 "$EVIDENCE_BASE"
JOB_ROOT="$EVIDENCE_BASE/${ARRAY_JOB_ID}_${TASK_ID}"
OUT_DIR="$JOB_ROOT/run"
[[ ! -e "$JOB_ROOT" ]] || { echo "Refusing to reuse terminal-objective output $JOB_ROOT" >&2; exit 2; }
mkdir -m 0700 "$JOB_ROOT"
exec >"$JOB_ROOT/job.stdout.log" 2>"$JOB_ROOT/job.stderr.log"

cd "$DRIVER_ROOT"
export TERMINAL_OBJECTIVE_PLAN OUT_DIR
export BASELINE_PACKAGE_ROOT="$BASELINE_ROOT"
export REQUIRE_EXTERNAL_BASELINE=true
"$NODE_BIN" --es-module-specifier-resolution=node "$RUNNER"
