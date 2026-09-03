#!/bin/bash
#SBATCH --job-name=chrono-fresh-seed-audit
#SBATCH --time=02:00:00
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --cpus-per-task=1
#SBATCH --mem=4G
#SBATCH --no-requeue
#SBATCH --output=/dev/null
#SBATCH --error=/dev/null
set -euo pipefail
umask 077
REPO=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
STUDY=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/fresh-dual-endpoint-v1
: "${SOURCE_COMMIT:?}" "${SCRIPT_SHA256:?}" "${PLAN_FILE_SHA256:?}"
[[ "$(sha256sum "$0" | awk '{print $1}')" == "$SCRIPT_SHA256" ]]
JOB_LINE=$(/opt/slurm/current/bin/scontrol show job -o "$SLURM_JOB_ID")
[[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) && "${BASH_REMATCH[2]}" == pi_jss233 ]]
[[ "$JOB_LINE" =~ (^|[[:space:]])Partition=day([[:space:]]|$) && "$JOB_LINE" != *"gres/gpu"* ]]
export SLURM_JOB_ACCOUNT=pi_jss233
cd "$REPO"
[[ "$(git branch --show-current)" == main && -z "$(git status --porcelain=v1)" && "$(git rev-parse HEAD)" == "$SOURCE_COMMIT" && "$SOURCE_COMMIT" == "$(git rev-parse fork/main)" ]]
: "${AUDIT_PROGRAM_SHA256:?}" "${AUDIT_SCOPE_SHA256:?}"
DIR="$STUDY/audit"
[[ ! -e "$DIR" ]]
install -d -m 0700 "$DIR"
exec >"$DIR/job.stdout.log" 2>"$DIR/job.stderr.log"
export OUT_PATH="$DIR/seed-audit.json"
python3 "$REPO/research/scripts/fresh_dual_seed_reservation_audit_v1.py"
sha256sum "$OUT_PATH" >"$DIR/seed-audit.sha256"
printf '%s\n' COMPLETE_FRESH_DUAL_SEED_AUDIT_V1 >"$DIR/COMPLETE"
