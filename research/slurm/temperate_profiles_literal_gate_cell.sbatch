#!/bin/bash
#SBATCH --job-name=chrono-temperate-profiles-literal-gate
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=04:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=8G
#SBATCH --array=0-35%36
#SBATCH --output=/dev/null
#SBATCH --error=/dev/null
set -euo pipefail;umask 077
NODE=/apps/software/2024a/software/nodejs/20.13.1-GCCcore-13.3.0/bin/node
export PATH=/apps/software/2024a/software/nodejs/20.13.1-GCCcore-13.3.0/bin:/opt/slurm/current/bin:/usr/local/bin:/usr/bin:/bin
export LD_LIBRARY_PATH=/apps/software/2024a/software/ICU/75.1-GCCcore-13.3.0/lib:/apps/software/system/software/GCCcore/13.3.0/lib64:/apps/software/system/software/OpenSSL/3/lib:/apps/software/2024a/software/nodejs/20.13.1-GCCcore-13.3.0/lib
export TZ=UTC LC_ALL=C DEBUG_LOGGING=0
REPO=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot;DRIVER="$REPO/packages/chronodivide-bot-driver";BASELINE=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/supalosa-chronodivide-bot/packages/chronodivide-bot
: "${RESULTS_ROOT:?}" "${PROGRAM_SHA256:?}" "${PROTOCOL_SHA256:?}" "${SCRIPT_SHA256:?}";[[ "$(sha256sum "$0"|awk '{print $1}')" == "$SCRIPT_SHA256" ]]||exit 2
JOB_LINE=$(/opt/slurm/current/bin/scontrol show job -o "$SLURM_JOB_ID");[[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) && "${BASH_REMATCH[2]}" == pi_jss233 ]]||exit 2;export SLURM_JOB_ACCOUNT=pi_jss233
TASK_INDEX=${SLURM_ARRAY_TASK_ID:?};ROOT="$RESULTS_ROOT/task-$(printf '%02d' "$TASK_INDEX")";[[ ! -e "$ROOT" ]]||exit 2;install -d -m 0700 "$ROOT";exec >"$ROOT/job.stdout.log" 2>"$ROOT/job.stderr.log"
cd "$REPO";[[ "$(git branch --show-current)" == main && -z "$(git status --porcelain=v1 --untracked-files=no)" ]]||exit 2;cd "$DRIVER";export MODE=cell TASK_INDEX OUT_FILE="$ROOT/cell.json"
export PROGRAM_PATH="$DRIVER/dist/training/temperateProfilesLiteralGate.js";export PROTOCOL_PATH="$REPO/research/protocols/temperate-profiles-literal/2026-08-19-temperate-profiles-literal-all-country-open-protocol-v1.md";export PROGRAM_SHA256 PROTOCOL_SHA256 BASELINE_PACKAGE_ROOT="$BASELINE" REQUIRE_EXTERNAL_BASELINE=true
"$NODE" --es-module-specifier-resolution=node "$PROGRAM_PATH";sha256sum "$OUT_FILE">"$ROOT/cell.sha256";printf '%s
' COMPLETE_HFO_LITERAL_CELL>"$ROOT/COMPLETE"
