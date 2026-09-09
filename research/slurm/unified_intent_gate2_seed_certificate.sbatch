#!/bin/bash
#SBATCH --job-name=chrono-intent-g2-cert
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=02:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=8G
#SBATCH --no-requeue

set -euo pipefail
umask 077
export TZ=UTC LC_ALL=C PYTHONHASHSEED=0 PYTHONDONTWRITEBYTECODE=1

: "${SOURCE_COMMIT:?}"
: "${PROGRAM_SHA256:?}"
: "${SCRIPT_SHA256:?}"
: "${AMENDMENT_A3_SHA256:?}"
: "${AMENDMENT_A4_SHA256:?}"
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

CERT_ROOT="${STUDY_ROOT}/seed-certificate-v1-a4"
test ! -e "${CERT_ROOT}"
install -d -m 0700 "${CERT_ROOT}"
exec >"${CERT_ROOT}/job.stdout.log" 2>"${CERT_ROOT}/job.stderr.log"

export OUT_PATH="${CERT_ROOT}/selection-certificate.json"
python3 research/scripts/unified_intent_gate2_seed_certificate.py
sha256sum "${OUT_PATH}" >"${CERT_ROOT}/selection-certificate.sha256"
printf '%s\n' COMPLETE_UNIFIED_INTENT_GATE2_SEED_CERTIFICATE_V1_A4 >"${CERT_ROOT}/COMPLETE"
