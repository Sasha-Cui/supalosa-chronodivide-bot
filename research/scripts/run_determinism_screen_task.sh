#!/bin/bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
    echo "Usage: $0 TASK_ID PARENT_RUN_ID" >&2
    exit 2
fi
TASK_ID=$1
PARENT_RUN_ID=$2
if [[ ! "$TASK_ID" =~ ^[0-3]$ ]]; then
    echo "TASK_ID must be 0, 1, 2, or 3" >&2
    exit 2
fi

module load nodejs/20.13.1-GCCcore-13.3.0
REPO=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
BASELINE=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/supalosa-chronodivide-bot
SCRATCH=/nfs/roberts/scratch/pi_jss233/zc362/chrono_divide-paper-audit
cd "$REPO"

if [[ "$(readlink -f "$BASELINE/node_modules/@chronodivide/game-api")" != "$(readlink -f "$REPO/node_modules/@chronodivide/game-api")" ]]; then
    echo "Run research/scripts/prepare_external_baseline.sh before execution" >&2
    exit 2
fi

export BASELINE_PACKAGE_ROOT="$BASELINE/packages/chronodivide-bot"
export REQUIRE_EXTERNAL_BASELINE=true
export MIX_DIR="$REPO/packages/chronodivide-bot-driver/data"
export MAPS=simple-1v1-no-preview.map
export CANDIDATE_COUNTRIES=Arabs
export BASELINE_COUNTRIES=Arabs
export CANDIDATE_SLOTS=0
export CANDIDATE_STARTS=37,63
export BASELINE_STARTS=62,39
export START_FILTER_MAX_ATTEMPTS=80
export MATCHES_PER_PAIR=1
export MAX_TICKS=18000
export DEFAULT_MAP_PROFILES_ENABLED=false
export EXACT_MAP_TACTICS_ENABLED=false
export SUPERWEAPONS=false
export MATCH_START_OFFSET=8200000
export RUN_ID="determinism-screen-v1-$PARENT_RUN_ID-$TASK_ID"
export OUT_DIR="$SCRATCH/pilot/determinism-screen-v1/$PARENT_RUN_ID/task-$TASK_ID"

mkdir -p "$OUT_DIR"
npm --workspace packages/chronodivide-bot-driver run benchmark
