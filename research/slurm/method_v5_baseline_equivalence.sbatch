#!/bin/bash
#SBATCH --job-name=chrono-v5-eq
#SBATCH --account=pi_jss233
#SBATCH --partition=devel
#SBATCH --time=00:30:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=4G
#SBATCH --output=/dev/null
#SBATCH --error=/dev/null

set -euo pipefail
umask 077
NODE_RUNTIME_ROOT=/apps/software/2024a/software/nodejs/20.13.1-GCCcore-13.3.0
export PATH="$NODE_RUNTIME_ROOT/bin:/opt/slurm/current/bin:/usr/local/bin:/usr/bin:/bin"
export LD_LIBRARY_PATH=/apps/software/2024a/software/ICU/75.1-GCCcore-13.3.0/lib:/apps/software/system/software/GCCcore/13.3.0/lib64:/apps/software/system/software/OpenSSL/3/lib64:$NODE_RUNTIME_ROOT/lib
export TZ=UTC LC_ALL=C PYTHONHASHSEED=0 PYTHONDONTWRITEBYTECODE=1
unset NODE_OPTIONS
REPO=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
DRIVER="$REPO/packages/chronodivide-bot-driver"
BASELINE=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/supalosa-chronodivide-bot/packages/chronodivide-bot
RUN_ROOT=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/method-v6/baseline-equivalence-v1/$SLURM_JOB_ID
JOB_LINE=$(/opt/slurm/current/bin/scontrol show job -o "$SLURM_JOB_ID")
[[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) ]] || { echo "Slurm account missing" >&2; exit 2; }
[[ "${BASH_REMATCH[2]}" == pi_jss233 ]] || { echo "Wrong Slurm account" >&2; exit 2; }
export SLURM_JOB_ACCOUNT=pi_jss233
cd "$REPO"
[[ "$(git branch --show-current)" == main && -z "$(git status --short --untracked-files=no)" ]] || { echo "Method-v5 equivalence requires clean main" >&2; exit 2; }
[[ ! -e "$RUN_ROOT" ]] || { echo "Refusing to reuse $RUN_ROOT" >&2; exit 2; }
install -d -m 0700 "$RUN_ROOT"
exec >"$RUN_ROOT/job.stdout.log" 2>"$RUN_ROOT/job.stderr.log"
cd "$DRIVER"
export BASELINE_PACKAGE_ROOT="$BASELINE" REQUIRE_EXTERNAL_BASELINE=true OUT_FILE="$RUN_ROOT/equivalence-gate.json"
"$NODE_RUNTIME_ROOT/bin/node" --es-module-specifier-resolution=node dist/training/methodV5BaselineEquivalence.js
