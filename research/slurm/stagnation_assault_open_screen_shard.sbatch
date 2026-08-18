#!/bin/bash
#SBATCH --job-name=chrono-stagnation-open
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=12:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=8G
#SBATCH --array=0-89%64
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
BASELINE=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/supalosa-chronodivide-bot/packages/chronodivide-bot
PROGRAM="$DRIVER/dist/training/stagnationAssaultOpenScreen.js"
: "${CAMPAIGN:?}" "${CAMPAIGN_SHA256:?}" "${RESULTS_ROOT:?}" "${SHARD_SHA256:?}"
[[ "$(sha256sum "$0" | awk '{print $1}')" == "$SHARD_SHA256" ]] || exit 2
JOB_LINE=$(/opt/slurm/current/bin/scontrol show job -o "$SLURM_JOB_ID")
[[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) && "${BASH_REMATCH[2]}" == pi_jss233 ]] || exit 2
export SLURM_JOB_ACCOUNT=pi_jss233
TASK_INDEX=${SLURM_ARRAY_TASK_ID:?}
TASK_ROOT="$RESULTS_ROOT/task-$(printf '%03d' "$TASK_INDEX")"
[[ ! -e "$TASK_ROOT" ]] || exit 2
install -d -m 0700 "$TASK_ROOT"
exec >"$TASK_ROOT/job.stdout.log" 2>"$TASK_ROOT/job.stderr.log"
cd "$REPO"
[[ "$(git branch --show-current)" == main && -z "$(git status --porcelain=v1 --untracked-files=no)" ]] || exit 2
cd "$DRIVER"
export MODE=cell CAMPAIGN CAMPAIGN_SHA256 TASK_INDEX OUT_DIR="$TASK_ROOT/run"
export BASELINE_PACKAGE_ROOT="$BASELINE" REQUIRE_EXTERNAL_BASELINE=true
"$NODE_RUNTIME_ROOT/bin/node" --es-module-specifier-resolution=node "$PROGRAM"
sha256sum "$OUT_DIR/manifest.json" "$OUT_DIR/events.jsonl" "$OUT_DIR/summary.json" >"$TASK_ROOT/artifacts.sha256"
printf '%s\n' COMPLETE_STAGNATION_ASSAULT_OPEN_SHARD >"$TASK_ROOT/COMPLETE"
