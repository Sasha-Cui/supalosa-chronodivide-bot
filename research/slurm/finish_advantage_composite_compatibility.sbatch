#!/bin/bash
#SBATCH --job-name=chrono-finish-composite-gate
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=04:00:00
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
RUNNER="$DRIVER/dist/training/finishAdvantageCompositeCompatibilityRunner.js"
: "${STATE_AUDIT_FILE:?STATE_AUDIT_FILE is required}"
: "${STATE_AUDIT_SHA256:?STATE_AUDIT_SHA256 is required}"
: "${COMPOSITE_GATE_PROTOCOL:?COMPOSITE_GATE_PROTOCOL is required}"
: "${COMPOSITE_GATE_AMENDMENT_1:?COMPOSITE_GATE_AMENDMENT_1 is required}"
: "${COMPOSITE_GATE_AMENDMENT_2:?COMPOSITE_GATE_AMENDMENT_2 is required}"
: "${COMPOSITE_GATE_AMENDMENT_3:?COMPOSITE_GATE_AMENDMENT_3 is required}"
: "${COMPOSITE_GATE_AMENDMENT_4:?COMPOSITE_GATE_AMENDMENT_4 is required}"
: "${COMPOSITE_GATE_AMENDMENT_5:?COMPOSITE_GATE_AMENDMENT_5 is required}"
: "${JOB_ROOT:?JOB_ROOT is required}"
[[ "$STATE_AUDIT_SHA256" =~ ^[0-9a-f]{64}$ ]] || { echo "Invalid state-audit SHA-256" >&2; exit 2; }
[[ -f "$STATE_AUDIT_FILE" && -f "$COMPOSITE_GATE_PROTOCOL" && -f "$COMPOSITE_GATE_AMENDMENT_1" && -f "$COMPOSITE_GATE_AMENDMENT_2" && -f "$COMPOSITE_GATE_AMENDMENT_3" && -f "$COMPOSITE_GATE_AMENDMENT_4" && -f "$COMPOSITE_GATE_AMENDMENT_5" ]] || {
    echo "Composite compatibility evidence input is missing" >&2
    exit 2
}

JOB_LINE=$($SCONTROL show job -o "$SLURM_JOB_ID")
[[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) ]] || { echo "Missing account" >&2; exit 2; }
[[ "${BASH_REMATCH[2]}" == pi_jss233 ]] || { echo "Wrong account" >&2; exit 2; }
export SLURM_JOB_ACCOUNT=pi_jss233

[[ ! -e "$JOB_ROOT" ]] || { echo "Refusing to reuse composite gate root $JOB_ROOT" >&2; exit 2; }
install -d -m 0700 "$JOB_ROOT"
exec >"$JOB_ROOT/job.stdout.log" 2>"$JOB_ROOT/job.stderr.log"

cd "$REPO"
[[ "$(git branch --show-current)" == main && -z "$(git status --porcelain=v1 --untracked-files=no)" ]] || {
    echo "Composite compatibility gate requires clean tracked main" >&2
    exit 2
}
cd "$DRIVER"
export OUT_FILE="$JOB_ROOT/composite-compatibility-gate.json"
export STATE_AUDIT_FILE STATE_AUDIT_SHA256 COMPOSITE_GATE_PROTOCOL COMPOSITE_GATE_AMENDMENT_1 COMPOSITE_GATE_AMENDMENT_2 COMPOSITE_GATE_AMENDMENT_3 COMPOSITE_GATE_AMENDMENT_4 COMPOSITE_GATE_AMENDMENT_5
export BASELINE_PACKAGE_ROOT="$BASELINE"
export REQUIRE_EXTERNAL_BASELINE=true
"$NODE_BIN" --es-module-specifier-resolution=node "$RUNNER"
sha256sum "$OUT_FILE" >"$JOB_ROOT/composite-compatibility-gate.sha256"
printf '%s\n' COMPLETE_FINISH_ADVANTAGE_OUTCOME_FREE_COMPOSITE_COMPATIBILITY >"$JOB_ROOT/COMPLETE"
