#!/bin/bash
#SBATCH --job-name=chrono-fresh-select
#SBATCH --time=04:00:00
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --cpus-per-task=1
#SBATCH --mem=4G
#SBATCH --no-requeue
#SBATCH --output=/dev/null
#SBATCH --error=/dev/null
set -euo pipefail
umask 077
REPO=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
STUDY=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/fresh-dual-endpoint-v1
: "${SOURCE_COMMIT:?}" "${SCRIPT_SHA256:?}" "${PLAN_FILE_SHA256:?}"
[[ "$(sha256sum "$0" | awk '{print $1}')" == "$SCRIPT_SHA256" ]]
JOB_LINE=$(/opt/slurm/current/bin/scontrol show job -o "$SLURM_JOB_ID")
[[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) && "${BASH_REMATCH[2]}" == pi_jss233 ]]
[[ "$JOB_LINE" =~ (^|[[:space:]])Partition=day([[:space:]]|$) && "$JOB_LINE" != *"gres/gpu"* ]]
export SLURM_JOB_ACCOUNT=pi_jss233
cd "$REPO"
[[ "$(git branch --show-current)" == main && -z "$(git status --porcelain=v1)" && "$(git rev-parse HEAD)" == "$SOURCE_COMMIT" && "$SOURCE_COMMIT" == "$(git rev-parse fork/main)" ]]
NODE=/apps/software/2024a/software/nodejs/20.13.1-GCCcore-13.3.0/bin/node
export PATH=/apps/software/2024a/software/nodejs/20.13.1-GCCcore-13.3.0/bin:/opt/slurm/current/bin:/usr/local/bin:/usr/bin:/bin
export LD_LIBRARY_PATH=/apps/software/2024a/software/ICU/75.1-GCCcore-13.3.0/lib:/apps/software/system/software/GCCcore/13.3.0/lib64:/apps/software/system/software/OpenSSL/3/lib:/apps/software/2024a/software/nodejs/20.13.1-GCCcore-13.3.0/lib
export TZ=UTC LC_ALL=C DEBUG_LOGGING=0
: "${PROGRAM_SHA256:?}" "${AUDIT_SHA256:?}"
PHASE="${1:?cell or finalize}"
if [[ "$PHASE" == cell ]]; then
 DIR="$STUDY/selection/cells/block-$(printf '%02d' "${SLURM_ARRAY_TASK_ID:?}")"
 MARKER=COMPLETE_FRESH_DUAL_SELECTION_CELL_V1
elif [[ "$PHASE" == finalize ]]; then
 : "${ARRAY_JOB_ID:?}"
 DIR="$STUDY/selection/finalizer"
 MARKER=COMPLETE_FRESH_DUAL_SELECTION_AGGREGATE_V1
else
 exit 2
fi
[[ ! -e "$DIR" ]]
install -d -m 0700 "$DIR"
exec >"$DIR/job.stdout.log" 2>"$DIR/job.stderr.log"
export OUT_DIR="$DIR"
unset NODE_OPTIONS
export CHRONO_GAME_API_PATH="$REPO/packages/chronodivide-bot-driver/node_modules/@chronodivide/game-api/dist/index.js"
cd "$REPO/packages/chronodivide-bot-driver"
"$NODE" --experimental-loader "$REPO/research/runtime/explicit-start-loader-v1.mjs" --es-module-specifier-resolution=node "$REPO/research/scripts/fresh-dual-selector-v1.mjs" "$PHASE"
sha256sum "$DIR/selection.json" >"$DIR/selection.sha256"
printf '%s\n' "$MARKER" >"$DIR/COMPLETE"
