#!/bin/bash
#SBATCH --job-name=chrono-action-seed-cert
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=01:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=8G
#SBATCH --no-requeue

set -euo pipefail
umask 077

: "${REPO_ROOT:?}" "${STUDY_ROOT:?}" "${SOURCE_COMMIT:?}"
: "${PROGRAM_SHA256:?}" "${SCRIPT_SHA256:?}" "${AMENDMENT_A6_SHA256:?}"

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

CERT_ROOT="${STUDY_ROOT}/seed-certificate-v1-a2"
test ! -e "${CERT_ROOT}"
install -d -m 0700 "${CERT_ROOT}"
exec >"${CERT_ROOT}/job.stdout.log" 2>"${CERT_ROOT}/job.stderr.log"

export OUT_PATH="${CERT_ROOT}/selection-certificate.json"
python3 research/scripts/action_burst_seed_certificate_v1.py
sha256sum "${OUT_PATH}" >"${CERT_ROOT}/selection-certificate.sha256"
printf '%s\n' COMPLETE_ACTION_BURST_SEED_CERTIFICATE_V1_A2 >"${CERT_ROOT}/COMPLETE"
