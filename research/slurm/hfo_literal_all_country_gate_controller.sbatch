#!/bin/bash
#SBATCH --job-name=chrono-hfo-literal-final
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=01:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=8G
#SBATCH --output=/dev/null
#SBATCH --error=/dev/null
set -euo pipefail;umask 077
NODE=/apps/software/2024a/software/nodejs/20.13.1-GCCcore-13.3.0/bin/node
export PATH=/apps/software/2024a/software/nodejs/20.13.1-GCCcore-13.3.0/bin:/opt/slurm/current/bin:/usr/local/bin:/usr/bin:/bin
export LD_LIBRARY_PATH=/apps/software/2024a/software/ICU/75.1-GCCcore-13.3.0/lib:/apps/software/system/software/GCCcore/13.3.0/lib64:/apps/software/system/software/OpenSSL/3/lib:/apps/software/2024a/software/nodejs/20.13.1-GCCcore-13.3.0/lib;export TZ=UTC LC_ALL=C DEBUG_LOGGING=0
REPO=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot;DRIVER="$REPO/packages/chronodivide-bot-driver";: "${RESULTS_ROOT:?}" "${FINALIZER_ROOT:?}" "${ARRAY_JOB_ID:?}" "${PROGRAM_SHA256:?}" "${PROTOCOL_SHA256:?}" "${SCRIPT_SHA256:?}" "${ASSET_MANIFEST_SHA256:?}"
[[ "$(sha256sum "$0"|awk '{print $1}')" == "$SCRIPT_SHA256" ]]||exit 2;JOB_LINE=$(/opt/slurm/current/bin/scontrol show job -o "$SLURM_JOB_ID");[[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) && "${BASH_REMATCH[2]}" == pi_jss233 ]]||exit 2;export SLURM_JOB_ACCOUNT=pi_jss233
[[ ! -e "$FINALIZER_ROOT" ]]||exit 2;install -d -m 0700 "$FINALIZER_ROOT";exec >"$FINALIZER_ROOT/job.stdout.log" 2>"$FINALIZER_ROOT/job.stderr.log";cd "$REPO";[[ "$(git branch --show-current)" == main && -z "$(git status --porcelain=v1 --untracked-files=no)" ]]||exit 2;cd "$DRIVER"
export MODE=finalize RESULTS_ROOT ARRAY_JOB_ID PROGRAM_SHA256 PROTOCOL_SHA256 ASSET_MANIFEST_SHA256 OUT_FILE="$FINALIZER_ROOT/hfo-literal-gate.json";"$NODE" --es-module-specifier-resolution=node dist/training/hfoLiteralAllCountryGate.js;sha256sum "$OUT_FILE">"$FINALIZER_ROOT/hfo-literal-gate.sha256";printf '%s
' COMPLETE_HFO_LITERAL_GATE>"$FINALIZER_ROOT/COMPLETE"
