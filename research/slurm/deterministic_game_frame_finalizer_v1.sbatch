#!/bin/bash
#SBATCH --job-name=chrono-frame-final
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=02:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=8G
#SBATCH --output=/dev/null
#SBATCH --error=/dev/null
source /etc/profile >/dev/null 2>&1
module load nodejs/20.13.1-GCCcore-13.3.0 Pango/1.54.0-GCCcore-13.3.0 giflib/5.2.1-GCCcore-13.3.0
set -euo pipefail
umask 077
REPO=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
DRIVER="$REPO/packages/chronodivide-bot-driver"
: "${RESULTS_ROOT:?}" "${FINALIZER_ROOT:?}" "${ARRAY_JOB_ID:?}"
: "${PROGRAM_SHA256:?}" "${CELL_PROGRAM_SHA256:?}" "${RENDERER_SHA256:?}" "${SCRIPT_SHA256:?}"
: "${SELECTION_SHA256:?}" "${FRAME_PROTOCOL_SHA256:?}" "${FRAME_AMENDMENT_SHA256:?}"
: "${ASSET_MANIFEST_SHA256:?}"
[[ "$(sha256sum "$0" | awk '{print $1}')" == "$SCRIPT_SHA256" ]] || exit 2
JOB_LINE=$(/opt/slurm/current/bin/scontrol show job -o "$SLURM_JOB_ID")
[[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) && "${BASH_REMATCH[2]}" == pi_jss233 ]] || exit 2
export SLURM_JOB_ACCOUNT=pi_jss233
[[ ! -e "$FINALIZER_ROOT" ]] || exit 2
install -d -m 0700 "$FINALIZER_ROOT"
exec >"$FINALIZER_ROOT/job.stdout.log" 2>"$FINALIZER_ROOT/job.stderr.log"
cd "$REPO"
[[ "$(git branch --show-current)" == main ]] || exit 2
[[ -z "$(git status --porcelain=v1 --untracked-files=no)" ]] || exit 2
[[ "$(git rev-parse HEAD)" == "$(git rev-parse fork/main)" ]] || exit 2
cd "$DRIVER"
export MODE=finalize OUT_PATH="$FINALIZER_ROOT/deterministic-game-frame-manifest.json"
export PROGRAM_PATH="$DRIVER/dist/training/deterministicGameFrameReplay.js"
export RENDERER_PATH="$DRIVER/dist/visualisation/gameStateFrameRenderer.js"
[[ "$(sha256sum "$PROGRAM_PATH" | awk '{print $1}')" == "$PROGRAM_SHA256" ]] || exit 2
[[ "$(sha256sum "$RENDERER_PATH" | awk '{print $1}')" == "$RENDERER_SHA256" ]] || exit 2
export RESULTS_ROOT ARRAY_JOB_ID PROGRAM_SHA256 CELL_PROGRAM_SHA256 RENDERER_SHA256
export SELECTION_SHA256 FRAME_PROTOCOL_SHA256 FRAME_AMENDMENT_SHA256 ASSET_MANIFEST_SHA256
node --es-module-specifier-resolution=node "$PROGRAM_PATH"
sha256sum "$OUT_PATH" >"$FINALIZER_ROOT/deterministic-game-frame-manifest.sha256"
printf 'COMPLETE_DETERMINISTIC_GAME_FRAME_REPLAY\n' >"$FINALIZER_ROOT/COMPLETE"
