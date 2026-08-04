#!/bin/bash
#SBATCH --job-name=chrono-audit-p1
#SBATCH --account=pi_jss233
#SBATCH --partition=devel
#SBATCH --time=00:30:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=4G
#SBATCH --array=0-3%4
#SBATCH --output=/nfs/roberts/scratch/pi_jss233/zc362/chrono_divide-paper-audit/slurm/audit-pilot-v1-%A_%a.out
#SBATCH --error=/nfs/roberts/scratch/pi_jss233/zc362/chrono_divide-paper-audit/slurm/audit-pilot-v1-%A_%a.err

set -euo pipefail
REPO=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
exec "$REPO/research/scripts/run_audit_pilot_task.sh" "$SLURM_ARRAY_TASK_ID" "$SLURM_ARRAY_JOB_ID"
