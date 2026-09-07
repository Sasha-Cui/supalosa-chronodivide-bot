#!/bin/bash
#SBATCH --job-name=chrono-intent-g2-seed
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=06:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=8G
#SBATCH --no-requeue

set -euo pipefail
umask 077
export TZ=UTC LC_ALL=C PYTHONHASHSEED=0 PYTHONDONTWRITEBYTECODE=1

: "${SOURCE_COMMIT:?}"
: "${PROGRAM_SHA256:?}"
: "${SCRIPT_SHA256:?}"
: "${PROTOCOL_SHA256:?}"
: "${AMENDMENT_SHA256:?}"
: "${REPO_ROOT:?}"
: "${STUDY_ROOT:?}"

test "${SLURM_JOB_ACCOUNT:-}" = "pi_jss233"
test "${SLURM_JOB_PARTITION:-}" = "day"
test -z "${SLURM_JOB_GPUS:-}"
test -z "${SLURM_GPUS:-}"
test "$(sha256sum "$0" | awk '{print $1}')" = "${SCRIPT_SHA256}"

cd "${REPO_ROOT}"
test "$(git branch --show-current)" = "main"
test "$(git rev-parse HEAD)" = "${SOURCE_COMMIT}"
test "$(git rev-parse fork/main)" = "${SOURCE_COMMIT}"
test -z "$(git status --porcelain=v1)"

AUDIT_ROOT="${STUDY_ROOT}/seed-audit-v1"
test ! -e "${AUDIT_ROOT}"
install -d -m 0700 "${AUDIT_ROOT}"
exec >"${AUDIT_ROOT}/job.stdout.log" 2>"${AUDIT_ROOT}/job.stderr.log"

export OUT_PATH="${AUDIT_ROOT}/seed-audit.json"
python3 research/scripts/unified_intent_gate2_seed_audit.py
sha256sum "${OUT_PATH}" >"${AUDIT_ROOT}/seed-audit.sha256"
printf '%s\n' COMPLETE_UNIFIED_INTENT_GATE2_SEED_AUDIT_V1 >"${AUDIT_ROOT}/COMPLETE"
