#!/bin/bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
    echo "Usage: $0 TASK_ID PARENT_RUN_ID" >&2
    exit 2
fi
TASK_ID=$1
PARENT_RUN_ID=$2
if [[ ! "$TASK_ID" =~ ^([0-9]|10)$ ]]; then
    echo "TASK_ID must be an integer from 0 through 10" >&2
    exit 2
fi

REPO=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
BASELINE=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/supalosa-chronodivide-bot
SCRATCH=/nfs/roberts/scratch/pi_jss233/zc362/chrono_divide-paper-audit
cd "$REPO"

if [[ "$(readlink -f "$BASELINE/node_modules/@chronodivide/game-api")" != "$(readlink -f "$REPO/node_modules/@chronodivide/game-api")" ]]; then
    echo "Run research/scripts/prepare_external_baseline.sh before execution" >&2
    exit 2
fi

ENGINE_SEED=424242
SEED_CLASS=same
if [[ "$TASK_ID" -eq 10 ]]; then
    ENGINE_SEED=424243
    SEED_CLASS=different
fi

export BASELINE_PACKAGE_ROOT="$BASELINE/packages/chronodivide-bot"
export REQUIRE_EXTERNAL_BASELINE=true
export MIX_DIR="$REPO/packages/chronodivide-bot-driver/data"
export MAPS=simple-1v1-no-preview.map
export CANDIDATE_COUNTRIES=Arabs
export BASELINE_COUNTRIES=Arabs
export CANDIDATE_SLOTS=0
export START_FILTER_MAX_ATTEMPTS=1
export MATCHES_PER_PAIR=1
export MAX_TICKS=18000
export TRACE_INTERVAL_TICKS=250
export DEFAULT_MAP_PROFILES_ENABLED=false
export EXACT_MAP_TACTICS_ENABLED=false
export SUPERWEAPONS=false
export MATCH_START_OFFSET=0
export SEED_BLOCK_START_OFFSET=0
export GAME_SEED_BASE="$ENGINE_SEED"
export RUN_ID="seed-replay-gate-v1-$SEED_CLASS-$PARENT_RUN_ID-$TASK_ID"
export OUT_DIR="$SCRATCH/seed-replay-gate-v1/$PARENT_RUN_ID/task-$TASK_ID"

mkdir -p "$OUT_DIR"
npm --workspace packages/chronodivide-bot-driver run benchmark
