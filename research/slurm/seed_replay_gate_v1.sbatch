#!/bin/bash
#SBATCH --job-name=chrono-seed-gate
#SBATCH --account=pi_jss233
#SBATCH --partition=devel
#SBATCH --time=00:30:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=4G
#SBATCH --output=/nfs/roberts/scratch/pi_jss233/zc362/chrono_divide-paper-audit/slurm/seed-replay-gate-v1-%j.out
#SBATCH --error=/nfs/roberts/scratch/pi_jss233/zc362/chrono_divide-paper-audit/slurm/seed-replay-gate-v1-%j.err

set -euo pipefail
NODE_RUNTIME_ROOT=/apps/software/2024a/software/nodejs/20.13.1-GCCcore-13.3.0
ICU_RUNTIME_ROOT=/apps/software/2024a/software/ICU/75.1-GCCcore-13.3.0
GCC_RUNTIME_ROOT=/apps/software/system/software/GCCcore/13.3.0
OPENSSL_RUNTIME_ROOT=/apps/software/system/software/OpenSSL/3
export PATH="$NODE_RUNTIME_ROOT/bin:/opt/slurm/current/bin:${PATH:-/usr/bin:/bin}"
export LD_LIBRARY_PATH="$ICU_RUNTIME_ROOT/lib:$GCC_RUNTIME_ROOT/lib64:$OPENSSL_RUNTIME_ROOT/lib64:$NODE_RUNTIME_ROOT/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
node --version
npm --version

REPO=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
SCRATCH=/nfs/roberts/scratch/pi_jss233/zc362/chrono_divide-paper-audit
SCONTROL=/opt/slurm/current/bin/scontrol
JOB_LINE=$($SCONTROL show job -o "$SLURM_JOB_ID")
JOB_ACCOUNT=$(tr ' ' '\n' <<< "$JOB_LINE" | awk -F= '$1 == "Account" {print $2; exit}')
if [[ "$JOB_ACCOUNT" != "pi_jss233" ]]; then
    echo "Refusing seed replay gate: authoritative Slurm account is $JOB_ACCOUNT, expected pi_jss233" >&2
    exit 2
fi

cd "$REPO"
npm run build --workspace=@supalosa/chronodivide-bot-driver

for TASK_ID in $(seq 0 10); do
    "$REPO/research/scripts/run_seed_replay_gate_task.sh" "$TASK_ID" "$SLURM_JOB_ID"
done

RESULT_ROOT="$SCRATCH/seed-replay-gate-v1/$SLURM_JOB_ID"
python3 "$REPO/research/scripts/check_seed_replay_gate.py" "$RESULT_ROOT"
