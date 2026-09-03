#!/bin/bash
#SBATCH --job-name=chrono-owned-gate
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
GATE=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/live-building-ledger/combatant-owned-gate-v1
NODE=/apps/software/2024a/software/nodejs/20.13.1-GCCcore-13.3.0/bin/node
export PATH=/apps/software/2024a/software/nodejs/20.13.1-GCCcore-13.3.0/bin:/opt/slurm/current/bin:/usr/local/bin:/usr/bin:/bin
export LD_LIBRARY_PATH=/apps/software/2024a/software/ICU/75.1-GCCcore-13.3.0/lib:/apps/software/system/software/GCCcore/13.3.0/lib64:/apps/software/system/software/OpenSSL/3/lib:/apps/software/2024a/software/nodejs/20.13.1-GCCcore-13.3.0/lib
export TZ=UTC LC_ALL=C DEBUG_LOGGING=0
: "${SOURCE_COMMIT:?}" "${PROGRAM_SHA256:?}" "${MANIFEST_SHA256:?}" "${SCRIPT_SHA256:?}"
[[ "$(sha256sum "$0" | awk '{print $1}')" == "$SCRIPT_SHA256" ]]
JOB_LINE=$(/opt/slurm/current/bin/scontrol show job -o "$SLURM_JOB_ID")
[[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) && "${BASH_REMATCH[2]}" == pi_jss233 ]]
[[ "$JOB_LINE" =~ (^|[[:space:]])Partition=day([[:space:]]|$) ]]
[[ "$JOB_LINE" != *"gres/gpu"* ]]
export SLURM_JOB_ACCOUNT=pi_jss233
cd "$REPO"
[[ "$(git branch --show-current)" == main && -z "$(git status --porcelain=v1)" && "$(git rev-parse HEAD)" == "$SOURCE_COMMIT" && "$SOURCE_COMMIT" == "$(git rev-parse fork/main)" ]]
MODE="${1:?init, smoke, cell or finalize}"
case "$MODE" in
 init) DIR="$GATE/init"; NAME=init; MARKER=COMPLETE_OWNED_GATE_INIT_V1 ;;
 smoke) DIR="$GATE/smoke"; NAME=smoke; MARKER=COMPLETE_OWNED_GATE_SMOKE_V1 ;;
 cell) DIR="$GATE/cells/task-$(printf '%03d' "${SLURM_ARRAY_TASK_ID:?}")"; NAME=case; MARKER=COMPLETE_OWNED_GATE_CELL_V1 ;;
 finalize) : "${ARRAY_JOB_ID:?}"; DIR="$GATE/finalizer"; NAME=aggregate; MARKER=COMPLETE_OWNED_GATE_AGGREGATE_V1 ;;
 *) exit 2 ;;
esac
[[ ! -e "$DIR" ]]
install -d -m 0700 "$DIR"
exec >"$DIR/job.stdout.log" 2>"$DIR/job.stderr.log"
export OUT_DIR="$DIR"
unset NODE_OPTIONS
export CHRONO_GAME_API_PATH="$REPO/packages/chronodivide-bot-driver/node_modules/@chronodivide/game-api/dist/index.js"
cd "$REPO/packages/chronodivide-bot-driver"
"$NODE" --experimental-loader "$REPO/research/runtime/explicit-start-loader-v1.mjs" --es-module-specifier-resolution=node "$REPO/research/scripts/combatant-owned-ledger-gate-v1.mjs" "$MODE"
sha256sum "$DIR/$NAME.json" >"$DIR/$NAME.sha256"
printf '%s\n' "$MARKER" >"$DIR/COMPLETE"
