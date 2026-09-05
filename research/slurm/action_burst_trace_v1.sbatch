#!/bin/bash
#SBATCH --job-name=chrono-action-trace
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=02:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=8G
#SBATCH --no-requeue
#SBATCH --output=/dev/null
#SBATCH --error=/dev/null

set -euo pipefail
umask 077

: "${REPO_ROOT:?}" "${EXECUTION_ROOT:?}" "${SOURCE_COMMIT:?}"
: "${PROGRAM_SHA256:?}" "${SCRIPT_SHA256:?}"
: "${PROTOCOL_SHA256:?}" "${AMENDMENT_A1_SHA256:?}"
: "${AMENDMENT_A2_SHA256:?}" "${AMENDMENT_A3_SHA256:?}"
: "${AMENDMENT_A4_SHA256:?}" "${MANIFEST_PATH:?}" "${MANIFEST_SHA256:?}"
: "${TRACE_ROLE:?}" "${BASELINE_PACKAGE_ROOT:?}"

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

if [[ "${TRACE_ROLE}" == array ]]; then
  TASK_INDEX="${SLURM_ARRAY_TASK_ID:?}"
  OUT_DIR="${EXECUTION_ROOT}/cells/task-$(printf '%04d' "${TASK_INDEX}")"
elif [[ "${TRACE_ROLE}" == smoke ]]; then
  : "${TASK_INDEX:?}"
  test "${TASK_INDEX}" = 0
  OUT_DIR="${EXECUTION_ROOT}/smoke"
else
  exit 2
fi
test ! -e "${OUT_DIR}"

export MODE=trace TASK_INDEX OUT_DIR
export REQUIRE_EXTERNAL_BASELINE=true
node --max-old-space-size=2048 research/scripts/action-burst-diagnostic-v1.mjs
