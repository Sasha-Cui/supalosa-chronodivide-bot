#!/bin/bash
#SBATCH --job-name=chrono-map-fidelity
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=02:00:00
#SBATCH --cpus-per-task=1
#SBATCH --mem=4G
#SBATCH --output=/dev/null
#SBATCH --error=/dev/null

set -euo pipefail
umask 077

NODE_RUNTIME_ROOT=/apps/software/2024a/software/nodejs/20.13.1-GCCcore-13.3.0
ICU_RUNTIME_ROOT=/apps/software/2024a/software/ICU/75.1-GCCcore-13.3.0
GCC_RUNTIME_ROOT=/apps/software/system/software/GCCcore/13.3.0
OPENSSL_RUNTIME_ROOT=/apps/software/system/software/OpenSSL/3
export PATH="$NODE_RUNTIME_ROOT/bin:/opt/slurm/current/bin:/usr/local/bin:/usr/bin:/bin"
export LD_LIBRARY_PATH="$ICU_RUNTIME_ROOT/lib:$GCC_RUNTIME_ROOT/lib64:$OPENSSL_RUNTIME_ROOT/lib64:$NODE_RUNTIME_ROOT/lib"
export SCONTROL=/opt/slurm/current/bin/scontrol
export TZ=UTC
export LC_ALL=C
export PYTHONHASHSEED=0
unset NODE_OPTIONS
# Warning-level engine diagnostics are part of the fidelity evidence. Overwrite
# any submit-shell value, then prevent later script code from changing the mode.
DEBUG_LOGGING=1
readonly DEBUG_LOGGING
export DEBUG_LOGGING

REPO=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
MIX_DIR=/nfs/roberts/scratch/pi_jss233/zc362/chrono_divide-assets/headless-data-full-ra2
SCRATCH=/nfs/roberts/scratch/pi_jss233/zc362/chrono_divide-paper-audit
CATALOG="$REPO/research/artifacts/map_family_catalog.json"
TARGETS="$REPO/research/artifacts/role_blind_fidelity_targets_v1.json"
TARGET_TICK=250
readonly TARGET_TICK
export TARGET_TICK
MAP_FIDELITY_SCOPE=${MAP_FIDELITY_SCOPE:-full}
PREPARE_SCOPE_ARGS=()
case "$MAP_FIDELITY_SCOPE" in
    full)
        RUN_ROOT="$SCRATCH/map-fidelity-gate-v1/$SLURM_JOB_ID"
        ;;
    preflight)
        RUN_ROOT="$SCRATCH/map-fidelity-preflight-v1/$SLURM_JOB_ID"
        PREPARE_SCOPE_ARGS=(--family-limit 3)
        ;;
    *)
        echo "MAP_FIDELITY_SCOPE must be full or preflight" >&2
        exit 2
        ;;
esac

# Slurm opens its directive logs before this script can set umask. Discard those
# handles and reopen private logs only after creating the job-specific 0700 root.
install -d -m 0700 "$(dirname "$RUN_ROOT")"
mkdir -m 0700 "$RUN_ROOT"
exec >"$RUN_ROOT/job.stdout.log" 2>"$RUN_ROOT/job.stderr.log"
chmod 0600 "$RUN_ROOT/job.stdout.log" "$RUN_ROOT/job.stderr.log"

JOB_LINE=$($SCONTROL show job -o "$SLURM_JOB_ID")
JOB_ACCOUNT=$(tr ' ' '\n' <<< "$JOB_LINE" | awk -F= '$1 == "Account" {print $2; exit}')
if [[ "$JOB_ACCOUNT" != "pi_jss233" ]]; then
    echo "Refusing map fidelity gate: authoritative Slurm account is $JOB_ACCOUNT, expected pi_jss233" >&2
    exit 2
fi
if [[ ! -d "$MIX_DIR" ]]; then
    echo "Required full RA2 asset directory is missing: $MIX_DIR" >&2
    exit 2
fi

cd "$REPO"
node --version
npm --version
npm run build --workspace=@supalosa/chronodivide-bot-driver

python3 "$REPO/research/scripts/map_fidelity_gate.py" prepare \
    --repo-root "$REPO" \
    --targets "$TARGETS" \
    --catalog "$CATALOG" \
    --mix-dir "$MIX_DIR" \
    --target-tick "$TARGET_TICK" \
    --expected-families 127 \
    "${PREPARE_SCOPE_ARGS[@]}" \
    --output "$RUN_ROOT/input-manifest.json"

node --es-module-specifier-resolution=node \
    "$REPO/packages/chronodivide-bot-driver/dist/benchmark/mapFidelityProbe.js" \
    --manifest "$RUN_ROOT/input-manifest.json" \
    --output "$RUN_ROOT/probe-results.json"

python3 "$REPO/research/scripts/map_fidelity_gate.py" check \
    --manifest "$RUN_ROOT/input-manifest.json" \
    --result "$RUN_ROOT/probe-results.json" \
    --output "$RUN_ROOT/gate-summary.json"
