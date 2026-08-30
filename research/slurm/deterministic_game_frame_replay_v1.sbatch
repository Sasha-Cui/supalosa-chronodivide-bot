#!/bin/bash
#SBATCH --job-name=chrono-frame-replay
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=12:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=12G
#SBATCH --output=/dev/null
#SBATCH --error=/dev/null
source /etc/profile >/dev/null 2>&1
module load nodejs/20.13.1-GCCcore-13.3.0 Pango/1.54.0-GCCcore-13.3.0 giflib/5.2.1-GCCcore-13.3.0
set -euo pipefail
umask 077
REPO=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
DRIVER="$REPO/packages/chronodivide-bot-driver"
BASELINE=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/supalosa-chronodivide-bot/packages/chronodivide-bot
: "${RESULTS_ROOT:?}" "${PROGRAM_SHA256:?}" "${RENDERER_SHA256:?}" "${SCRIPT_SHA256:?}"
: "${SELECTION_PATH:?}" "${SELECTION_SHA256:?}" "${FRAME_PROTOCOL_PATH:?}" "${FRAME_PROTOCOL_SHA256:?}"
: "${FRAME_AMENDMENT_PATH:?}" "${FRAME_AMENDMENT_SHA256:?}" "${MIX_DIR:?}"
: "${ASSET_MANIFEST_PATH:?}" "${ASSET_MANIFEST_SHA256:?}"
[[ "$(sha256sum "$0" | awk '{print $1}')" == "$SCRIPT_SHA256" ]] || exit 2
JOB_LINE=$(/opt/slurm/current/bin/scontrol show job -o "$SLURM_JOB_ID")
[[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) && "${BASH_REMATCH[2]}" == pi_jss233 ]] || exit 2
export SLURM_JOB_ACCOUNT=pi_jss233
TASK_INDEX=${SLURM_ARRAY_TASK_ID:?}
ROOT="$RESULTS_ROOT/task-$(printf '%03d' "$TASK_INDEX")"
[[ ! -e "$ROOT" ]] || exit 2
install -d -m 0700 "$ROOT"
exec >"$ROOT/job.stdout.log" 2>"$ROOT/job.stderr.log"
cd "$REPO"
[[ "$(git branch --show-current)" == main ]] || exit 2
[[ -z "$(git status --porcelain=v1 --untracked-files=no)" ]] || exit 2
[[ "$(git rev-parse HEAD)" == "$(git rev-parse fork/main)" ]] || exit 2
cd "$DRIVER"
export MODE=cell TASK_INDEX OUT_PATH="$ROOT/cell.json" FRAMES_ROOT="$ROOT/frames"
export PROGRAM_PATH="$DRIVER/dist/training/deterministicGameFrameReplay.js"
export RENDERER_PATH="$DRIVER/dist/visualisation/gameStateFrameRenderer.js"
[[ "$(sha256sum "$PROGRAM_PATH" | awk '{print $1}')" == "$PROGRAM_SHA256" ]] || exit 2
[[ "$(sha256sum "$RENDERER_PATH" | awk '{print $1}')" == "$RENDERER_SHA256" ]] || exit 2
export PROGRAM_SHA256 RENDERER_SHA256 SELECTION_PATH SELECTION_SHA256
export FRAME_PROTOCOL_PATH FRAME_PROTOCOL_SHA256 FRAME_AMENDMENT_PATH FRAME_AMENDMENT_SHA256
export MIX_DIR ASSET_MANIFEST_PATH ASSET_MANIFEST_SHA256
export BASELINE_PACKAGE_ROOT="$BASELINE" REQUIRE_EXTERNAL_BASELINE=true
node --es-module-specifier-resolution=node "$PROGRAM_PATH"
find "$ROOT/frames" -type f -name '*.png' -print0 | sort -z | xargs -0 sha256sum >"$ROOT/frames.sha256"
sha256sum "$OUT_PATH" >"$ROOT/cell.sha256"
printf 'COMPLETE_DETERMINISTIC_GAME_FRAME_REPLAY_CELL\n' >"$ROOT/COMPLETE"
