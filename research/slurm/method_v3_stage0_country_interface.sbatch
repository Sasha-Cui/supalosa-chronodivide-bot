#!/bin/bash
#SBATCH --job-name=chrono-v3-stage0
#SBATCH --account=pi_jss233
#SBATCH --partition=devel
#SBATCH --time=00:30:00
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
SCONTROL=/opt/slurm/25.11.6/bin/scontrol
export PATH="$NODE_RUNTIME_ROOT/bin:/opt/slurm/25.11.6/bin:/usr/local/bin:/usr/bin:/bin"
export LD_LIBRARY_PATH="$ICU_RUNTIME_ROOT/lib:$GCC_RUNTIME_ROOT/lib64:$OPENSSL_RUNTIME_ROOT/lib64:$NODE_RUNTIME_ROOT/lib"
export TZ=UTC
export LC_ALL=C
unset NODE_OPTIONS

REPO=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
DRIVER_ROOT="$REPO/packages/chronodivide-bot-driver"
RUNNER="$DRIVER_ROOT/dist/benchmark/headToHead.js"
BASELINE_ROOT=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/supalosa-chronodivide-bot/packages/chronodivide-bot
EVIDENCE_BASE=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/method-v3/stage0-country-interface
RUN_ROOT="$EVIDENCE_BASE/$SLURM_JOB_ID"
RUN_ID="method-v3-stage0-$SLURM_JOB_ID"

JOB_LINE=$($SCONTROL show job -o "$SLURM_JOB_ID")
JOB_ACCOUNT=$(tr ' ' '\n' <<< "$JOB_LINE" | awk -F= '$1 == "Account" {print $2; exit}')
if [[ "$JOB_ACCOUNT" != "pi_jss233" ]]; then
    echo "Authoritative account is $JOB_ACCOUNT, expected pi_jss233" >&2
    exit 2
fi
for required in "$NODE_BIN" "$NPM_BIN" "$RUNNER" "$BASELINE_ROOT/dist/bot/bot.js"; do
    if [[ ! -e "$required" ]]; then
        echo "Required Stage-0 input is missing: $required" >&2
        exit 2
    fi
done
if [[ -e "$RUN_ROOT" ]]; then
    echo "Refusing to reuse Stage-0 evidence root: $RUN_ROOT" >&2
    exit 2
fi
install -d -m 0700 "$EVIDENCE_BASE"
mkdir -m 0700 "$RUN_ROOT"
exec >"$RUN_ROOT/job.stdout.log" 2>"$RUN_ROOT/job.stderr.log"

cd "$REPO"
if [[ -n "$(git status --porcelain=v1 --untracked-files=no)" || "$(git branch --show-current)" != "main" ]]; then
    echo "Stage-0 requires a clean tracked main checkout" >&2
    exit 2
fi
"$NPM_BIN" run build

export OUT_DIR="$RUN_ROOT"
export RUN_ID
export BASELINE_PACKAGE_ROOT="$BASELINE_ROOT"
export REQUIRE_EXTERNAL_BASELINE=true
export MAPS=simple-1v1-no-preview.map
export MATCHES_PER_PAIR=1
export MAX_TICKS=1200
export GAME_SEED_BASE=3100000000
export CANDIDATE_SLOTS=0,1
export CANDIDATE_COUNTRIES=Americans,Alliance,French,Germans,British,Africans,Arabs,Confederation,Russians
export BASELINE_COUNTRIES="$CANDIDATE_COUNTRIES"
export COUNTRY_PAIRING=mirror
export TRACE_INTERVAL_TICKS=300
export DEFAULT_MAP_PROFILES_ENABLED=false
export EXACT_MAP_TACTICS_ENABLED=false
export ATTACK_COMPOSITION_POLICY=infantry
export ATTACK_GATE_ENABLED=true
export ATTACK_GATE_HFO_ONLY=false
export ATTACK_GATE_MIN_TICK=7200
export ATTACK_GATE_MIN_COMBATANTS=10
export ATTACK_GATE_COMBATANT_ADVANTAGE=0
export ATTACK_GATE_MAX_ENEMY_COMBATANTS=999
export DEFENCE_CHECK_TICKS=24
export DEFENCE_STARTING_RADIUS=36
export DEFENCE_RADIUS_INCREASE_PER_TICK=0.0001
export SCOUT_COOLDOWN_TICKS=45
export SCOUT_MAX_CONCURRENT=2
export ENGINEER_TECH_MAX_TARGETS=1
export ENGINEER_TECH_MAX_DISTANCE=38
export STRATEGIC_PLAN=rush
export RUSH_SELL_ENABLED=true
export RUSH_SELL_TICK=7200
export RUSH_SELL_MIN_COMBATANTS=12
export ALL_IN_ENABLED=true
export ALL_IN_MIN_TICK=12600
export ALL_IN_MIN_COMBATANTS=10
export ALL_IN_COMBATANT_ADVANTAGE=0
export ALL_IN_DISBAND=false
export FORCE_ATTACK_ENABLED=false
export EMERGENCY_DEFENSE_ENABLED=true
export EMERGENCY_DEFENSE_RADIUS=64
export EMERGENCY_DEFENSE_MAX_DEFENDERS=24
export BUILDING_ELIMINATION_ENABLED=true
export BUILDING_ELIMINATION_MIN_TICK=0
export BUILDING_ELIMINATION_MIN_COMBATANTS=0
export BUILDING_ELIMINATION_COMBATANT_ADVANTAGE=-1000
export BUILDING_ELIMINATION_MAX_ENEMY_COMBATANTS=1000
export BUILDING_ELIMINATION_RESERVE_COMBATANTS=0
export BUILDING_ELIMINATION_ORDER_INTERVAL_TICKS=15
export BUILDING_ELIMINATION_MAX_TARGET_GROUPS=3
export BUILDING_ELIMINATION_TARGET_PRIORITY=production
export BUILDING_ELIMINATION_OBSERVATION_MODE=publicApi
export BUILDING_ELIMINATION_DIRECT_VISIBLE_ATTACK=true
export BUILDING_ELIMINATION_PREEMPT_ATTACKS=true
export BUILDING_ELIMINATION_SWEEP_ENABLED=true
export BUILDING_ELIMINATION_SWEEP_REVISIT_TICKS=900

cd "$DRIVER_ROOT"
"$NODE_BIN" --es-module-specifier-resolution=node "$RUNNER"
cd "$REPO"
python3 research/scripts/validate_method_v3_stage0.py \
    --run-root "$RUN_ROOT" \
    --run-id "$RUN_ID" \
    --expected-job-id "$SLURM_JOB_ID" \
    --output "$RUN_ROOT/stage0-gate.json"

echo "Outcome-free method-v3 Stage-0 diagnostic passed: $RUN_ROOT"
