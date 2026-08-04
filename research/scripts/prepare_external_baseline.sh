#!/bin/bash
set -euo pipefail

REPO_ROOT=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
BASELINE_ROOT=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/supalosa-chronodivide-bot
if [[ $# -ge 1 ]]; then REPO_ROOT=$1; fi
if [[ $# -ge 2 ]]; then BASELINE_ROOT=$2; fi

if [[ -n "$(git -C "$BASELINE_ROOT" status --porcelain --untracked-files=no)" ]]; then
    echo "Refusing to prepare a tracked-dirty baseline checkout: $BASELINE_ROOT" >&2
    exit 2
fi

MAIN_API="$REPO_ROOT/node_modules/@chronodivide/game-api"
BASELINE_API="$BASELINE_ROOT/node_modules/@chronodivide/game-api"
if [[ ! -d "$MAIN_API" ]]; then
    echo "Main checkout dependencies are missing: $MAIN_API" >&2
    exit 2
fi

if [[ -L "$BASELINE_API" ]]; then
    if [[ "$(readlink -f "$BASELINE_API")" != "$(readlink -f "$MAIN_API")" ]]; then
        echo "Baseline API symlink points at an unexpected runtime" >&2
        exit 2
    fi
    echo "External baseline already prepared: $BASELINE_ROOT"
    exit 0
fi

cd "$BASELINE_ROOT"
module load nodejs/20.13.1-GCCcore-13.3.0
npm ci --ignore-scripts
npm run build

MAIN_VERSION=$(node -p "require('$MAIN_API/package.json').version")
BASELINE_VERSION=$(node -p "require('$BASELINE_API/package.json').version")
if [[ "$MAIN_VERSION" != "$BASELINE_VERSION" ]]; then
    echo "Game API version mismatch: main=$MAIN_VERSION baseline=$BASELINE_VERSION" >&2
    exit 2
fi

ISOLATED_API="$BASELINE_ROOT/node_modules/@chronodivide/game-api.isolated-$BASELINE_VERSION"
if [[ -e "$ISOLATED_API" ]]; then
    echo "Refusing to replace preserved package: $ISOLATED_API" >&2
    exit 2
fi
mv "$BASELINE_API" "$ISOLATED_API"
ln -s "$MAIN_API" "$BASELINE_API"

echo "Built clean baseline source at $(git rev-parse HEAD)"
echo "Preserved its installed API at $ISOLATED_API"
echo "Shared runtime API at $BASELINE_API -> $(readlink -f "$BASELINE_API")"
