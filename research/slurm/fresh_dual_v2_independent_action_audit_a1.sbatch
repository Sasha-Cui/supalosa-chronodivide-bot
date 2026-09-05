#!/bin/bash
#SBATCH --job-name=chrono-dual-audit-a1
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=12:00:00
#SBATCH --cpus-per-task=8
#SBATCH --mem=32G
#SBATCH --no-requeue

set -euo pipefail

: "${EVIDENCE_ROOT:?EVIDENCE_ROOT is required}"
: "${OUT_DIR:?OUT_DIR is required}"
: "${SOURCE_COMMIT:?SOURCE_COMMIT is required}"
: "${PROGRAM_SHA256:?PROGRAM_SHA256 is required}"
: "${REPO_ROOT:?REPO_ROOT is required}"

test "${SLURM_JOB_ACCOUNT:-}" = "pi_jss233"
test "${SLURM_JOB_PARTITION:-}" = "day"
test -z "${SLURM_JOB_GPUS:-}"
test -z "${SLURM_GPUS:-}"
test ! -e "${OUT_DIR}"

cd "${REPO_ROOT}"
test "$(git branch --show-current)" = "main"
test "$(git rev-parse HEAD)" = "${SOURCE_COMMIT}"
test "$(git rev-parse fork/main)" = "${SOURCE_COMMIT}"
test -z "$(git status --porcelain=v1 --untracked-files=no)"
test "$(sha256sum research/scripts/audit_fresh_dual_v2_independent.py | awk '{print $1}')" = "${PROGRAM_SHA256}"

python3 research/scripts/audit_fresh_dual_v2_independent.py \
  --root "${EVIDENCE_ROOT}" \
  --output "${OUT_DIR}" \
  --workers "${SLURM_CPUS_PER_TASK}" \
  --verify-live-scheduler \
  --analysis-source-commit "${SOURCE_COMMIT}" \
  --program-sha256 "${PROGRAM_SHA256}"
