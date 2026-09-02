#!/bin/bash
#SBATCH --job-name=chrono-mm-screen-cell
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=12:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=8G
#SBATCH --output=/dev/null
#SBATCH --error=/dev/null
set -euo pipefail
umask 077
REPO=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
NODE=/apps/software/2024a/software/nodejs/20.13.1-GCCcore-13.3.0/bin/node
export PATH=/apps/software/2024a/software/nodejs/20.13.1-GCCcore-13.3.0/bin:/opt/slurm/current/bin:/usr/local/bin:/usr/bin:/bin
export LD_LIBRARY_PATH=/apps/software/2024a/software/ICU/75.1-GCCcore-13.3.0/lib:/apps/software/system/software/GCCcore/13.3.0/lib64:/apps/software/system/software/OpenSSL/3/lib:/apps/software/2024a/software/nodejs/20.13.1-GCCcore-13.3.0/lib
export TZ=UTC LC_ALL=C DEBUG_LOGGING=0
: "${RESULTS_ROOT:?}" "${SCRIPT_SHA256:?}" "${PROGRAM_SHA256:?}" "${SCREEN_AMENDMENT_SHA256:?}" "${ALLOCATION_MODULE_SHA256:?}" "${ANALYSIS_MODULE_SHA256:?}"
[[ "$(sha256sum "$0" | awk '{print $1}')" == "$SCRIPT_SHA256" ]]
JOB_LINE=$(/opt/slurm/current/bin/scontrol show job -o "$SLURM_JOB_ID")
[[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) && "${BASH_REMATCH[2]}" == pi_jss233 ]]
export SLURM_JOB_ACCOUNT=pi_jss233
cd "$REPO"
[[ "$(git branch --show-current)" == main && -z "$(git status --porcelain=v1)" && "$(git rev-parse HEAD)" == "$(git rev-parse fork/main)" ]]
export PROGRAM_SHA256 SCREEN_AMENDMENT_SHA256 ALLOCATION_MODULE_SHA256 ANALYSIS_MODULE_SHA256
PROGRAM="$REPO/research/scripts/multimap-screen-v3.mjs"
unset MODE NODE_OPTIONS
: "${ALLOCATION_PATH:?}" "${ALLOCATION_SHA256:?}"
export TASK_INDEX="${SLURM_ARRAY_TASK_ID:?}"
ROOT="$RESULTS_ROOT/task-$(printf '%03d' "$TASK_INDEX")"
[[ ! -e "$ROOT" ]]
install -d -m 0700 "$ROOT"
exec >"$ROOT/job.stdout.log" 2>"$ROOT/job.stderr.log"
export OUT_PATH="$ROOT/cell.json"
export ALLOCATION_PATH ALLOCATION_SHA256
export MIX_DIR=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/private-assets/ra2/runtimes/hfo-literal-snow-regular-e0b18958
export ASSET_MANIFEST_PATH=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/private-assets/ra2/manifests/hfo-literal-snow-regular-e0b18958.json
export BASELINE_PACKAGE_ROOT=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/supalosa-chronodivide-bot/packages/chronodivide-bot
export REQUIRE_EXTERNAL_BASELINE=true
export CHRONO_GAME_API_PATH="$REPO/packages/chronodivide-bot-driver/node_modules/@chronodivide/game-api/dist/index.js"
cd "$REPO/packages/chronodivide-bot-driver"
"$NODE" --experimental-loader "$REPO/research/runtime/explicit-start-loader-v1.mjs" --es-module-specifier-resolution=node "$PROGRAM" cell
sha256sum "$OUT_PATH" >"$ROOT/cell.sha256"
printf '%s\n' COMPLETE_MULTIMAP_SCREEN_CELL_V3 >"$ROOT/COMPLETE"
