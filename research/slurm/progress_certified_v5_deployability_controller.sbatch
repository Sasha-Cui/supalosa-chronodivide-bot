#!/bin/bash
#SBATCH --job-name=chrono-pcv5-deploy-finalize
#SBATCH --account=pi_jss233
#SBATCH --partition=devel
#SBATCH --time=01:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=8G
#SBATCH --output=/dev/null
#SBATCH --error=/dev/null

set -euo pipefail
umask 077

SCONTROL=/opt/slurm/current/bin/scontrol
export PATH=/opt/slurm/current/bin:/usr/local/bin:/usr/bin:/bin
export TZ=UTC LC_ALL=C PYTHONHASHSEED=0 PYTHONDONTWRITEBYTECODE=1

REPO=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
: "${CAMPAIGN_PATH:?CAMPAIGN_PATH is required}"
: "${CAMPAIGN_SHA256:?CAMPAIGN_SHA256 is required}"
: "${RESULTS_ROOT:?RESULTS_ROOT is required}"
: "${ARRAY_JOB_ID:?ARRAY_JOB_ID is required}"
: "${FINALIZER_ROOT:?FINALIZER_ROOT is required}"
[[ "$CAMPAIGN_SHA256" =~ ^[0-9a-f]{64}$ && "$ARRAY_JOB_ID" =~ ^[0-9]+$ ]] || {
    echo "Invalid deployability campaign hash or array job ID" >&2
    exit 2
}

JOB_LINE=$($SCONTROL show job -o "$SLURM_JOB_ID")
[[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) ]] || { echo "Missing account" >&2; exit 2; }
[[ "${BASH_REMATCH[2]}" == pi_jss233 ]] || { echo "Wrong account" >&2; exit 2; }
export SLURM_JOB_ACCOUNT=pi_jss233
[[ ! -e "$FINALIZER_ROOT" ]] || { echo "Refusing to reuse finalizer output" >&2; exit 2; }
install -d -m 0700 "$FINALIZER_ROOT"
exec >"$FINALIZER_ROOT/job.stdout.log" 2>"$FINALIZER_ROOT/job.stderr.log"

cd "$REPO"
python3 research/scripts/v5_repair_deployability.py finalize \
    --repo "$REPO" \
    --campaign "$CAMPAIGN_PATH" \
    --campaign-sha256 "$CAMPAIGN_SHA256" \
    --results-root "$RESULTS_ROOT" \
    --array-job-id "$ARRAY_JOB_ID" \
    --output "$FINALIZER_ROOT/summary.json"
sha256sum "$FINALIZER_ROOT/summary.json" >"$FINALIZER_ROOT/summary.sha256"
printf '%s\n' COMPLETE_PROGRESS_CERTIFIED_V5_DEPLOYABILITY_FINALIZER >"$FINALIZER_ROOT/COMPLETE"
