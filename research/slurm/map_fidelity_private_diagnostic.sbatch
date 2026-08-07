#!/bin/bash
#SBATCH --job-name=chrono-map-private-diagnostic
#SBATCH --account=pi_jss233
#SBATCH --partition=devel
#SBATCH --time=00:30:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=4G
#SBATCH --output=/dev/null
#SBATCH --error=/dev/null

set -euo pipefail
umask 077

REPO=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
PRIVATE_BASE=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/private-diagnostics/map-warning-text-v1
BASE_JOB="$REPO/research/slurm/map_fidelity_gate_v1.sbatch"
DIAGNOSTIC_WORKER="$REPO/packages/chronodivide-bot-driver/dist/benchmark/mapFidelityPrivateDiagnostic.js"
export MAP_FIDELITY_PRIVATE_DIAGNOSTICS_ROOT="$PRIVATE_BASE/raw/$SLURM_JOB_ID"

install -d -m 0700 "$PRIVATE_BASE" "$PRIVATE_BASE/raw" "$PRIVATE_BASE/runs"
mkdir -m 0700 "$MAP_FIDELITY_PRIVATE_DIAGNOSTICS_ROOT"

# This intentionally creates non-admissible private diagnostics. It reuses the
# exact gate orchestration but replaces both the evidence root and worker entry
# point; its outputs must never enter RESULT_REGISTRY.tsv or a paper result.
sed \
    -e "s|^EVIDENCE_BASE=.*|EVIDENCE_BASE=$PRIVATE_BASE/runs|" \
    -e "s|^WORKER=.*|WORKER=$DIAGNOSTIC_WORKER|" \
    "$BASE_JOB" | /bin/bash
