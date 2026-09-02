#!/bin/bash
#SBATCH --job-name=chrono-mm-seed-audit
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=02:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=8G
#SBATCH --output=/dev/null
#SBATCH --error=/dev/null
set -euo pipefail
umask 077
REPO=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
: "${RESULTS_ROOT:?}" "${SOURCE_COMMIT:?}" "${SCRIPT_SHA256:?}" "${AUDIT_PROGRAM_SHA256:?}" "${CENSUS_AMENDMENT_SHA256:?}"
[[ "$(sha256sum "$0" | awk '{print $1}')" == "$SCRIPT_SHA256" ]]
JOB_LINE=$(/opt/slurm/current/bin/scontrol show job -o "$SLURM_JOB_ID")
[[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) && "${BASH_REMATCH[2]}" == pi_jss233 ]]
export SLURM_JOB_ACCOUNT=pi_jss233
[[ ! -e "$RESULTS_ROOT" ]]
install -d -m 0700 "$RESULTS_ROOT"
exec >"$RESULTS_ROOT/job.stdout.log" 2>"$RESULTS_ROOT/job.stderr.log"
cd "$REPO"
export SOURCE_COMMIT AUDIT_PROGRAM_SHA256 CENSUS_AMENDMENT_SHA256
export OUT_PATH="$RESULTS_ROOT/seed-audit.json"
/usr/bin/python3 research/scripts/multimap_v2_seed_reservation_audit.py
sha256sum "$OUT_PATH" >"$RESULTS_ROOT/seed-audit.sha256"
printf '%s\n' COMPLETE_MULTIMAP_V2_SEED_AUDIT >"$RESULTS_ROOT/COMPLETE"
