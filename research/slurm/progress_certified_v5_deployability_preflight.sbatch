#!/bin/bash
#SBATCH --job-name=chrono-pcv5-deploy-preflight
#SBATCH --account=pi_jss233
#SBATCH --partition=devel
#SBATCH --time=01:00:00
#SBATCH --cpus-per-task=2
#SBATCH --mem=12G
#SBATCH --output=/dev/null
#SBATCH --error=/dev/null

set -euo pipefail
umask 077

NODE_RUNTIME_ROOT=/apps/software/2024a/software/nodejs/20.13.1-GCCcore-13.3.0
ICU_RUNTIME_ROOT=/apps/software/2024a/software/ICU/75.1-GCCcore-13.3.0
GCC_RUNTIME_ROOT=/apps/software/system/software/GCCcore/13.3.0
OPENSSL_RUNTIME_ROOT=/apps/software/system/software/OpenSSL/3
NODE_BIN="$NODE_RUNTIME_ROOT/bin/node"
SCONTROL=/opt/slurm/current/bin/scontrol
export PATH="$NODE_RUNTIME_ROOT/bin:/opt/slurm/current/bin:/usr/local/bin:/usr/bin:/bin"
export LD_LIBRARY_PATH="$ICU_RUNTIME_ROOT/lib:$GCC_RUNTIME_ROOT/lib64:$OPENSSL_RUNTIME_ROOT/lib64:$NODE_RUNTIME_ROOT/lib"
export TZ=UTC LC_ALL=C PYTHONHASHSEED=0 PYTHONDONTWRITEBYTECODE=1
unset NODE_OPTIONS

REPO=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
DRIVER="$REPO/packages/chronodivide-bot-driver"
BASELINE_REPO=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/supalosa-chronodivide-bot
: "${PREFLIGHT_ROOT:?PREFLIGHT_ROOT is required}"
: "${CAMPAIGN_PATH:?CAMPAIGN_PATH is required}"
: "${ORIGINAL_TARGETS:?ORIGINAL_TARGETS is required}"
: "${RESERVE_SCREEN:?RESERVE_SCREEN is required}"

JOB_LINE=$($SCONTROL show job -o "$SLURM_JOB_ID")
[[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) ]] || { echo "Missing account" >&2; exit 2; }
[[ "${BASH_REMATCH[2]}" == pi_jss233 ]] || { echo "Wrong account" >&2; exit 2; }
export SLURM_JOB_ACCOUNT=pi_jss233

[[ ! -e "$PREFLIGHT_ROOT" && ! -e "$CAMPAIGN_PATH" ]] || {
    echo "Refusing to reuse deployability preflight or campaign output" >&2
    exit 2
}
install -d -m 0700 "$PREFLIGHT_ROOT"
exec >"$PREFLIGHT_ROOT/job.stdout.log" 2>"$PREFLIGHT_ROOT/job.stderr.log"

cd "$REPO"
[[ "$(git branch --show-current)" == main && -z "$(git status --porcelain=v1 --untracked-files=no)" ]] || {
    echo "Deployability preflight requires clean tracked main" >&2
    exit 2
}
[[ "$(git rev-parse HEAD)" == "$(git rev-parse fork/main)" ]] || {
    echo "Deployability preflight requires pushed fork/main" >&2
    exit 2
}

python3 -m py_compile research/scripts/v5_repair_deployability.py
"$NODE_BIN" node_modules/typescript/bin/tsc -b
cd "$DRIVER"
"$NODE_BIN" node_modules/vitest/vitest.mjs run \
    src/test/progressCertifiedV5DeployabilityCell.test.ts \
    src/test/progressCertifiedV5ConfirmatoryTechnicalGate.test.ts \
    --testTimeout=300000
cd "$REPO"
python3 research/scripts/v5_repair_deployability.py freeze \
    --repo "$REPO" \
    --baseline-repo "$BASELINE_REPO" \
    --original-targets "$ORIGINAL_TARGETS" \
    --reserve-screen "$RESERVE_SCREEN" \
    --output "$CAMPAIGN_PATH"
sha256sum "$CAMPAIGN_PATH" >"$PREFLIGHT_ROOT/campaign.sha256"
printf '%s\n' PASS_PROGRESS_CERTIFIED_V5_DEPLOYABILITY_PREFLIGHT >"$PREFLIGHT_ROOT/COMPLETE"
