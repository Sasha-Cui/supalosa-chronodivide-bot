#!/bin/bash
#SBATCH --job-name=chrono-stagnation-gate
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=12:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=8G
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
export TZ=UTC LC_ALL=C PYTHONHASHSEED=0 PYTHONDONTWRITEBYTECODE=1 DEBUG_LOGGING=0
unset NODE_OPTIONS

REPO=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
DRIVER="$REPO/packages/chronodivide-bot-driver"
BASELINE=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/supalosa-chronodivide-bot/packages/chronodivide-bot
PROGRAM="$DRIVER/dist/training/stagnationAssaultCompatibilityGate.js"
PROTOCOL="$REPO/research/protocols/finish-advantage/2026-08-18-stagnation-assault-open-development-protocol-v1.md"
: "${RESULT_ROOT:?RESULT_ROOT is required}"
: "${PROGRAM_SHA256:?PROGRAM_SHA256 is required}"
: "${PROTOCOL_SHA256:?PROTOCOL_SHA256 is required}"
: "${SCRIPT_SHA256:?SCRIPT_SHA256 is required}"
[[ "$PROGRAM_SHA256" =~ ^[0-9a-f]{64}$ && "$PROTOCOL_SHA256" =~ ^[0-9a-f]{64}$ &&
   "$SCRIPT_SHA256" =~ ^[0-9a-f]{64}$ ]] || { echo "Invalid SHA-256 input" >&2; exit 2; }
[[ "$(sha256sum "$0" | awk '{print $1}')" == "$SCRIPT_SHA256" ]] || {
    echo "Stagnation gate script commitment drifted" >&2
    exit 2
}
[[ ! -e "$RESULT_ROOT" ]] || { echo "Refusing to reuse $RESULT_ROOT" >&2; exit 2; }
install -d -m 0700 "$RESULT_ROOT"
exec >"$RESULT_ROOT/job.stdout.log" 2>"$RESULT_ROOT/job.stderr.log"

JOB_LINE=$($SCONTROL show job -o "$SLURM_JOB_ID")
[[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) ]] || { echo "Missing account" >&2; exit 2; }
[[ "${BASH_REMATCH[2]}" == pi_jss233 ]] || { echo "Wrong account" >&2; exit 2; }
export SLURM_JOB_ACCOUNT=pi_jss233

cd "$REPO"
[[ "$(git branch --show-current)" == main && -z "$(git status --porcelain=v1 --untracked-files=no)" &&
   "$(git rev-parse HEAD)" == "$(git rev-parse fork/main)" ]] || {
    echo "Stagnation gate requires clean pushed main" >&2
    exit 2
}
cd "$DRIVER"
export OUT_FILE="$RESULT_ROOT/stagnation-assault-compatibility-gate.json"
export PROTOCOL_PATH="$PROTOCOL" PROGRAM_PATH="$PROGRAM"
export PROGRAM_SHA256 PROTOCOL_SHA256
export BASELINE_PACKAGE_ROOT="$BASELINE" REQUIRE_EXTERNAL_BASELINE=true
"$NODE_BIN" --es-module-specifier-resolution=node "$PROGRAM"
sha256sum "$OUT_FILE" >"$RESULT_ROOT/stagnation-assault-compatibility-gate.sha256"
printf '%s\n' COMPLETE_STAGNATION_ASSAULT_COMPATIBILITY_GATE >"$RESULT_ROOT/COMPLETE"
