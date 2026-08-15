#!/bin/bash
#SBATCH --job-name=chrono-v37-open-preflight
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
DRIVER_ROOT="$REPO/packages/chronodivide-bot-driver"
BASELINE_ROOT=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/supalosa-chronodivide-bot/packages/chronodivide-bot
R2_GATE=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/mission-native-closeout/v37-literal-endpoint-exposure-v2/controller-22284109/v37-r2-exposure-aggregate.json
C1_GATE=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/mission-native-closeout/v37-all-country-compatibility-v1/controller-22287905/v37-compatibility-aggregate.json
PROTOCOL="$REPO/research/MISSION_NATIVE_CLOSEOUT_OPEN_DEVELOPMENT_PROTOCOL_V2.md"
GENERATOR="$DRIVER_ROOT/dist/training/missionNativeCloseoutOpenDevelopmentV37Campaign.js"

: "${PREFLIGHT_ROOT:?PREFLIGHT_ROOT must name a new V37 preflight output directory}"
: "${CAMPAIGN_ROOT:?CAMPAIGN_ROOT must name a new V37 campaign directory}"
JOB_LINE=$($SCONTROL show job -o "$SLURM_JOB_ID")
[[ "$JOB_LINE" =~ (^|[[:space:]])Account=([^[:space:]]+) ]] || { echo "Authoritative Slurm account is absent" >&2; exit 2; }
[[ "${BASH_REMATCH[2]}" == pi_jss233 ]] || { echo "Wrong Slurm account" >&2; exit 2; }
export SLURM_JOB_ACCOUNT=pi_jss233

[[ ! -e "$PREFLIGHT_ROOT" && ! -e "$CAMPAIGN_ROOT" ]] || {
    echo "Refusing to reuse V37 preflight or campaign output" >&2
    exit 2
}
install -d -m 0700 "$PREFLIGHT_ROOT"
exec >"$PREFLIGHT_ROOT/job.stdout.log" 2>"$PREFLIGHT_ROOT/job.stderr.log"

cd "$REPO"
[[ "$(git branch --show-current)" == main && -z "$(git status --porcelain=v1 --untracked-files=no)" ]] || {
    echo "V37 preflight requires clean tracked main" >&2
    exit 2
}
[[ "$(git rev-parse HEAD)" == "$(git rev-parse fork/main)" ]] || {
    echo "V37 preflight requires pushed fork/main" >&2
    exit 2
}

"$NODE_BIN" node_modules/typescript/bin/tsc -b
"$NODE_BIN" packages/chronodivide-bot-driver/node_modules/vitest/vitest.mjs run \
    packages/chronodivide-bot-driver/src/test --testTimeout=300000

cd "$DRIVER_ROOT"
export BASELINE_PACKAGE_ROOT="$BASELINE_ROOT"
export REQUIRE_EXTERNAL_BASELINE=true
export MISSION_NATIVE_CLOSEOUT_V37_PROTOCOL="$PROTOCOL"
export MISSION_NATIVE_CLOSEOUT_V37_R2_GATE="$R2_GATE"
export MISSION_NATIVE_CLOSEOUT_V37_C1_GATE="$C1_GATE"
export OUT_ROOT="$CAMPAIGN_ROOT"
"$NODE_BIN" --es-module-specifier-resolution=node "$GENERATOR"
sha256sum "$CAMPAIGN_ROOT/campaign.json" >"$PREFLIGHT_ROOT/campaign.sha256"
printf '%s\n' "PASS_V37_OPEN_DEVELOPMENT_PREFLIGHT_AND_CAMPAIGN_FREEZE" >"$PREFLIGHT_ROOT/COMPLETE"
