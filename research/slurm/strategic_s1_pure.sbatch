#!/bin/bash
#SBATCH --job-name=chrono-s1-pure
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=1
#SBATCH --mem=8G
#SBATCH --time=02:00:00
#SBATCH --no-requeue
#SBATCH --chdir=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
#SBATCH --open-mode=append
#SBATCH --output=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1/slurm/pure-%A_%a.out
#SBATCH --error=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/strategic-diagnostic-s1/slurm/pure-%A_%a.err
set -euo pipefail
umask 077
NODE_ROOT=/apps/software/2024a/software/nodejs/20.13.1-GCCcore-13.3.0
ICU_ROOT=/apps/software/2024a/software/ICU/75.1-GCCcore-13.3.0
GCC_ROOT=/apps/software/system/software/GCCcore/13.3.0
OPENSSL_ROOT=/apps/software/system/software/OpenSSL/3
export PATH="${NODE_ROOT}/bin:/opt/slurm/current/bin:/usr/bin:/bin"
export LD_LIBRARY_PATH="${ICU_ROOT}/lib:${GCC_ROOT}/lib64:${OPENSSL_ROOT}/lib64:${NODE_ROOT}/lib"
export TZ=UTC LC_ALL=C PYTHONHASHSEED=0 PYTHONDONTWRITEBYTECODE=1 SLURM_EXPORT_ENV=ALL
unset NODE_OPTIONS
: "${REPO_ROOT:?}" "${SOURCE_COMMIT:?}" "${PROGRAM_SHA256:?}" "${SCRIPT_SHA256:?}" "${PROTOCOL_SHA256:?}" "${MODE:?}"
test "${REPO_ROOT}" = /nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
test "$(node --version)" = v20.13.1
test "${SLURM_JOB_ACCOUNT:-}" = pi_jss233
test "${SLURM_JOB_PARTITION:-}" = day
test "${SLURM_CPUS_PER_TASK:-}" = 1
test "${SLURM_JOB_NUM_NODES:-}" = 1
test "${SLURM_RESTART_COUNT:-0}" = 0
test -z "${SLURM_JOB_GPUS:-}"
test -z "${SLURM_GPUS:-}"
test -z "${CHRONO_AI_INI_PATH:-}"
test "$(sha256sum "$0" | awk '{print $1}')" = "${SCRIPT_SHA256}"
export TMPDIR="${REPO_ROOT}/tmp"
cd "${REPO_ROOT}"
test "${MODE}" = pure
: "${OUT_DIR:?}"
node --max-old-space-size=6144 research/scripts/strategic-s1-pure.mjs
