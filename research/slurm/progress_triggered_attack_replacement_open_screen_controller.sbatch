#!/bin/bash
#SBATCH --job-name=chrono-deferred-finalize
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
export PATH="$NODE_RUNTIME_ROOT/bin:/opt/slurm/current/bin:/usr/local/bin:/usr/bin:/bin"
export LD_LIBRARY_PATH=/apps/software/2024a/software/ICU/75.1-GCCcore-13.3.0/lib:/apps/software/system/software/GCCcore/13.3.0/lib64:/apps/software/system/software/OpenSSL/3/lib:$NODE_RUNTIME_ROOT/lib
export TZ=UTC LC_ALL=C PYTHONHASHSEED=0 PYTHONDONTWRITEBYTECODE=1 DEBUG_LOGGING=0
unset NODE_OPTIONS
REPO=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
DRIVER="$REPO/packages/chronodivide-bot-driver"
PROGRAM="$DRIVER/dist/training/progressTriggeredAttackReplacementOpenScreen.js"
: "${CAMPAIGN:?}" "${CAMPAIGN_SHA256:?}" "${RESULTS_ROOT:?}" "${ARRAY_JOB_ID:?}" "${FINALIZER_ROOT:?}" "${CONTROLLER_SHA256:?}"
[[ "$(sha256sum "$0" | awk '{print $1}')" == "$CONTROLLER_SHA256" ]] || exit 2
JOB_LINE=$(/opt/slurm/current/bin/scontrol show job -o "$SLURM_JOB_ID")
[[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) && "${BASH_REMATCH[2]}" == pi_jss233 ]] || exit 2
export SLURM_JOB_ACCOUNT=pi_jss233
[[ ! -e "$FINALIZER_ROOT" ]] || exit 2
install -d -m 0700 "$FINALIZER_ROOT"
exec >"$FINALIZER_ROOT/job.stdout.log" 2>"$FINALIZER_ROOT/job.stderr.log"
cd "$REPO"
[[ "$(git branch --show-current)" == main && -z "$(git status --porcelain=v1 --untracked-files=no)" ]] || exit 2
cd "$DRIVER"
export MODE=finalize CAMPAIGN CAMPAIGN_SHA256 RESULTS_ROOT ARRAY_JOB_ID
export OUT_FILE="$FINALIZER_ROOT/progress-triggered-attack-replacement-open-screen-finalizer.json"
"$NODE_RUNTIME_ROOT/bin/node" --es-module-specifier-resolution=node "$PROGRAM"
sha256sum "$OUT_FILE" >"$FINALIZER_ROOT/progress-triggered-attack-replacement-open-screen-finalizer.sha256"
printf '%s\n' COMPLETE_PROGRESS_TRIGGERED_REPLACEMENT_OPEN_FINALIZER >"$FINALIZER_ROOT/COMPLETE"
