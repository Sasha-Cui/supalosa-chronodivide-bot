#!/bin/bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
    echo "Usage: $0 TASK_ID [PARENT_RUN_ID]" >&2
    exit 2
fi
TASK_ID=$1
if [[ $# -ge 2 ]]; then
    PARENT_RUN_ID=$2
else
    PARENT_RUN_ID=$(printenv SLURM_ARRAY_JOB_ID || printenv SLURM_JOB_ID || echo local)
fi

module load nodejs/20.13.1-GCCcore-13.3.0

REPO=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
BASELINE=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/supalosa-chronodivide-bot
SCRATCH=/nfs/roberts/scratch/pi_jss233/zc362/chrono_divide-paper-audit
CONFIG=$REPO/research/configs/audit_pilot_v1.tsv
cd "$REPO"

if [[ "$(readlink -f "$BASELINE/node_modules/@chronodivide/game-api")" != "$(readlink -f "$REPO/node_modules/@chronodivide/game-api")" ]]; then
    echo "Run research/scripts/prepare_external_baseline.sh before execution" >&2
    exit 2
fi

ROW=$(awk -F $'\t' -v task="$TASK_ID" 'NR > 1 && $1 == task {print; exit}' "$CONFIG")
if [[ -z "$ROW" ]]; then
    echo "No configuration row for task $TASK_ID" >&2
    exit 2
fi
IFS=$'\t' read -r TASK VARIANT START_LABEL CANDIDATE_START BASELINE_START PROFILES EXACT_TACTICS <<< "$ROW"

export BASELINE_PACKAGE_ROOT="$BASELINE/packages/chronodivide-bot"
export REQUIRE_EXTERNAL_BASELINE=true
export MIX_DIR="$REPO/packages/chronodivide-bot-driver/data"
export MAPS=simple-1v1-no-preview.map
export CANDIDATE_COUNTRIES=Arabs
export BASELINE_COUNTRIES=Arabs
export CANDIDATE_SLOTS=0
export CANDIDATE_STARTS="$CANDIDATE_START"
export BASELINE_STARTS="$BASELINE_START"
export START_FILTER_MAX_ATTEMPTS=80
export MATCHES_PER_PAIR=8
export MAX_TICKS=18000
export DEFAULT_MAP_PROFILES_ENABLED="$PROFILES"
export EXACT_MAP_TACTICS_ENABLED="$EXACT_TACTICS"
export SUPERWEAPONS=false
export MATCH_START_OFFSET=$((8100000 + TASK * 1000))
export RUN_ID="audit-pilot-v1-$VARIANT-$START_LABEL-$PARENT_RUN_ID-$TASK"
export OUT_DIR="$SCRATCH/pilot/audit-pilot-v1/$PARENT_RUN_ID/$TASK-$VARIANT-$START_LABEL"

mkdir -p "$OUT_DIR"
npm --workspace packages/chronodivide-bot-driver run benchmark
