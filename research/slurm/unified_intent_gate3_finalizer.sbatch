#!/bin/bash
#SBATCH --job-name=chrono-intent-g3-finalize
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=08:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=24G
#SBATCH --no-requeue
#SBATCH --kill-on-invalid-dep=yes
#SBATCH --output=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/unified-intent-arbiter-v1/gate-3/finalizer-%j.stdout.log
#SBATCH --error=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/unified-intent-arbiter-v1/gate-3/finalizer-%j.stderr.log

set -euo pipefail
umask 077
NODE_ROOT=/apps/software/2024a/software/nodejs/20.13.1-GCCcore-13.3.0
ICU_ROOT=/apps/software/2024a/software/ICU/75.1-GCCcore-13.3.0
GCC_ROOT=/apps/software/system/software/GCCcore/13.3.0
OPENSSL_ROOT=/apps/software/system/software/OpenSSL/3
NODE_BIN="${NODE_ROOT}/bin/node"
export PATH="${NODE_ROOT}/bin:/opt/slurm/current/bin:/usr/bin:/bin"
export LD_LIBRARY_PATH="${ICU_ROOT}/lib:${GCC_ROOT}/lib64:${OPENSSL_ROOT}/lib64:${NODE_ROOT}/lib"
export TZ=UTC LC_ALL=C PYTHONHASHSEED=0 PYTHONDONTWRITEBYTECODE=1
unset NODE_OPTIONS
test "$("${NODE_BIN}" --version)" = "v20.13.1"

: "${REPO_ROOT:?}" "${EXECUTION_ROOT:?}" "${SOURCE_COMMIT:?}"
: "${PROGRAM_SHA256:?}" "${SCRIPT_SHA256:?}"
: "${IDENTITY_GATE3PROTOCOL_SHA256:?}" "${IDENTITY_GATE1RESULT_SHA256:?}"
: "${IDENTITY_GATE2RESULT_SHA256:?}" "${PURE_GATE_PATH:?}" "${PURE_GATE_SHA256:?}"
: "${MANIFEST_PATH:?}" "${MANIFEST_SHA256:?}" "${ARRAY_JOB_ID:?}"
export CHRONO_GAME_API_PATH="${REPO_ROOT}/packages/chronodivide-bot-driver/node_modules/@chronodivide/game-api/dist/index.js"

test "${SLURM_JOB_ACCOUNT:-}" = "pi_jss233"
test "${SLURM_JOB_PARTITION:-}" = "day"
test -z "${SLURM_JOB_GPUS:-}"
test -z "${SLURM_GPUS:-}"
test "$(sha256sum "$0" | awk '{print $1}')" = "${SCRIPT_SHA256}"

cd "${REPO_ROOT}"
test "$(git branch --show-current)" = main
test "$(git rev-parse HEAD)" = "${SOURCE_COMMIT}"
test "$(git rev-parse fork/main)" = "${SOURCE_COMMIT}"
test -z "$(git status --porcelain=v1)"
test ! -e "${EXECUTION_ROOT}/finalizer"
export MODE=finalize OUT_DIR="${EXECUTION_ROOT}/finalizer"
"${NODE_BIN}" --no-warnings --experimental-loader "${REPO_ROOT}/research/runtime/explicit-start-loader-v1.mjs" --es-module-specifier-resolution=node --max-old-space-size=16384 research/scripts/unified-intent-gate3-compatibility.mjs
