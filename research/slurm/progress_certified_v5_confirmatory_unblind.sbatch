#!/bin/bash
#SBATCH --job-name=chrono-pcv5-confirm-unblind
#SBATCH --account=pi_jss233
#SBATCH --partition=devel
#SBATCH --time=01:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=16G
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
UNBLINDER="$DRIVER/dist/training/progressCertifiedV5ConfirmatoryUnblinder.js"
: "${CAMPAIGN_ROOT:?CAMPAIGN_ROOT is required}"
: "${CAMPAIGN_SHA256:?CAMPAIGN_SHA256 is required}"
: "${EVIDENCE_BASE:?EVIDENCE_BASE is required}"
: "${ARRAY_JOB_ID:?ARRAY_JOB_ID is required}"
: "${TECHNICAL_GATE:?TECHNICAL_GATE is required}"
: "${UNBLIND_ROOT:?UNBLIND_ROOT is required}"
[[ "$ARRAY_JOB_ID" =~ ^[0-9]+$ && "$CAMPAIGN_SHA256" =~ ^[0-9a-f]{64}$ ]] || {
    echo "V5 confirmatory unblinding identifiers are invalid" >&2
    exit 2
}
[[ -f "$CAMPAIGN_ROOT/campaign.json" && \
   "$(sha256sum "$CAMPAIGN_ROOT/campaign.json" | cut -d' ' -f1)" == "$CAMPAIGN_SHA256" ]] || {
    echo "V5 confirmatory campaign commitment drifted" >&2
    exit 2
}
[[ -s "$TECHNICAL_GATE" ]] || { echo "V5 confirmatory technical gate is missing" >&2; exit 2; }

JOB_LINE=$($SCONTROL show job -o "$SLURM_JOB_ID")
[[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) ]] || { echo "Missing account" >&2; exit 2; }
[[ "${BASH_REMATCH[2]}" == pi_jss233 ]] || { echo "Wrong account" >&2; exit 2; }
export SLURM_JOB_ACCOUNT=pi_jss233

[[ ! -e "$UNBLIND_ROOT" ]] || { echo "Refusing to reuse $UNBLIND_ROOT" >&2; exit 2; }
install -d -m 0700 "$UNBLIND_ROOT"
exec >"$UNBLIND_ROOT/job.stdout.log" 2>"$UNBLIND_ROOT/job.stderr.log"

cd "$REPO"
[[ "$(git branch --show-current)" == main && -z "$(git status --porcelain=v1 --untracked-files=no)" ]] || {
    echo "V5 confirmatory unblinding requires clean tracked main" >&2
    exit 2
}
cd "$DRIVER"
export CAMPAIGN="$CAMPAIGN_ROOT/campaign.json"
export RESULTS_ROOT="$EVIDENCE_BASE"
export TECHNICAL_GATE
export TECHNICAL_GATE_SHA256
TECHNICAL_GATE_SHA256=$(sha256sum "$TECHNICAL_GATE" | cut -d' ' -f1)
export OUT_FILE="$UNBLIND_ROOT/confirmatory-unblinding.json"
export ARRAY_JOB_ID
"$NODE_BIN" --es-module-specifier-resolution=node "$UNBLINDER"
sha256sum "$OUT_FILE" >"$UNBLIND_ROOT/confirmatory-unblinding.sha256"
printf '%s\n' COMPLETE_PROGRESS_CERTIFIED_V5_CONFIRMATORY_UNBLINDING >"$UNBLIND_ROOT/COMPLETE"
