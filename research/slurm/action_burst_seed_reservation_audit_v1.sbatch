#!/bin/bash
#SBATCH --job-name=chrono-action-seed-audit
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=06:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=8G
#SBATCH --no-requeue

set -euo pipefail
umask 077

: "${SOURCE_COMMIT:?SOURCE_COMMIT is required}"
: "${PROGRAM_SHA256:?PROGRAM_SHA256 is required}"
: "${PROTOCOL_SHA256:?PROTOCOL_SHA256 is required}"
: "${SCRIPT_SHA256:?SCRIPT_SHA256 is required}"
: "${REPO_ROOT:?REPO_ROOT is required}"
: "${STUDY_ROOT:?STUDY_ROOT is required}"

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
python3 research/scripts/action_burst_seed_reservation_audit_v1.py
sha256sum "${OUT_PATH}" >"${AUDIT_ROOT}/seed-audit.sha256"
printf '%s\n' COMPLETE_ACTION_BURST_SEED_AUDIT_V1 >"${AUDIT_ROOT}/COMPLETE"
