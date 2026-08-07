#!/bin/bash
#SBATCH --job-name=chrono-map-fidelity
#SBATCH --account=pi_jss233
#SBATCH --partition=day
#SBATCH --time=01:00:00
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
NODE_BIN="$NODE_RUNTIME_ROOT/bin/node"
NPM_BIN="$NODE_RUNTIME_ROOT/bin/npm"
PYTHON_BIN=/usr/bin/python3.9
SCONTROL=/opt/slurm/25.11.6/bin/scontrol
export PATH="$NODE_RUNTIME_ROOT/bin:/opt/slurm/25.11.6/bin:/usr/local/bin:/usr/bin:/bin"
export LD_LIBRARY_PATH="$ICU_RUNTIME_ROOT/lib:$GCC_RUNTIME_ROOT/lib64:$OPENSSL_RUNTIME_ROOT/lib64:$NODE_RUNTIME_ROOT/lib"
export SCONTROL
export TZ=UTC
export LC_ALL=C
export PYTHONHASHSEED=0
export PYTHONDONTWRITEBYTECODE=1
unset NODE_OPTIONS
DEBUG_LOGGING=1
readonly DEBUG_LOGGING
export DEBUG_LOGGING

REPO=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
MIX_DIR="$REPO/packages/chronodivide-bot-driver/data"
CATALOG="$REPO/research/artifacts/map_family_catalog.json"
PREFLIGHT_PLAN="$REPO/research/artifacts/map_fidelity_expanded_preflight_v2.json"
GATE_SCRIPT="$REPO/research/scripts/map_fidelity_gate.py"
SUPERVISOR_SCRIPT="$REPO/research/scripts/map_fidelity_supervisor.py"
TEMPERATE_SELECTOR="$REPO/research/scripts/select_temperate_fidelity_targets.py"
WORKER="$REPO/packages/chronodivide-bot-driver/dist/benchmark/mapFidelityProbe.js"

TARGET_TICK=250
readonly TARGET_TICK
export TARGET_TICK
MAP_FIDELITY_PROFILE=${MAP_FIDELITY_PROFILE:-original}
MAP_FIDELITY_SCOPE=${MAP_FIDELITY_SCOPE:-preflight}
MAP_FIDELITY_MAX_ATTEMPTS=${MAP_FIDELITY_MAX_ATTEMPTS:-2}
MAP_FIDELITY_TIMEOUT_SECONDS=${MAP_FIDELITY_TIMEOUT_SECONDS:-125}
case "$MAP_FIDELITY_PROFILE" in
    original)
        EVIDENCE_BASE=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/map-compatibility-gate-v2
        TARGETS="$REPO/research/artifacts/role_blind_fidelity_targets_v1.json"
        EXPECTED_FAMILIES=127
        ;;
    temperate)
        EVIDENCE_BASE=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/map-compatibility-temperate-v1
        TARGETS="$REPO/research/artifacts/role_blind_temperate_fidelity_targets_v1.json"
        EXPECTED_FAMILIES=67
        if [[ "$MAP_FIDELITY_SCOPE" != "full" ]]; then
            echo "The temperate profile requires MAP_FIDELITY_SCOPE=full" >&2
            exit 2
        fi
        ;;
    *)
        echo "MAP_FIDELITY_PROFILE must be original or temperate" >&2
        exit 2
        ;;
esac
case "$MAP_FIDELITY_SCOPE" in
    full)
        PLAN_ARGS=()
        ;;
    preflight)
        PLAN_ARGS=(--preflight-plan "$PREFLIGHT_PLAN")
        ;;
    *)
        echo "MAP_FIDELITY_SCOPE must be full or preflight" >&2
        exit 2
        ;;
esac
case "$MAP_FIDELITY_MAX_ATTEMPTS" in
    1|2) ;;
    *)
        echo "MAP_FIDELITY_MAX_ATTEMPTS must be 1 or 2" >&2
        exit 2
        ;;
esac

RUN_ROOT="$EVIDENCE_BASE/$MAP_FIDELITY_SCOPE/$SLURM_JOB_ID"
install -d -m 0700 "$EVIDENCE_BASE" "$EVIDENCE_BASE/$MAP_FIDELITY_SCOPE"
if [[ -e "$RUN_ROOT" ]]; then
    echo "Refusing to overwrite existing evidence root: $RUN_ROOT" >&2
    exit 2
fi
mkdir -m 0700 "$RUN_ROOT"
exec >"$RUN_ROOT/job.stdout.log" 2>"$RUN_ROOT/job.stderr.log"
chmod 0600 "$RUN_ROOT/job.stdout.log" "$RUN_ROOT/job.stderr.log"

JOB_LINE=$("$SCONTROL" show job -o "$SLURM_JOB_ID")
JOB_ACCOUNT=$(tr ' ' '\n' <<< "$JOB_LINE" | awk -F= '$1 == "Account" {print $2; exit}')
if [[ "$JOB_ACCOUNT" != "pi_jss233" ]]; then
    echo "Refusing map fidelity gate: authoritative Slurm account is $JOB_ACCOUNT, expected pi_jss233" >&2
    exit 2
fi
for executable in "$NODE_BIN" "$NPM_BIN" "$PYTHON_BIN" "$SCONTROL"; do
    if [[ ! -x "$executable" ]]; then
        echo "Required pinned executable is unavailable: $executable" >&2
        exit 2
    fi
done
if [[ ! -d "$MIX_DIR" ]]; then
    echo "Required full RA2 asset directory is missing: $MIX_DIR" >&2
    exit 2
fi
for asset in language.mix ra2.mix cache.mix load.mix local.mix neutral.mix conquer.mix generic.mix isogen.mix temperat.mix audio.bag audio.idx rules.ini art.ini ai.ini; do
    if [[ ! -s "$MIX_DIR/$asset" || -L "$MIX_DIR/$asset" ]]; then
        echo "Required regular nonempty engine asset is unavailable: $MIX_DIR/$asset" >&2
        exit 2
    fi
done

cd "$REPO"
"$NODE_BIN" --version
"$NPM_BIN" --version
"$NPM_BIN" run build --workspace=@supalosa/chronodivide-bot-driver
if [[ "$MAP_FIDELITY_PROFILE" == "temperate" ]]; then
    "$PYTHON_BIN" "$TEMPERATE_SELECTOR" \
        --repo-root "$REPO" \
        --source-targets "$REPO/research/artifacts/role_blind_fidelity_targets_v1.json" \
        --expected-count "$EXPECTED_FAMILIES" \
        --output "$TARGETS" \
        --verify-existing
fi

"$PYTHON_BIN" "$GATE_SCRIPT" prepare \
    --repo-root "$REPO" \
    --targets "$TARGETS" \
    --catalog "$CATALOG" \
    --mix-dir "$MIX_DIR" \
    --target-tick "$TARGET_TICK" \
    --expected-families "$EXPECTED_FAMILIES" \
    "${PLAN_ARGS[@]}" \
    --output "$RUN_ROOT/input-manifest.json"

# Cross-language schema/provenance validation only; this mode cannot initialize
# the simulator or create a game.
"$NODE_BIN" --es-module-specifier-resolution=node "$WORKER" \
    --validate-manifest-only \
    --manifest "$RUN_ROOT/input-manifest.json"

"$PYTHON_BIN" "$GATE_SCRIPT" attest \
    --manifest "$RUN_ROOT/input-manifest.json" \
    --phase pre_workers \
    --output "$RUN_ROOT/job-pre-attestation.json"

set +e
"$PYTHON_BIN" "$SUPERVISOR_SCRIPT" \
    --manifest "$RUN_ROOT/input-manifest.json" \
    --attestation "$RUN_ROOT/job-pre-attestation.json" \
    --run-root "$RUN_ROOT" \
    --timeout-seconds "$MAP_FIDELITY_TIMEOUT_SECONDS" \
    --termination-grace-seconds 5 \
    --max-stream-bytes 1048576 \
    --max-attempts "$MAP_FIDELITY_MAX_ATTEMPTS" \
    -- "$NODE_BIN" --es-module-specifier-resolution=node "$WORKER"
SUPERVISOR_RC=$?
set -e
printf '%s\n' "$SUPERVISOR_RC" >"$RUN_ROOT/supervisor.exit-code"
chmod 0600 "$RUN_ROOT/supervisor.exit-code"
if [[ "$SUPERVISOR_RC" -ne 0 ]]; then
    echo "Supervisor ended with technical status $SUPERVISOR_RC; evidence retained at $RUN_ROOT" >&2
    exit "$SUPERVISOR_RC"
fi

"$PYTHON_BIN" "$GATE_SCRIPT" attest \
    --manifest "$RUN_ROOT/input-manifest.json" \
    --phase post_workers \
    --pre-attestation "$RUN_ROOT/job-pre-attestation.json" \
    --run-root "$RUN_ROOT" \
    --output "$RUN_ROOT/job-post-attestation.json"

"$PYTHON_BIN" "$GATE_SCRIPT" aggregate \
    --manifest "$RUN_ROOT/input-manifest.json" \
    --pre-attestation "$RUN_ROOT/job-pre-attestation.json" \
    --post-attestation "$RUN_ROOT/job-post-attestation.json" \
    --run-root "$RUN_ROOT" \
    --legacy-result "$RUN_ROOT/probe-results.json" \
    --output "$RUN_ROOT/gate-summary.json"

echo "Durable map-fidelity evidence complete: $RUN_ROOT"
