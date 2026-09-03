#!/bin/bash
#SBATCH --job-name=chrono-ledger-probe
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=00:30:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=4G
#SBATCH --no-requeue
#SBATCH --output=/dev/null
#SBATCH --error=/dev/null
set -euo pipefail
umask 077
REPO=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
PROBE=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/live-building-ledger/neutral-probe-v1-deployment-a2
NODE=/apps/software/2024a/software/nodejs/20.13.1-GCCcore-13.3.0/bin/node
export PATH=/apps/software/2024a/software/nodejs/20.13.1-GCCcore-13.3.0/bin:/opt/slurm/current/bin:/usr/local/bin:/usr/bin:/bin
export LD_LIBRARY_PATH=/apps/software/2024a/software/ICU/75.1-GCCcore-13.3.0/lib:/apps/software/system/software/GCCcore/13.3.0/lib64:/apps/software/system/software/OpenSSL/3/lib:/apps/software/2024a/software/nodejs/20.13.1-GCCcore-13.3.0/lib
export TZ=UTC LC_ALL=C DEBUG_LOGGING=0
: "${SOURCE_COMMIT:?}" "${PROGRAM_SHA256:?}" "${PROTOCOL_SHA256:?}" "${MANIFEST_SHA256:?}" "${SCRIPT_SHA256:?}"
[[ "$(sha256sum "$0" | awk '{print $1}')" == "$SCRIPT_SHA256" ]]
JOB_LINE=$(/opt/slurm/current/bin/scontrol show job -o "$SLURM_JOB_ID")
[[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) && "${BASH_REMATCH[2]}" == pi_jss233 ]]
export SLURM_JOB_ACCOUNT=pi_jss233
cd "$REPO"
[[ "$(git branch --show-current)" == main && -z "$(git status --porcelain=v1)" && "$(git rev-parse HEAD)" == "$SOURCE_COMMIT" && "$SOURCE_COMMIT" == "$(git rev-parse fork/main)" ]]
PHASE="${1:?init, smoke, trace or finalize}"
if [[ "$PHASE" == init ]]; then
 ROOT="$PROBE/compatibility-init"
 NAME=init
elif [[ "$PHASE" == smoke ]]; then
 ROOT="$PROBE/compatibility-smoke"
 NAME=smoke
elif [[ "$PHASE" == trace ]]; then
 ROOT="$PROBE/cells/task-${SLURM_ARRAY_TASK_ID:?}"
 NAME=trace
elif [[ "$PHASE" == finalize ]]; then
 : "${ARRAY_JOB_ID:?}"
 ROOT="$PROBE/finalizer"
 NAME=aggregate
else
 exit 2
fi
[[ ! -e "$ROOT" ]]
install -d -m 0700 "$ROOT"
exec >"$ROOT/job.stdout.log" 2>"$ROOT/job.stderr.log"
export OUT_PATH="$ROOT/$NAME.json"
unset NODE_OPTIONS
export CHRONO_GAME_API_PATH="$REPO/packages/chronodivide-bot-driver/node_modules/@chronodivide/game-api/dist/index.js"
cd "$REPO/packages/chronodivide-bot-driver"
"$NODE" --experimental-loader "$REPO/research/runtime/explicit-start-loader-v1.mjs" --es-module-specifier-resolution=node "$REPO/research/scripts/neutral-building-ledger-probe-v1.mjs" "$PHASE"
sha256sum "$OUT_PATH" >"$ROOT/$NAME.sha256"
if [[ "$PHASE" == init ]]; then
 printf '%s\n' COMPLETE_NEUTRAL_LEDGER_INIT_A1 >"$ROOT/COMPLETE"
elif [[ "$PHASE" == smoke ]]; then
 printf '%s\n' COMPLETE_NEUTRAL_LEDGER_SMOKE_A2 >"$ROOT/COMPLETE"
elif [[ "$PHASE" == trace ]]; then
 printf '%s\n' COMPLETE_NEUTRAL_LEDGER_TRACE_V1 >"$ROOT/COMPLETE"
else
 printf '%s\n' COMPLETE_NEUTRAL_LEDGER_AGGREGATE_V1 >"$ROOT/COMPLETE"
fi
