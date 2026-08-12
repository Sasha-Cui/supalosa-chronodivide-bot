#!/bin/bash
#SBATCH --job-name=chrono-v4-eq
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
ICU_RUNTIME_ROOT=/apps/software/2024a/software/ICU/75.1-GCCcore-13.3.0
GCC_RUNTIME_ROOT=/apps/software/system/software/GCCcore/13.3.0
OPENSSL_RUNTIME_ROOT=/apps/software/system/software/OpenSSL/3
NODE_BIN="$NODE_RUNTIME_ROOT/bin/node"
SCONTROL=/opt/slurm/25.11.6/bin/scontrol
export PATH="$NODE_RUNTIME_ROOT/bin:/opt/slurm/25.11.6/bin:/usr/local/bin:/usr/bin:/bin"
export LD_LIBRARY_PATH="$ICU_RUNTIME_ROOT/lib:$GCC_RUNTIME_ROOT/lib64:$OPENSSL_RUNTIME_ROOT/lib64:$NODE_RUNTIME_ROOT/lib"
export TZ=UTC
export LC_ALL=C
export PYTHONHASHSEED=0
export PYTHONDONTWRITEBYTECODE=1
unset NODE_OPTIONS

REPO=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
DRIVER_ROOT="$REPO/packages/chronodivide-bot-driver"
BASELINE_ROOT=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/supalosa-chronodivide-bot/packages/chronodivide-bot
EVIDENCE_BASE=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/method-v4/baseline-equivalence-v1
RUN_ROOT="$EVIDENCE_BASE/$SLURM_JOB_ID"

JOB_LINE=$($SCONTROL show job -o "$SLURM_JOB_ID")
if [[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) ]]; then
    JOB_ACCOUNT=${BASH_REMATCH[2]}
else
    echo "Authoritative Slurm account is absent from scontrol output" >&2
    exit 2
fi
if [[ "$JOB_ACCOUNT" != "pi_jss233" ]]; then
    echo "Refusing Method-v4 equivalence gate under account $JOB_ACCOUNT" >&2
    exit 2
fi
export SLURM_JOB_ACCOUNT="$JOB_ACCOUNT"

cd "$REPO"
if [[ "$(git branch --show-current)" != "main" || -n "$(git status --porcelain=v1 --untracked-files=no)" ]]; then
    echo "Method-v4 equivalence gate requires clean main" >&2
    exit 2
fi
if [[ -e "$RUN_ROOT" ]]; then
    echo "Refusing to reuse Method-v4 equivalence output $RUN_ROOT" >&2
    exit 2
fi
install -d -m 0700 "$RUN_ROOT"
exec >"$RUN_ROOT/job.stdout.log" 2>"$RUN_ROOT/job.stderr.log"

cd "$DRIVER_ROOT"
export BASELINE_PACKAGE_ROOT="$BASELINE_ROOT"
export REQUIRE_EXTERNAL_BASELINE=true
export OUT_FILE="$RUN_ROOT/equivalence-gate.json"
"$NODE_BIN" --es-module-specifier-resolution=node dist/training/methodV4BaselineEquivalence.js
