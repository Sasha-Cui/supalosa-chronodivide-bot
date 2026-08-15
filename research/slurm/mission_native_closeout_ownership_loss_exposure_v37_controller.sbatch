#!/bin/bash
#SBATCH --job-name=chrono-v37-exposure-gate
#SBATCH --account=pi_jss233
#SBATCH --partition=devel
#SBATCH --time=00:30:00
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
export PATH="$NODE_RUNTIME_ROOT/bin:/opt/slurm/current/bin:/usr/local/bin:/usr/bin:/bin"
export LD_LIBRARY_PATH="$ICU_RUNTIME_ROOT/lib:$GCC_RUNTIME_ROOT/lib64:$OPENSSL_RUNTIME_ROOT/lib64:$NODE_RUNTIME_ROOT/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
export TZ=UTC LC_ALL=C PYTHONHASHSEED=0 PYTHONDONTWRITEBYTECODE=1
unset NODE_OPTIONS

REPO=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
DRIVER="$REPO/packages/chronodivide-bot-driver"
: "${EVIDENCE_ROOT:?EVIDENCE_ROOT is required}"
: "${ARRAY_JOB_ID:?ARRAY_JOB_ID is required}"
[[ "$ARRAY_JOB_ID" =~ ^[0-9]+$ ]] || { echo "ARRAY_JOB_ID must be numeric" >&2; exit 2; }
JOB_ROOT="$EVIDENCE_ROOT/controller-$SLURM_JOB_ID"
[[ ! -e "$JOB_ROOT" ]] || { echo "Refusing to reuse $JOB_ROOT" >&2; exit 2; }
install -d -m 0700 "$JOB_ROOT"
exec >"$JOB_ROOT/job.stdout.log" 2>"$JOB_ROOT/job.stderr.log"

JOB_LINE=$(/opt/slurm/current/bin/scontrol show job -o "$SLURM_JOB_ID")
[[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) ]] || { echo "Missing account" >&2; exit 2; }
[[ "${BASH_REMATCH[2]}" == "pi_jss233" ]] || { echo "Wrong account ${BASH_REMATCH[2]}" >&2; exit 2; }
export SLURM_JOB_ACCOUNT=pi_jss233

cd "$REPO"
[[ "$(git branch --show-current)" == "main" && -z "$(git status --porcelain=v1 --untracked-files=no)" ]] || {
    echo "V37-R1 exposure controller requires clean tracked main" >&2; exit 2;
}
cd "$DRIVER"
export OUT_FILE="$JOB_ROOT/v37-r1-exposure-aggregate.json"
"$NODE_RUNTIME_ROOT/bin/node" --es-module-specifier-resolution=node \
    dist/training/missionNativeCloseoutOwnershipLossExposureV37Aggregate.js
printf 'PASS_MISSION_NATIVE_CLOSEOUT_V37_R1_EXPOSURE_CONTROLLER\n' >"$JOB_ROOT/COMPLETE"
