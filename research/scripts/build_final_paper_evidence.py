#!/usr/bin/env python3
"""Build the hash-bound final manuscript evidence artifact from immutable aggregates."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any


INPUTS = {
    "hfo_confirmatory": (
        "hfo-confirmatory/deployed-v1-r2/finalizer/hfo-deployed-confirmatory.json",
        "a734acf077540793e309834f0bda7bcd4a34fde9f95d5457921303bb8d743cc8",
    ),
    "peak_development": (
        "peak-profile-scope-v1/stage-0/finalizer/peak-profile-scope-stage-0.json",
        "ca9d9b5ba1de0c00909a6e6c59768a9fa3686b45e8cc70183572723b1ed9229d",
    ),
    "peak_replication": (
        "peak-profile-scope-v1/stage-1/finalizer/peak-profile-scope-stage-1.json",
        "f970f197ee106408ae0842bd466b073f540cc623b8b96a41d5e838061a1b0285",
    ),
    "advanced_crossplay": (
        "ra2web-opponents/hfo-crossplay-v1/finalizer/hfo-ra2web-advanced-crossplay.json",
        "a287271ba7f223eac669556c8ab895819a55a3c05b06a4c370a21eccb685761d",
    ),
    "allied_west_replication": (
        "hfo-west/winner-replication-v3/finalizer/hfo-allied-west-development.json",
        "81ae77c4fd6691fe05d278c7621ba50a94c6502b0164f75b9557061c91bfee26",
    ),
    "allied_west_isolation": (
        "hfo-west/activation-isolation-v1/finalizer/hfo-allied-west-isolation.json",
        "a4483fa3487e8da0917a19713502229b9d6449f9d3f9b741b04d540d74353820",
    ),
    "soviet_west_replication": (
        "hfo-west/soviet-rush-guard-replication-v4/finalizer/hfo-bottom-development.json",
        "9262dfa068f51a5ccdf8f7bd024e79f3a33db6ee715d50c2d508d5bad17af74e",
    ),
    "soviet_west_isolation": (
        "hfo-west/soviet-rush-guard-isolation-v6/finalizer/hfo-soviet-west-isolation.json",
        "73193b343c97abb98d38e97db7b5e7873193fa1c0c9766060d955ef99e07bdcf",
    ),
    "bottom_retarget_replication": (
        "hfo-bottom/activation-stall-replication-v8/finalizer/hfo-bottom-development.json",
        "05388312522c1bf99eb57aac5aa46ccd64e2a2b5812d2511ddc9cf033fd04427",
    ),
    "bottom_retarget_isolation": (
        "hfo-bottom/activation-isolation-v10/finalizer/hfo-bottom-retarget-isolation.json",
        "f70cfd50dc57f3e42a4244d58783b51b3cb5f571cf20f370bd882f6d6538fb07",
    ),
    "frame_replay": (
        "deterministic-game-frames-v1/replay-v1/finalizer/deterministic-game-frame-manifest.json",
        "5233530adb5d1a1fffd6c6929635d7b0ff2ed0d38c2e91366c1700b0069d2c08",
    ),
}

BASELINE_COMMIT = "165b77a71d0cf5ebd27c65b19d0486bcbae78d0f"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def load_inputs(root: Path) -> tuple[dict[str, dict[str, Any]], list[dict[str, Any]]]:
    loaded: dict[str, dict[str, Any]] = {}
    sources: list[dict[str, Any]] = []
    for name, (relative, expected) in INPUTS.items():
        path = root / relative
        actual = sha256(path)
        require(actual == expected, f"{name} hash drifted: {actual} != {expected}")
        value = json.loads(path.read_text(encoding="utf-8"))
        require(isinstance(value, dict), f"{name} is not an object")
        loaded[name] = value
        sources.append({"id": name, "path": relative, "sha256": actual})
    return loaded, sources


def variant(aggregate: dict[str, Any], identifier: str) -> dict[str, Any]:
    rows = [row for row in aggregate["variants"] if row["id"] == identifier]
    require(len(rows) == 1, f"variant {identifier} missing")
    return rows[0]


def compact_summary(summary: dict[str, Any]) -> dict[str, Any]:
    return {
        key: summary[key]
        for key in (
            "games", "wins", "draws", "losses", "winRate",
            "oneSided95WilsonLower", "medianTicks", "statuses",
        )
        if key in summary
    }


def compact_peak_candidate(candidate: dict[str, Any]) -> dict[str, Any]:
    keys = (
        "id", "strategyScope", "botScope", "historical", "overall", "paired",
        "clustered", "byStart", "bySide", "bySlot", "byCountry",
        "countrySuperior", "countryNoninferior", "startSafe", "sideSafe",
        "slotSafe", "weakExactCount", "eligible",
    )
    return {key: candidate[key] for key in keys if key in candidate}


def compact_crossplay(summary: dict[str, Any]) -> dict[str, Any]:
    keys = ("overall", "clustered", "byStart", "byFaction", "bySlot", "byCountry")
    return {key: summary[key] for key in keys if key in summary}


def compact_paired(paired: dict[str, Any]) -> dict[str, Any]:
    aliases = {
        "meanScoreDifference": "mean",
        "oneSided95TLower": "oneSidedLower",
    }
    result: dict[str, Any] = {}
    for key in (
        "cases", "degreesOfFreedom", "improved", "tied", "worsened",
        "mean", "meanScoreDifference", "oneSidedLower", "oneSided95TLower",
        "sampleStandardDeviation", "tCritical",
    ):
        if key in paired:
            result[aliases.get(key, key)] = paired[key]
    return result


def mechanism(
    replication: dict[str, Any],
    isolation: dict[str, Any],
    control_id: str,
    winner_id: str,
) -> dict[str, Any]:
    control = variant(replication, control_id)
    winner = variant(replication, winner_id)
    require(replication["complete"] is True and replication["passed"] is True, "replication did not pass")
    require(isolation["complete"] is True and isolation["passed"] is True, "isolation did not pass")
    require(isolation["outcomeFree"] is True, "isolation contains outcomes")
    return {
        "replication": {
            "status": replication["status"],
            "sourceCommit": replication["sourceCommit"],
            "arrayJobId": replication["arrayJobId"],
            "finalizerJobId": replication["finalizerJobId"],
            "gameCount": replication["launchedGameCount"],
            "controlId": control_id,
            "control": compact_summary(control["summary"]),
            "winnerId": winner_id,
            "winner": compact_summary(winner["summary"]),
            "paired": compact_paired(winner["pairedVersusDefault"]),
            "byCountry": winner["byCountry"],
        },
        "isolation": {
            "status": isolation["status"],
            "sourceCommit": isolation["sourceCommit"],
            "arrayJobId": isolation["arrayJobId"],
            "finalizerJobId": isolation["finalizerJobId"],
            "outcomeFree": True,
            "activeCaseCount": isolation["activeCaseCount"],
            "inactiveCaseCount": isolation["inactiveCaseCount"],
            "countryCount": isolation["countryCount"],
            "startCount": isolation["startCount"],
        },
    }


def validate_primary(data: dict[str, dict[str, Any]]) -> None:
    hfo = data["hfo_confirmatory"]
    require(
        hfo["status"] == "PASS_HFO_DEPLOYED_CONFIRMATORY"
        and hfo["complete"] is True
        and hfo["passed"] is True
        and hfo["schedulerAccount"] == "pi_jss233"
        and hfo["baselineCommit"] == BASELINE_COMMIT
        and hfo["launchedGameCount"] == 720
        and (hfo["overall"]["wins"], hfo["overall"]["draws"], hfo["overall"]["losses"]) == (633, 24, 63)
        and hfo["clustered"]["oneSided95Lower"] > 0.84,
        "HFO confirmation drifted",
    )

    peak0 = data["peak_development"]
    peak1 = data["peak_replication"]
    peak_candidate = peak1["candidates"][0]
    require(
        peak0["status"] == "PASS_PEAK_PROFILE_SCOPE_STAGE_0"
        and peak0["champion"]["id"] == "strategy_both"
        and peak1["status"] == "PASS_PEAK_PROFILE_SCOPE_STAGE_1"
        and peak1["previousStageSha256"] == INPUTS["peak_development"][1]
        and peak_candidate["id"] == "strategy_both"
        and peak_candidate["eligible"] is True
        and (peak_candidate["overall"]["wins"], peak_candidate["overall"]["draws"],
             peak_candidate["overall"]["losses"]) == (134, 14, 32)
        and peak_candidate["paired"]["oneSidedLower"] > 0.16
        and peak_candidate["clustered"]["oneSided95Lower"] > 0.63
        and peak_candidate["countrySuperior"] == 9
        and peak_candidate["weakExactCount"] == 90,
        "Peak confirmation drifted",
    )

    advanced = data["advanced_crossplay"]
    require(
        advanced["status"] == "FAIL_HFO_RA2WEB_ADVANCED_CROSSPLAY"
        and advanced["complete"] is True
        and advanced["passed"] is False
        and advanced["launchedGameCount"] == 720
        and (advanced["candidateVsAdvanced"]["overall"]["wins"],
             advanced["candidateVsAdvanced"]["overall"]["draws"],
             advanced["candidateVsAdvanced"]["overall"]["losses"]) == (79, 19, 262)
        and advanced["pairedComparison"]["meanScoreDifference"] < -0.29,
        "Advanced cross-play drifted",
    )

    frames = data["frame_replay"]
    require(
        frames["status"] == "PASS_DETERMINISTIC_GAME_FRAME_REPLAY"
        and frames["complete"] is True
        and frames["passed"] is True
        and frames["frameCount"] == 15
        and frames["replayCount"] == 9
        and "hfo_force_clearance" in frames["retainedCategories"],
        "frame replay drifted",
    )


def build_artifact(root: Path) -> dict[str, Any]:
    data, sources = load_inputs(root)
    validate_primary(data)

    hfo = data["hfo_confirmatory"]
    peak0 = data["peak_development"]
    peak1 = data["peak_replication"]
    peak_candidate = peak1["candidates"][0]
    advanced = data["advanced_crossplay"]
    frames = data["frame_replay"]

    mechanisms = {
        "alliedWestRushGuard": mechanism(
            data["allied_west_replication"],
            data["allied_west_isolation"],
            "default",
            "winner_conditional",
        ),
        "sovietWestRushGuard": mechanism(
            data["soviet_west_replication"],
            data["soviet_west_isolation"],
            "default",
            "winner_rush_guard",
        ),
        "bottomProgressRetarget": mechanism(
            data["bottom_retarget_replication"],
            data["bottom_retarget_isolation"],
            "default",
            "winner_activation_stall_1200",
        ),
    }

    require(
        mechanisms["alliedWestRushGuard"]["replication"]["paired"]["oneSidedLower"] > 0.76
        and mechanisms["sovietWestRushGuard"]["replication"]["paired"]["oneSidedLower"] > 0.21
        and mechanisms["bottomProgressRetarget"]["replication"]["paired"]["oneSidedLower"] > 0.11,
        "mechanism effect drifted",
    )

    frame_rows = []
    for row in frames["frames"]:
        frame_rows.append({
            "category": row["category"],
            "policy": row["policy"],
            "update": row["update"],
            "file": f"paper/figures/game_frames/{Path(row['file']).name}",
            "pngSha256": row["pngSha256"],
            "stateSha256": row["stateSha256"],
            "bytes": row["bytes"],
            "annotations": row["annotations"],
        })

    return {
        "schemaVersion": 1,
        "kind": "chrono-divide-final-paper-evidence",
        "status": "PASS_FINAL_PAPER_EVIDENCE",
        "complete": True,
        "baselineCommit": BASELINE_COMMIT,
        "inputs": sources,
        "hfoConfirmation": {
            "status": hfo["status"],
            "sourceCommit": hfo["sourceCommit"],
            "arrayJobId": hfo["arrayJobId"],
            "finalizerJobId": hfo["finalizerJobId"],
            "selectionSha256": hfo["selectionSha256"],
            "gameCount": hfo["launchedGameCount"],
            "overall": hfo["overall"],
            "clustered": hfo["clustered"],
            "byFaction": hfo["byFaction"],
            "byStart": hfo["byStart"],
            "bySlot": hfo["bySlot"],
            "byCountry": hfo["byCountry"],
            "countryStartCells": hfo["cellSummaries"],
            "checks": hfo["checks"],
        },
        "peakStudy": {
            "development": {
                "status": peak0["status"],
                "sourceCommit": peak0["sourceCommit"],
                "arrayJobId": peak0["arrayJobId"],
                "finalizerJobId": peak0["finalizerJobId"],
                "gameCount": peak0["launchedGameCount"],
                "control": peak0["control"],
                "candidates": [compact_peak_candidate(row) for row in peak0["candidates"]],
                "factorialEffects": peak0["factorialEffects"],
                "ranking": peak0["ranking"],
                "champion": peak0["champion"],
            },
            "replication": {
                "status": peak1["status"],
                "sourceCommit": peak1["sourceCommit"],
                "arrayJobId": peak1["arrayJobId"],
                "finalizerJobId": peak1["finalizerJobId"],
                "gameCount": peak1["launchedGameCount"],
                "control": peak1["control"],
                "candidate": compact_peak_candidate(peak_candidate),
            },
        },
        "mechanisms": mechanisms,
        "advancedTransfer": {
            "status": advanced["status"],
            "sourceCommit": advanced["sourceCommit"],
            "arrayJobId": advanced["arrayJobId"],
            "finalizerJobId": advanced["finalizerJobId"],
            "gameCount": advanced["launchedGameCount"],
            "candidate": compact_crossplay(advanced["candidateVsAdvanced"]),
            "supalosa": compact_crossplay(advanced["supalosaVsAdvanced"]),
            "paired": advanced["pairedComparison"],
            "advancedBundleSha256": advanced["advancedBundleSha256"],
            "freezeManifestSha256": advanced["freezeManifestSha256"],
            "ra2webClientCommit": advanced["ra2webClientCommit"],
            "ra2webClientReleaseId": advanced["ra2webClientReleaseId"],
        },
        "frameEvidence": {
            "status": frames["status"],
            "sourceCommit": frames["sourceCommit"],
            "arrayJobId": frames["arrayJobId"],
            "finalizerJobId": frames["finalizerJobId"],
            "manifestSha256": INPUTS["frame_replay"][1],
            "replayCount": frames["replayCount"],
            "frameCount": frames["frameCount"],
            "retainedCategories": frames["retainedCategories"],
            "omittedCategories": frames["omittedCategories"],
            "frames": frame_rows,
            "forceClearance": frames["cells"][1]["result"]["forceClearance"],
            "peakDivergenceUpdate": frames["cells"][0]["result"]["divergenceUpdate"],
        },
        "claimBoundary": {
            "supported": [
                "StrongBot reliably beats pinned Supalosa on balanced HFO across all countries, starts, and slots.",
                "Reciprocal Peak macro profiling reliably improves the deployed control and beats pinned Supalosa on fresh balanced Peak cases.",
                "Scoped rush/guard and progress-retarget mechanisms replicate in their declared HFO conditions and are technically inert elsewhere.",
            ],
            "unsupported": [
                "general RTS superiority",
                "superiority to all opponents",
                "a new Chrono Divide environment",
                "a novel general-purpose optimizer",
                "RA2Web Advanced superiority",
            ],
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--evidence-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    artifact = build_artifact(args.evidence_root.resolve())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(artifact, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({
        "status": artifact["status"],
        "inputs": len(artifact["inputs"]),
        "hfoGames": artifact["hfoConfirmation"]["gameCount"],
        "peakReplicationGames": artifact["peakStudy"]["replication"]["gameCount"],
        "mechanisms": sorted(artifact["mechanisms"]),
        "frames": artifact["frameEvidence"]["frameCount"],
    }, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
