#!/bin/bash
#SBATCH --job-name=chrono-pcv5-compat
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=01:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=6G
#SBATCH --output=/dev/null
#SBATCH --error=/dev/null

set -euo pipefail
umask 077

NODE_RUNTIME_ROOT=/apps/software/2024a/software/nodejs/20.13.1-GCCcore-13.3.0
ICU_RUNTIME_ROOT=/apps/software/2024a/software/ICU/75.1-GCCcore-13.3.0
GCC_RUNTIME_ROOT=/apps/software/system/software/GCCcore/13.3.0
OPENSSL_RUNTIME_ROOT=/apps/software/system/software/OpenSSL/3
NODE_BIN="$NODE_RUNTIME_ROOT/bin/node"
SCONTROL=/opt/slurm/current/bin/scontrol
export PATH="$NODE_RUNTIME_ROOT/bin:/opt/slurm/current/bin:/usr/local/bin:/usr/bin:/bin"
export LD_LIBRARY_PATH="$ICU_RUNTIME_ROOT/lib:$GCC_RUNTIME_ROOT/lib64:$OPENSSL_RUNTIME_ROOT/lib64:$NODE_RUNTIME_ROOT/lib"
export TZ=UTC LC_ALL=C PYTHONHASHSEED=0 PYTHONDONTWRITEBYTECODE=1
unset NODE_OPTIONS

REPO=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
DRIVER="$REPO/packages/chronodivide-bot-driver"
BASELINE=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/supalosa-chronodivide-bot/packages/chronodivide-bot
: "${EVIDENCE_ROOT:?EVIDENCE_ROOT is required}"

JOB_LINE=$($SCONTROL show job -o "$SLURM_JOB_ID")
[[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) ]] || { echo "Missing account" >&2; exit 2; }
[[ "${BASH_REMATCH[2]}" == pi_jss233 ]] || { echo "Wrong account ${BASH_REMATCH[2]}" >&2; exit 2; }
export SLURM_JOB_ACCOUNT=pi_jss233

cd "$REPO"
[[ "$(git branch --show-current)" == main && -z "$(git status --porcelain=v1 --untracked-files=no)" ]] || {
    echo "V5 compatibility requires clean tracked main" >&2
    exit 2
}
[[ "$(git rev-parse HEAD)" == "$(git rev-parse fork/main)" ]] || {
    echo "V5 compatibility requires pushed fork/main" >&2
    exit 2
}

JOB_ROOT="$EVIDENCE_ROOT/$SLURM_JOB_ID"
[[ ! -e "$JOB_ROOT" ]] || { echo "Refusing to reuse $JOB_ROOT" >&2; exit 2; }
install -d -m 0700 "$EVIDENCE_ROOT"
mkdir -m 0700 "$JOB_ROOT"
exec >"$JOB_ROOT/job.stdout.log" 2>"$JOB_ROOT/job.stderr.log"

"$NODE_BIN" node_modules/typescript/bin/tsc -b
cd "$DRIVER"
"$NODE_BIN" node_modules/vitest/vitest.mjs run \
    src/test/progressCertifiedConversionPolicy.test.ts \
    src/test/progressCertifiedExperimentPolicy.test.ts \
    src/test/progressCertifiedV5CompatibilityGate.test.ts \
    src/test/terminalObjectiveStrategy.test.ts \
    --testTimeout=300000

export BASELINE_PACKAGE_ROOT="$BASELINE"
export REQUIRE_EXTERNAL_BASELINE=true
export OUT_FILE="$JOB_ROOT/compatibility.json"
"$NODE_BIN" --es-module-specifier-resolution=node \
    dist/training/progressCertifiedV5CompatibilityGate.js
sha256sum "$OUT_FILE" >"$JOB_ROOT/compatibility.sha256"
printf '%s\n' PASS_OUTCOME_FREE_PROGRESS_CERTIFIED_V5_COMPATIBILITY_V2 >"$JOB_ROOT/COMPLETE"
