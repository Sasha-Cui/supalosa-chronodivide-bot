#!/bin/bash
#SBATCH --job-name=chrono-mm-explicit-smoke
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=02:00:00
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
: "${RESULTS_ROOT:?}" "${SCRIPT_SHA256:?}" "${SOURCE_COMMIT:?}" "${SMOKE_PROGRAM_SHA256:?}" "${AMENDMENT_SHA256:?}" "${LOADER_SHA256:?}" "${TRANSFORM_SHA256:?}"
[[ "$(sha256sum "$0" | awk '{print $1}')" == "$SCRIPT_SHA256" ]]
JOB_LINE=$(/opt/slurm/current/bin/scontrol show job -o "$SLURM_JOB_ID")
[[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) && "${BASH_REMATCH[2]}" == pi_jss233 ]]
export SLURM_JOB_ACCOUNT=pi_jss233
[[ ! -e "$RESULTS_ROOT" ]]
install -d -m 0700 "$RESULTS_ROOT"
exec >"$RESULTS_ROOT/job.stdout.log" 2>"$RESULTS_ROOT/job.stderr.log"
cd "$REPO"
[[ "$(git branch --show-current)" == main && -z "$(git status --porcelain=v1)" && "$(git rev-parse HEAD)" == "$SOURCE_COMMIT" && "$(git rev-parse fork/main)" == "$SOURCE_COMMIT" ]]
export MIX_DIR=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/private-assets/ra2/runtimes/hfo-literal-snow-regular-e0b18958
export ASSET_MANIFEST_PATH=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/private-assets/ra2/manifests/hfo-literal-snow-regular-e0b18958.json
export BASELINE_PACKAGE_ROOT=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/supalosa-chronodivide-bot/packages/chronodivide-bot
export REQUIRE_EXTERNAL_BASELINE=true
export CHRONO_GAME_API_PATH="$REPO/packages/chronodivide-bot-driver/node_modules/@chronodivide/game-api/dist/index.js"
export REFERENCE_PATH="$RESULTS_ROOT/reference.json"
export OUT_PATH="$REFERENCE_PATH"
export SMOKE_PROGRAM_SHA256 AMENDMENT_SHA256 LOADER_SHA256 TRANSFORM_SHA256
PROGRAM="$REPO/research/scripts/multimap-explicit-start-smoke-v1.mjs"
LOADER="$REPO/research/runtime/explicit-start-loader-v1.mjs"
[[ "$(sha256sum "$PROGRAM" | awk '{print $1}')" == "$SMOKE_PROGRAM_SHA256" ]]
[[ "$(sha256sum "$LOADER" | awk '{print $1}')" == "$LOADER_SHA256" ]]
unset MODE NODE_OPTIONS
"$NODE" --es-module-specifier-resolution=node "$PROGRAM" reference
sha256sum "$REFERENCE_PATH" >"$RESULTS_ROOT/reference.sha256"
export REFERENCE_SHA256="$(sha256sum "$REFERENCE_PATH" | awk '{print $1}')"
export OUT_PATH="$RESULTS_ROOT/compatibility.json"
"$NODE" --experimental-loader "$LOADER" --es-module-specifier-resolution=node "$PROGRAM" shim
sha256sum "$OUT_PATH" >"$RESULTS_ROOT/compatibility.sha256"
printf '%s\n' COMPLETE_MULTIMAP_EXPLICIT_START_SMOKE_V1 >"$RESULTS_ROOT/COMPLETE"
