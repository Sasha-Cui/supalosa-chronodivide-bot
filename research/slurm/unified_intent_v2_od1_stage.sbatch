#!/bin/bash
#SBATCH --job-name=chrono-intent-v2od1
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=04:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=8G
#SBATCH --no-requeue
#SBATCH --output=/dev/null
#SBATCH --error=/dev/null
set -euo pipefail
umask 077
NODE_ROOT=/apps/software/2024a/software/nodejs/20.13.1-GCCcore-13.3.0
ICU_ROOT=/apps/software/2024a/software/ICU/75.1-GCCcore-13.3.0
GCC_ROOT=/apps/software/system/software/GCCcore/13.3.0
OPENSSL_ROOT=/apps/software/system/software/OpenSSL/3
export PATH="${NODE_ROOT}/bin:/opt/slurm/current/bin:/usr/bin:/bin"
export LD_LIBRARY_PATH="${ICU_ROOT}/lib:${GCC_ROOT}/lib64:${OPENSSL_ROOT}/lib64:${NODE_ROOT}/lib"
export TZ=UTC LC_ALL=C PYTHONHASHSEED=0 PYTHONDONTWRITEBYTECODE=1
unset NODE_OPTIONS
: "${REPO_ROOT:?}" "${SOURCE_COMMIT:?}" "${PROGRAM_SHA256:?}" "${SCRIPT_SHA256:?}" "${PROTOCOL_SHA256:?}"
: "${MODE:?}" "${PURE_GATE_PATH:?}" "${PURE_JOB_ID:?}"
test "${REPO_ROOT}" = /nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
export TMPDIR="${REPO_ROOT}/tmp"
export CHRONO_GAME_API_PATH="${REPO_ROOT}/packages/chronodivide-bot-driver/node_modules/@chronodivide/game-api/dist/index.js"
export REQUIRE_EXTERNAL_BASELINE=true
test "$(node --version)" = v20.13.1
test "${SLURM_JOB_ACCOUNT:-}" = pi_jss233
test "${SLURM_JOB_PARTITION:-}" = day
test -z "${SLURM_JOB_GPUS:-}"
test -z "${SLURM_GPUS:-}"
test "$(sha256sum "$0" | awk '{print $1}')" = "${SCRIPT_SHA256}"
cd "${REPO_ROOT}"
node --no-warnings --experimental-loader "${REPO_ROOT}/research/runtime/explicit-start-loader-v1.mjs" --es-module-specifier-resolution=node --max-old-space-size=6144 research/scripts/unified-intent-v2-od1.mjs
