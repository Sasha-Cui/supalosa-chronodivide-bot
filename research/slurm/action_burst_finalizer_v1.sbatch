#!/bin/bash
#SBATCH --job-name=chrono-action-finalize
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=08:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=32G
#SBATCH --no-requeue

set -euo pipefail
umask 077

NODE_RUNTIME_ROOT=/apps/software/2024a/software/nodejs/20.13.1-GCCcore-13.3.0
ICU_RUNTIME_ROOT=/apps/software/2024a/software/ICU/75.1-GCCcore-13.3.0
GCC_RUNTIME_ROOT=/apps/software/system/software/GCCcore/13.3.0
OPENSSL_RUNTIME_ROOT=/apps/software/system/software/OpenSSL/3
NODE_BIN="${NODE_RUNTIME_ROOT}/bin/node"
export PATH="${NODE_RUNTIME_ROOT}/bin:/opt/slurm/current/bin:/usr/local/bin:/usr/bin:/bin"
export LD_LIBRARY_PATH="${ICU_RUNTIME_ROOT}/lib:${GCC_RUNTIME_ROOT}/lib64:${OPENSSL_RUNTIME_ROOT}/lib64:${NODE_RUNTIME_ROOT}/lib"
export TZ=UTC LC_ALL=C PYTHONHASHSEED=0 PYTHONDONTWRITEBYTECODE=1
unset NODE_OPTIONS
test "$("${NODE_BIN}" --version)" = "v20.13.1"

: "${REPO_ROOT:?}" "${EXECUTION_ROOT:?}" "${SOURCE_COMMIT:?}"
: "${PROGRAM_SHA256:?}" "${SCRIPT_SHA256:?}"
: "${PROTOCOL_SHA256:?}" "${AMENDMENT_A1_SHA256:?}"
: "${AMENDMENT_A2_SHA256:?}" "${AMENDMENT_A3_SHA256:?}"
: "${AMENDMENT_A4_SHA256:?}" "${AMENDMENT_A5_SHA256:?}" "${MANIFEST_PATH:?}" "${MANIFEST_SHA256:?}"
: "${ARRAY_JOB_ID:?}"

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
test ! -e "${EXECUTION_ROOT}/finalizer"

export MODE=finalize
export OUT_DIR="${EXECUTION_ROOT}/finalizer"
"${NODE_BIN}" --max-old-space-size=24576 research/scripts/action-burst-diagnostic-v1.mjs
