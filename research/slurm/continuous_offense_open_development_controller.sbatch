#!/bin/bash
#SBATCH --job-name=chrono-offense-controller
#SBATCH --account=pi_jss233
#SBATCH --partition=devel
#SBATCH --time=01:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=6G
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
: "${CAMPAIGN_ROOT:?CAMPAIGN_ROOT must name the frozen continuous-offense campaign}"
: "${EVIDENCE_BASE:?EVIDENCE_BASE must name the continuous-offense result parent}"
: "${ARRAY_JOB_ID:?ARRAY_JOB_ID must name the completed continuous-offense array}"
[[ "$ARRAY_JOB_ID" =~ ^[0-9]+$ ]] || { echo "ARRAY_JOB_ID must be numeric" >&2; exit 2; }
[[ -f "$CAMPAIGN_ROOT/campaign.json" ]] || { echo "Continuous-offense campaign is missing" >&2; exit 2; }

JOB_LINE=$($SCONTROL show job -o "$SLURM_JOB_ID")
[[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) ]] || { echo "Authoritative Slurm account is absent" >&2; exit 2; }
[[ "${BASH_REMATCH[2]}" == pi_jss233 ]] || { echo "Wrong Slurm account" >&2; exit 2; }
export SLURM_JOB_ACCOUNT=pi_jss233

CONTROLLER_ROOT="$EVIDENCE_BASE/controller-$SLURM_JOB_ID"
[[ ! -e "$CONTROLLER_ROOT" ]] || { echo "Refusing to reuse $CONTROLLER_ROOT" >&2; exit 2; }
install -d -m 0700 "$CONTROLLER_ROOT"
exec >"$CONTROLLER_ROOT/job.stdout.log" 2>"$CONTROLLER_ROOT/job.stderr.log"

cd "$REPO"
[[ "$(git branch --show-current)" == main && -z "$(git status --porcelain=v1 --untracked-files=no)" ]] || {
    echo "Continuous-offense controller requires clean tracked main" >&2
    exit 2
}
cd "$DRIVER_ROOT"
export CAMPAIGN="$CAMPAIGN_ROOT/campaign.json"
export RESULTS_ROOT="$EVIDENCE_BASE"
export ARRAY_JOB_ID
export OUT_FILE="$CONTROLLER_ROOT/technical-gate.json"
"$NODE_BIN" --es-module-specifier-resolution=node dist/training/continuousOffenseTechnicalGate.js

export TECHNICAL_GATE="$OUT_FILE"
export OUT_FILE="$CONTROLLER_ROOT/open-development-analysis.json"
"$NODE_BIN" --es-module-specifier-resolution=node dist/training/continuousOffenseAnalyzer.js
printf '%s\n' "PASS_CONTINUOUS_OFFENSE_CONTROLLER" >"$CONTROLLER_ROOT/COMPLETE"
