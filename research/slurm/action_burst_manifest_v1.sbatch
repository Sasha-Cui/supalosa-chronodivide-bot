#!/bin/bash
#SBATCH --job-name=chrono-action-manifest
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=01:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=8G
#SBATCH --no-requeue

set -euo pipefail
umask 077

: "${REPO_ROOT:?}" "${EXECUTION_ROOT:?}" "${SOURCE_COMMIT:?}"
: "${PROGRAM_SHA256:?}" "${SCRIPT_SHA256:?}"
: "${PROTOCOL_SHA256:?}" "${AMENDMENT_A1_SHA256:?}"
: "${AMENDMENT_A2_SHA256:?}" "${AMENDMENT_A3_SHA256:?}"
: "${AMENDMENT_A4_SHA256:?}"

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
test ! -e "${EXECUTION_ROOT}/manifest"

export MODE=prepare
export OUT_DIR="${EXECUTION_ROOT}/manifest"
node --max-old-space-size=4096 research/scripts/action-burst-diagnostic-v1.mjs
