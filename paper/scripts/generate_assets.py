#!/usr/bin/env python3
"""Generate paper tables, figures, and macros from frozen tracked artifacts."""

from __future__ import annotations

import argparse
from decimal import Decimal, ROUND_HALF_UP
import hashlib
import json
import math
import re
from pathlib import Path
from typing import Any


EXPECTED_ARTIFACT_HASHES = {
    "method_v2_confirmatory_result_v1.json":
        "9e352e27c2ee85d0d77d0391c534d30943cbce55c35a664fb994d08826303935",
    "method_v2_confirmatory_family_diagnostics_v1.json":
        "99a389d112d9c8241ca54a9b93a6f20d67979ae4808903a627e94a679bfeed65",
    "method_v2_mechanism_ablation_result_v1.json":
        "8d4f02e2f463b0c2764b6424b986834fafd9dbb679e82548ec260d4b1b765d76",
    "method_v2_component_ablation_result_v1.json":
        "dbc227e620a23d12bc54a51c1ec1ab89decddcfe454319ea112f822a4a82b012",
    "method_v2_terminal_state_analysis_v1.json":
        "61d84614a5f8088bb38f263a772ec1c34a1334283d51098e96af3d85839dc6b4",
    "supported_temperate_families_v1.json":
        "d280138b124e0d1665151189a1dd9ad74b92f646a8c523d25cef4c634b2e90c1",
    "family_role_commitments_v1.json":
        "e7a4f4df4325c75107eb3708d5b105f43dd1436c78cbd210b0695076fc47d65d",
    "accepted_compute_accounting_v1.json":
        "eaf504b447ba6cbe0953cc91de0540a913e6c3b6bffd724017040bcfaa6e7674",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate_expected_hashes(payload: dict[str, Any]) -> dict[str, str]:
    expected_names = set(EXPECTED_ARTIFACT_HASHES)
    actual_names = set(payload)
    if actual_names != expected_names:
        missing = sorted(expected_names - actual_names)
        extra = sorted(actual_names - expected_names)
        raise ValueError(f"artifact hash manifest names differ: missing={missing}, extra={extra}")
    validated: dict[str, str] = {}
    for filename, digest in payload.items():
        if not isinstance(digest, str) or re.fullmatch(r"[0-9a-f]{64}", digest) is None:
            raise ValueError(f"invalid SHA-256 for {filename}: {digest!r}")
        validated[filename] = digest
    return validated


def load_hash_manifest(path: Path) -> dict[str, str]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("artifact hash manifest must be one JSON object")
    return validate_expected_hashes(payload)


def load_frozen(
    artifact_dir: Path,
    filename: str,
    expected_artifact_hashes: dict[str, str],
) -> dict[str, Any]:
    path = artifact_dir / filename
    actual = sha256(path)
    expected = expected_artifact_hashes[filename]
    if actual != expected:
        raise ValueError(f"artifact hash drift for {filename}: {actual} != {expected}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"{filename} must contain one JSON object")
    return payload


def expect_close(actual: float, expected: float, label: str) -> None:
    if not math.isclose(float(actual), float(expected), rel_tol=0.0, abs_tol=1e-12):
        raise ValueError(f"{label} mismatch: {actual!r} != {expected!r}")


def latex_escape(value: str) -> str:
    translations = {
        "\\": r"\textbackslash{}",
        "_": r"\_",
        "%": r"\%",
        "&": r"\&",
        "#": r"\#",
        "{": r"\{",
        "}": r"\}",
        "$": r"\$",
    }
    return "".join(translations.get(character, character) for character in value)


def fmt(value: float, digits: int = 3) -> str:
    return f"{float(value):.{digits}f}"


def fmt_half_up(value: float, digits: int) -> str:
    quantum = Decimal(1).scaleb(-digits)
    rounded = Decimal(str(value)).quantize(quantum, rounding=ROUND_HALF_UP)
    return f"{rounded:.{digits}f}"


def write(path: Path, content: str) -> None:
    path.write_text(content.rstrip() + "\n", encoding="utf-8")


def generate_metrics(
    confirmatory: dict[str, Any],
    family_data: dict[str, Any],
    mechanism: dict[str, Any],
    component: dict[str, Any],
    terminal: dict[str, Any],
    supported: dict[str, Any],
    roles: dict[str, Any],
    compute: dict[str, Any],
) -> str:
    improvement = confirmatory["prespecifiedImprovement"]
    absolute = confirmatory["prespecifiedChampionAbsolute"]
    records = confirmatory["descriptiveRecords"]
    sensitivity = confirmatory["postConfirmatorySensitivity"]
    mechanism_effect = mechanism["mechanismContrast"]
    component_effect = component["primaryComponentContrast"]
    strategy = next(
        row for row in component["pairwiseChampionMinusAblation"]
        if row["ablationMethodId"] == "revertStrategy"
    )
    paired = terminal["confirmatory"]["championMinusDefaultPaired"]
    transition_matrix = paired["outcomeTransitionCounts"]
    draw_to_draw = paired["outcomeTransitionDetails"]["drawToDraw"]
    stable_terminal = draw_to_draw["terminalCandidateMinusBaselineDifference"]
    overall_terminal = paired["terminalCandidateMinusBaselineDifference"]
    strategy_terminal = terminal["component"]["championMinusKeyReverts"][
        "revertStrategy"
    ]["terminalCandidateMinusBaselineDifference"]
    family_effects = [row["championMinusDefault"] for row in family_data["families"]]
    paired_counts = {
        float(score): count for score, count in paired["pairedScoreDifferenceCounts"].items()
    }
    improved_pairs = sum(count for score, count in paired_counts.items() if score > 0)
    regressed_pairs = sum(count for score, count in paired_counts.items() if score < 0)
    unchanged_pairs = paired_counts.get(0.0, 0)
    mechanism_methods = mechanism["descriptiveMethods"]
    local_scores = [
        method["score"]
        for method_id, method in mechanism_methods.items()
        if method_id.startswith("local")
    ]
    mechanism_pairwise = [
        row["estimate"] for row in mechanism["pairwiseChampionMinusLocal"]
    ]
    games_per_method = sum(records["champion"][key] for key in ("wins", "draws", "losses"))
    if games_per_method != sum(records["default"][key] for key in ("wins", "draws", "losses")):
        raise ValueError("confirmatory per-method game counts differ")

    expect_close(improvement["estimate"], paired["scoreDifference"], "terminal score effect")
    expect_close(records["champion"]["score"], terminal["confirmatory"]["methods"]["champion"]["score"], "champion score")
    expect_close(records["default"]["score"], terminal["confirmatory"]["methods"]["default"]["score"], "default score")
    if len(family_effects) != confirmatory["design"]["familyCount"]:
        raise ValueError("confirmatory family count drift")
    signs = {
        "positive": sum(effect > 0 for effect in family_effects),
        "zero": sum(effect == 0 for effect in family_effects),
        "negative": sum(effect < 0 for effect in family_effects),
    }
    if signs != {
        "positive": improvement["positiveFamilies"],
        "zero": improvement["zeroFamilies"],
        "negative": improvement["negativeFamilies"],
    }:
        raise ValueError("confirmatory family sign counts drift")
    if improved_pairs + regressed_pairs + unchanged_pairs != paired["pairedGames"]:
        raise ValueError("paired outcome direction counts drift")
    if paired["winCountDifference"] != records["champion"]["wins"] - records["default"]["wins"]:
        raise ValueError("confirmatory win difference drift")
    if -paired["lossCountDifference"] != records["default"]["losses"] - records["champion"]["losses"]:
        raise ValueError("confirmatory loss difference drift")
    expect_close(
        mechanism_effect["estimate"],
        mechanism_methods["champion"]["score"] - sum(local_scores) / len(local_scores),
        "mechanism score contrast",
    )
    if supported["targetCount"] != 54 or supported["exclusionCounts"] != {"fail": 6, "review": 7}:
        raise ValueError("supported family population drift")
    if roles["roleCounts"] != {"development": 12, "reserve": 4, "test": 16, "train": 22}:
        raise ValueError("family role counts drift")
    accounting = compute["accounting"]
    stages = compute["stageBreakdown"]
    if accounting["allocationCount"] != 562:
        raise ValueError("accepted allocation count drift")
    if sum(row["allocationCount"] for row in stages) != accounting["allocationCount"]:
        raise ValueError("compute stage allocation count mismatch")
    if sum(row["coreSeconds"] for row in stages) != accounting["elapsedRawSeconds"]:
        raise ValueError("compute stage core-seconds mismatch")
    if sum(row["games"] for row in stages) != 8704:
        raise ValueError("compute stage game count mismatch")
    expect_close(
        accounting["coreHours"],
        accounting["elapsedRawSeconds"] / 3600,
        "compute core-hours",
    )
    if accounting["allocCpusPerAllocation"] != 1 or accounting["gpuAllocationCount"] != 0:
        raise ValueError("compute allocation shape drift")

    macros = {
        "ScreenedFamilyCount": "67",
        "SupportedFamilyCount": "54",
        "ReviewFamilyCount": "7",
        "FailedFamilyCount": "6",
        "TrainingFamilyCount": "22",
        "OriginalDevelopmentFamilyCount": "12",
        "TestFamilyCount": "16",
        "ReserveFamilyCount": "4",
        "OptimizerRunCount": "5",
        "OptimizerCandidateCount": "32",
        "OptimizerGameCount": "4,680",
        "ChampionshipGameCount": "2,112",
        "DevelopmentGameCount": "440",
        "ConfirmatoryGameCount": "512",
        "ConfirmatoryShardCount": str(confirmatory["scheduler"]["taskCount"]),
        "ConfirmatoryGamesPerMethod": str(games_per_method),
        "MechanismGameCount": "480",
        "ComponentGameCount": "480",
        "TotalGameCount": "8,704",
        "AcceptedAllocationCount": str(accounting["allocationCount"]),
        "AcceptedCoreHours": fmt(accounting["coreHours"], 2),
        "AcceptedRequestedMemoryGiB": "6",
        "AcceptedPeakRSSGiB": fmt(accounting["maxRssGiB"], 2),
        "DefaultScore": fmt(records["default"]["score"]),
        "ChampionScore": fmt(records["champion"]["score"]),
        "ImprovementEstimate": fmt(improvement["estimate"]),
        "ImprovementSE": fmt(improvement["familyClusteredStandardError"]),
        "ImprovementCILower": fmt(improvement["confidenceInterval"]["lower"]),
        "ImprovementCIUpper": fmt(improvement["confidenceInterval"]["upper"]),
        "ChampionAbsoluteMargin": fmt(absolute["estimate"]),
        "ChampionAbsoluteSE": fmt(absolute["familyClusteredStandardError"]),
        "ChampionAbsoluteLower": fmt(absolute["oneSidedLowerBound"]),
        "FamiliesAboveHalfCount": str(absolute["familiesAboveHalf"]),
        "FamiliesEqualHalfCount": str(absolute["familiesEqualHalf"]),
        "FamiliesBelowHalfCount": str(absolute["familiesBelowHalf"]),
        "DefaultWins": str(records["default"]["wins"]),
        "DefaultDraws": str(records["default"]["draws"]),
        "DefaultLosses": str(records["default"]["losses"]),
        "ChampionWins": str(records["champion"]["wins"]),
        "ChampionDraws": str(records["champion"]["draws"]),
        "ChampionLosses": str(records["champion"]["losses"]),
        "PositiveFamilyCount": str(improvement["positiveFamilies"]),
        "ZeroFamilyCount": str(improvement["zeroFamilies"]),
        "NegativeFamilyCount": str(improvement["negativeFamilies"]),
        "ImprovementBootstrapLower": fmt(sensitivity["improvementBootstrap95Interval"]["lower"]),
        "ImprovementBootstrapUpper": fmt(sensitivity["improvementBootstrap95Interval"]["upper"]),
        "ChampionBootstrapLower": fmt(sensitivity["championScoreBootstrap95Interval"]["lower"]),
        "ChampionBootstrapUpper": fmt(sensitivity["championScoreBootstrap95Interval"]["upper"]),
        "ImprovementSignFlipP": "0.000122",
        "MinimumFamilyEffect": fmt(min(family_effects)),
        "MaximumFamilyEffect": fmt(max(family_effects)),
        "MechanismChampionScore": fmt(mechanism_methods["champion"]["score"]),
        "MechanismLocalAverageScore": fmt(sum(local_scores) / len(local_scores)),
        "MechanismPairwiseMinimum": fmt(min(mechanism_pairwise)),
        "MechanismPairwiseMaximum": fmt(max(mechanism_pairwise)),
        "MechanismEstimate": fmt(mechanism_effect["estimate"]),
        "MechanismCILower": fmt(mechanism_effect["confidenceInterval"]["lower"]),
        "MechanismCIUpper": fmt(mechanism_effect["confidenceInterval"]["upper"]),
        "ComponentAverageEstimate": fmt(component_effect["estimate"]),
        "ComponentAverageCILower": fmt(component_effect["confidenceInterval"]["lower"]),
        "ComponentAverageCIUpper": fmt(component_effect["confidenceInterval"]["upper"]),
        "StrategyEstimate": fmt(strategy["estimate"]),
        "StrategyOrdinaryLower": fmt(strategy["unadjusted95"]["lower"]),
        "StrategyOrdinaryUpper": fmt(strategy["unadjusted95"]["upper"]),
        "StrategyFamilywiseLower": fmt(strategy["bonferroniFamilywise95"]["lower"]),
        "StrategyFamilywiseUpper": fmt(strategy["bonferroniFamilywise95"]["upper"]),
        "ImprovedPairCount": str(improved_pairs),
        "RegressedPairCount": str(regressed_pairs),
        "UnchangedPairCount": str(unchanged_pairs),
        "LossToDrawPairCount": str(transition_matrix["baseline"]["draw"]),
        "LossToWinPairCount": str(transition_matrix["baseline"]["candidate"]),
        "DrawToWinPairCount": str(transition_matrix["draw"]["candidate"]),
        "DrawToLossPairCount": str(transition_matrix["draw"]["baseline"]),
        "ChampionWinGainCount": str(paired["winCountDifference"]),
        "ChampionLossAvoidedCount": str(-paired["lossCountDifference"]),
        "TerminalRawRecordCount": f"{sum(row['games'] for row in terminal['campaignIntegrity'].values()):,}",
        "ConfirmatoryTerminalCombatantDifference": fmt(overall_terminal["combatants"], 2),
        "ConfirmatoryTerminalUnitDifference": fmt(overall_terminal["units"], 2),
        "ConfirmatoryTerminalCreditReduction": fmt_half_up(abs(overall_terminal["credits"]), 2),
        "StableDrawPairCount": str(draw_to_draw["games"]),
        "StableDrawCombatantDifference": fmt(stable_terminal["combatants"], 2),
        "StableDrawUnitDifference": fmt(stable_terminal["units"], 2),
        "StableDrawCreditDifference": fmt(stable_terminal["credits"], 2),
        "StrategyTerminalCombatantDifference": fmt(strategy_terminal["combatants"], 2),
        "StrategyTerminalUnitDifference": fmt(strategy_terminal["units"], 2),
        "StrategyTerminalCreditReduction": fmt_half_up(abs(strategy_terminal["credits"]), 2),
    }
    return "\n".join(
        rf"\newcommand{{\{name}}}{{{value}}}" for name, value in macros.items()
    )


def generate_family_plot(family_data: dict[str, Any]) -> str:
    rows = family_data["families"]
    labels = ",".join(f"F{index:02d}" for index in range(1, len(rows) + 1))
    ticks = ",".join(str(index) for index in range(1, len(rows) + 1))
    points = " ".join(
        f"({row['championMinusDefault']:.8f},{index})"
        for index, row in enumerate(rows, start=1)
    )
    return rf"""
\begin{{tikzpicture}}
\begin{{axis}}[
  width=\linewidth,
  height=6.2cm,
  xmin=-0.04, xmax=0.90,
  ymin=0.4, ymax=16.6,
  xtick={{0,0.2,0.4,0.6,0.8}},
  ytick={{{ticks}}},
  yticklabels={{{labels}}},
  xlabel={{Champion $-$ default score}},
  axis line style={{draw=ChronoInk}},
  tick label style={{text=ChronoInk,font=\scriptsize}},
  label style={{text=ChronoInk,font=\small}},
  grid=major,
  grid style={{draw=ChronoGrid}},
  clip=false
]
\addplot[draw=ChronoInk,dashed,line width=0.7pt] coordinates {{(0,0.4) (0,16.6)}};
\addplot[only marks,mark=*,mark size=2.2pt,draw=ChronoBlue,fill=ChronoBlue]
  coordinates {{{points}}};
\end{{axis}}
\end{{tikzpicture}}
"""


def generate_family_table(family_data: dict[str, Any]) -> str:
    lines = [
        r"\begin{tabular}{@{}llrrr@{}}",
        r"\toprule",
        r"Label & Family ID & Default & Champion & Difference \\",
        r"\midrule",
    ]
    for index, row in enumerate(family_data["families"], start=1):
        lines.append(
            f"F{index:02d} & \\texttt{{{latex_escape(row['familyId'])}}} & "
            f"{row['defaultScore']:.5f} & {row['championScore']:.5f} & "
            f"{row['championMinusDefault']:.5f} \\\\"
        )
    lines.extend([r"\bottomrule", r"\end{tabular}"])
    return "\n".join(lines)


def generate_transition_figure(terminal: dict[str, Any]) -> str:
    matrix = terminal["confirmatory"]["championMinusDefaultPaired"]["outcomeTransitionCounts"]
    rows = ["baseline", "draw", "candidate"]
    columns = ["baseline", "draw", "candidate"]
    display = {"baseline": "Loss", "draw": "Draw", "candidate": "Win"}
    cells: list[str] = []
    maximum = max(matrix[row][column] for row in rows for column in columns)
    for row_index, row in enumerate(rows):
        for column_index, column in enumerate(columns):
            count = matrix[row][column]
            intensity = count / maximum
            if intensity >= 0.55:
                fill, text_color = "ChronoBlue", "white"
            elif intensity >= 0.20:
                fill, text_color = "ChronoBlueLight", "ChronoInk"
            elif count > 0:
                fill, text_color = "ChronoPale", "ChronoInk"
            else:
                fill, text_color = "white", "ChronoMuted"
            x = column_index * 1.55
            y = -row_index * 1.05
            cells.append(
                rf"\node[draw=ChronoGrid,fill={fill},text={text_color},"
                rf"minimum width=1.5cm,minimum height=1cm,font=\bfseries] at ({x},{y}) {{{count}}};"
            )
    row_labels = "\n".join(
        rf"\node[anchor=east,text=ChronoInk,font=\small] at (-0.9,{-index * 1.05}) {{{display[row]}}};"
        for index, row in enumerate(rows)
    )
    column_labels = "\n".join(
        rf"\node[anchor=south,text=ChronoInk,font=\small] at ({index * 1.55},0.57) {{{display[column]}}};"
        for index, column in enumerate(columns)
    )
    return rf"""
\begin{{tikzpicture}}[font=\sffamily]
{row_labels}
{column_labels}
{' '.join(cells)}
\node[rotate=90,text=ChronoInk,font=\small\bfseries] at (-1.85,-1.05) {{Default outcome}};
\node[text=ChronoInk,font=\small\bfseries] at (1.55,1.05) {{Champion outcome}};
\end{{tikzpicture}}
"""


def generate_component_plot(component: dict[str, Any]) -> str:
    display = {
        "revertDefenseGrowth": "Defense growth",
        "revertEmergencyDefense": "Emergency defense",
        "revertForceAttack": "Forced attack",
        "revertScouting": "Scouting",
        "revertStrategy": "Infantry + rush",
    }
    rows = component["pairwiseChampionMinusAblation"]
    labels = ",".join("{" + display[row["ablationMethodId"]] + "}" for row in rows)
    ticks = ",".join(str(index) for index in range(1, len(rows) + 1))
    commands: list[str] = []
    for index, row in enumerate(rows, start=1):
        estimate = row["estimate"]
        ordinary = row["unadjusted95"]
        familywise = row["bonferroniFamilywise95"]
        if ordinary["lower"] is not None:
            commands.extend([
                rf"\draw[ChronoBlue,line width=1.1pt] (axis cs:{ordinary['lower']:.8f},{index + 0.12}) -- (axis cs:{ordinary['upper']:.8f},{index + 0.12});",
                rf"\addplot[only marks,mark=*,mark size=1.8pt,draw=ChronoBlue,fill=ChronoBlue] coordinates {{({estimate:.8f},{index + 0.12})}};",
                rf"\draw[ChronoOrange,line width=1.1pt] (axis cs:{familywise['lower']:.8f},{index - 0.12}) -- (axis cs:{familywise['upper']:.8f},{index - 0.12});",
                rf"\addplot[only marks,mark=square*,mark size=1.7pt,draw=ChronoOrange,fill=ChronoOrange] coordinates {{({estimate:.8f},{index - 0.12})}};",
            ])
        else:
            commands.append(
                rf"\addplot[only marks,mark=diamond*,mark size=2pt,draw=ChronoMuted,fill=ChronoMuted] coordinates {{({estimate:.8f},{index})}};"
            )
    return rf"""
\begin{{tikzpicture}}
\begin{{axis}}[
  width=0.90\linewidth,
  height=5.2cm,
  xmin=-0.15, xmax=0.72,
  ymin=0.4, ymax=5.6,
  xtick={{-0.1,0,0.1,0.3,0.5,0.7}},
  ytick={{{ticks}}},
  yticklabels={{{labels}}},
  xlabel={{Champion $-$ one-group revert score}},
  axis line style={{draw=ChronoInk}},
  tick label style={{text=ChronoInk,font=\scriptsize}},
  label style={{text=ChronoInk,font=\small}},
  grid=major,
  grid style={{draw=ChronoGrid}},
  clip=false
]
\addplot[draw=ChronoInk,dashed,line width=0.7pt] coordinates {{(0,0.4) (0,5.6)}};
{' '.join(commands)}
\end{{axis}}
\end{{tikzpicture}}
"""


def generate_study_flow(supported: dict[str, Any], roles: dict[str, Any]) -> str:
    return rf"""
\begin{{tikzpicture}}[
  node distance=7mm and 3mm,
  box/.style={{draw=ChronoGrid,rounded corners=1.5pt,fill=white,text=ChronoInk,align=center,font=\scriptsize,text width=2.65cm,minimum height=9mm,inner sep=3pt}},
  arrow/.style={{-{{Latex[length=2mm]}},draw=ChronoBlue,line width=0.8pt}},
  branch/.style={{-{{Latex[length=2mm]}},draw=ChronoMuted,line width=0.7pt}}
]
\node[box] (screen) {{67 Temperate map\\families screened twice}};
\node[box,right=of screen] (pass) {{{supported['targetCount']}-family supported\\population}};
\node[box,right=of pass] (roles) {{22 train; 12 development\\16 test; 4 reserve}};
\node[box,right=of roles] (search) {{Five $\times$ 32 policies\\successive halving\\4,680 games}};
\node[box,below=of search] (championship) {{30 finalists $\rightarrow$ champion\\2,112 games\\with common seeds}};
\node[box,left=of championship] (dev) {{Fresh v2 gate: 10 families\\440 games; passed}};
\node[box,left=of dev] (test) {{Sealed test: 16 families\\512 games; opened once}};
\node[box,below=of screen] (exclude) {{13 reviewed or failed\\outcome-free checks}};
\draw[arrow] (screen) -- (pass);
\draw[branch] (screen) -- (exclude);
\draw[arrow] (pass) -- (roles);
\draw[arrow] (roles) -- (search);
\draw[arrow] (search) -- (championship);
\draw[arrow] (championship) -- (dev);
\draw[arrow] (dev) -- (test);
\end{{tikzpicture}}
"""


def generate_all(
    repo_root: Path,
    output_dir: Path,
    expected_artifact_hashes: dict[str, str] | None = None,
) -> dict[str, Any]:
    expected_hashes = validate_expected_hashes(
        dict(
            EXPECTED_ARTIFACT_HASHES
            if expected_artifact_hashes is None
            else expected_artifact_hashes
        )
    )
    artifact_dir = repo_root / "research" / "artifacts"
    inputs = {
        name: load_frozen(artifact_dir, name, expected_hashes)
        for name in expected_hashes
    }
    confirmatory = inputs["method_v2_confirmatory_result_v1.json"]
    families = inputs["method_v2_confirmatory_family_diagnostics_v1.json"]
    mechanism = inputs["method_v2_mechanism_ablation_result_v1.json"]
    component = inputs["method_v2_component_ablation_result_v1.json"]
    terminal = inputs["method_v2_terminal_state_analysis_v1.json"]
    supported = inputs["supported_temperate_families_v1.json"]
    roles = inputs["family_role_commitments_v1.json"]
    compute = inputs["accepted_compute_accounting_v1.json"]

    if families["source"]["unblindingSha256"] != confirmatory["evidence"]["unblindingSha256"]:
        raise ValueError("family export and confirmatory source commitments differ")
    expect_close(
        families["aggregateChecks"]["championMinusDefault"],
        confirmatory["prespecifiedImprovement"]["estimate"],
        "family export improvement",
    )

    output_dir.mkdir(parents=True, exist_ok=True)
    outputs = {
        "metrics.tex": generate_metrics(
            confirmatory,
            families,
            mechanism,
            component,
            terminal,
            supported,
            roles,
            compute,
        ),
        "family_effects_plot.tex": generate_family_plot(families),
        "family_effects_table.tex": generate_family_table(families),
        "outcome_transitions.tex": generate_transition_figure(terminal),
        "component_effects_plot.tex": generate_component_plot(component),
        "study_flow.tex": generate_study_flow(supported, roles),
    }
    for filename, content in outputs.items():
        write(output_dir / filename, content)

    manifest = {
        "schemaVersion": 1,
        "generator": "paper/scripts/generate_assets.py",
        "inputs": {
            f"research/artifacts/{name}": digest
            for name, digest in sorted(expected_hashes.items())
        },
        "outputs": {
            filename: hashlib.sha256((content.rstrip() + "\n").encode("utf-8")).hexdigest()
            for filename, content in sorted(outputs.items())
        },
    }
    write(output_dir / "asset_manifest.json", json.dumps(manifest, indent=2, sort_keys=True))
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument(
        "--artifact-hash-manifest",
        type=Path,
        help="optional JSON filename-to-SHA256 map for a sanitized review artifact",
    )
    args = parser.parse_args()
    output_dir = args.output_dir or args.repo_root / "paper" / "generated"
    expected_hashes = (
        load_hash_manifest(args.artifact_hash_manifest.resolve())
        if args.artifact_hash_manifest
        else None
    )
    generate_all(args.repo_root.resolve(), output_dir.resolve(), expected_hashes)


if __name__ == "__main__":
    main()
