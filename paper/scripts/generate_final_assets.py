#!/usr/bin/env python3
"""Generate the final SCITEPRESS paper assets from one frozen evidence artifact."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
ARTIFACT = ROOT / "research" / "artifacts" / "final_paper_evidence_v1.json"
EXPECTED_SHA256 = "0670bdeefab47ca68fb5fc584be6a299e777ee0d69f04cd45de7caebf32c31e3"
OUT = ROOT / "paper" / "generated"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def fmt(value: float, digits: int = 2) -> str:
    return rf"{100 * float(value):.{digits}f}\%"


def dec(value: float, digits: int = 3) -> str:
    return f"{float(value):.{digits}f}"


def write(name: str, text: str) -> None:
    path = OUT / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text.rstrip() + "\n", encoding="utf-8")


def macro(name: str, value: object) -> str:
    return rf"\newcommand{{\{name}}}{{{value}}}"


def wdl(summary: dict[str, Any]) -> str:
    return f"{summary['wins']}/{summary['draws']}/{summary['losses']}"


def load() -> dict[str, Any]:
    require(sha256(ARTIFACT) == EXPECTED_SHA256, "final paper evidence hash drifted")
    value = json.loads(ARTIFACT.read_text(encoding="utf-8"))
    require(
        value["status"] == "PASS_FINAL_PAPER_EVIDENCE"
        and value["complete"] is True
        and value["hfoConfirmation"]["overall"]["wins"] == 633
        and value["peakStudy"]["replication"]["candidate"]["overall"]["wins"] == 134,
        "final paper evidence is ineligible",
    )
    return value


def generate_metrics(data: dict[str, Any]) -> str:
    hfo = data["hfoConfirmation"]
    peak = data["peakStudy"]["replication"]
    peak_candidate = peak["candidate"]
    advanced = data["advancedTransfer"]
    frames = data["frameEvidence"]
    allied = data["mechanisms"]["alliedWestRushGuard"]
    soviet = data["mechanisms"]["sovietWestRushGuard"]
    bottom = data["mechanisms"]["bottomProgressRetarget"]
    outcome_games = (
        hfo["gameCount"]
        + data["peakStudy"]["development"]["gameCount"]
        + peak["gameCount"]
        + advanced["gameCount"]
        + allied["replication"]["gameCount"]
        + soviet["replication"]["gameCount"]
        + bottom["replication"]["gameCount"]
    )

    values = {
        "OutcomeGameCount": f"{outcome_games:,}",
        "HfoGames": hfo["gameCount"],
        "HfoWins": hfo["overall"]["wins"],
        "HfoDraws": hfo["overall"]["draws"],
        "HfoLosses": hfo["overall"]["losses"],
        "HfoWinRate": fmt(hfo["overall"]["winRate"]),
        "HfoWilsonLower": fmt(hfo["overall"]["oneSided95WilsonLower"]),
        "HfoClusterLower": fmt(hfo["clustered"]["oneSided95Lower"]),
        "HfoMedianUpdates": f"{hfo['overall']['medianTicks']:,}",
        "HfoTickCapDraws": hfo["overall"]["statuses"]["tick_cap_draw"],
        "PeakGamesPerPolicy": peak["control"]["games"],
        "PeakControlWins": peak["control"]["wins"],
        "PeakControlDraws": peak["control"]["draws"],
        "PeakControlLosses": peak["control"]["losses"],
        "PeakControlWinRate": fmt(peak["control"]["winRate"]),
        "PeakWins": peak_candidate["overall"]["wins"],
        "PeakDraws": peak_candidate["overall"]["draws"],
        "PeakLosses": peak_candidate["overall"]["losses"],
        "PeakWinRate": fmt(peak_candidate["overall"]["winRate"]),
        "PeakWilsonLower": fmt(peak_candidate["overall"]["oneSided95WilsonLower"]),
        "PeakPairedMean": dec(peak_candidate["paired"]["mean"]),
        "PeakPairedLower": dec(peak_candidate["paired"]["oneSidedLower"]),
        "PeakClusterLower": fmt(peak_candidate["clustered"]["oneSided95Lower"]),
        "PeakImproved": peak_candidate["paired"]["improved"],
        "PeakTied": peak_candidate["paired"]["tied"],
        "PeakWorsened": peak_candidate["paired"]["worsened"],
        "PeakInvariantPairs": peak_candidate["weakExactCount"],
        "AdvancedStrongWins": advanced["candidate"]["overall"]["wins"],
        "AdvancedStrongDraws": advanced["candidate"]["overall"]["draws"],
        "AdvancedStrongLosses": advanced["candidate"]["overall"]["losses"],
        "AdvancedStrongWinRate": fmt(advanced["candidate"]["overall"]["winRate"]),
        "AdvancedSupalosaWins": advanced["supalosa"]["overall"]["wins"],
        "AdvancedSupalosaDraws": advanced["supalosa"]["overall"]["draws"],
        "AdvancedSupalosaLosses": advanced["supalosa"]["overall"]["losses"],
        "AdvancedSupalosaWinRate": fmt(advanced["supalosa"]["overall"]["winRate"]),
        "AdvancedPairedMean": dec(advanced["paired"]["meanScoreDifference"]),
        "AdvancedPairedLower": dec(advanced["paired"]["oneSided95Lower"]),
        "AlliedControlWdl": wdl(allied["replication"]["control"]),
        "AlliedWinnerWdl": wdl(allied["replication"]["winner"]),
        "AlliedPairedMean": dec(allied["replication"]["paired"]["mean"]),
        "AlliedPairedLower": dec(allied["replication"]["paired"]["oneSidedLower"]),
        "AlliedInactiveCells": allied["isolation"]["inactiveCaseCount"],
        "SovietControlWdl": wdl(soviet["replication"]["control"]),
        "SovietWinnerWdl": wdl(soviet["replication"]["winner"]),
        "SovietPairedMean": dec(soviet["replication"]["paired"]["mean"]),
        "SovietPairedLower": dec(soviet["replication"]["paired"]["oneSidedLower"]),
        "SovietInactiveCells": soviet["isolation"]["inactiveCaseCount"],
        "BottomControlWdl": wdl(bottom["replication"]["control"]),
        "BottomWinnerWdl": wdl(bottom["replication"]["winner"]),
        "BottomPairedMean": dec(bottom["replication"]["paired"]["mean"]),
        "BottomPairedLower": dec(bottom["replication"]["paired"]["oneSidedLower"]),
        "BottomInactiveCells": bottom["isolation"]["inactiveCaseCount"],
        "FrameCount": frames["frameCount"],
        "ReplayCount": frames["replayCount"],
        "PeakDivergenceUpdate": f"{frames['peakDivergenceUpdate']:,}",
        "ForceClearanceUpdate": f"{frames['forceClearance']['eventUpdate']:,}",
    }
    return "\n".join(macro(name, value) for name, value in values.items())


def generate_primary_table(data: dict[str, Any]) -> str:
    hfo = data["hfoConfirmation"]["overall"]
    peak = data["peakStudy"]["replication"]
    candidate = peak["candidate"]["overall"]
    return rf"""
\begin{{tabular}}{{@{{}}lrrrrr@{{}}}}
\toprule
Evaluation & Games & W & D & L & Win rate / lower bound \\
\midrule
HFO StrongBot vs. Supalosa & {hfo['games']} & {hfo['wins']} & {hfo['draws']} & {hfo['losses']} &
  {fmt(hfo['winRate'])} / {fmt(hfo['oneSided95WilsonLower'])} \\
Peak deployed control & {peak['control']['games']} & {peak['control']['wins']} & {peak['control']['draws']} &
  {peak['control']['losses']} & {fmt(peak['control']['winRate'])} / {fmt(peak['control']['oneSided95WilsonLower'])} \\
Peak reciprocal macro & {candidate['games']} & {candidate['wins']} & {candidate['draws']} & {candidate['losses']} &
  {fmt(candidate['winRate'])} / {fmt(candidate['oneSided95WilsonLower'])} \\
\bottomrule
\end{{tabular}}
"""


def generate_mechanism_table(data: dict[str, Any]) -> str:
    specs = [
        ("Allied west rush+guard", data["mechanisms"]["alliedWestRushGuard"]),
        ("Soviet west rush+guard", data["mechanisms"]["sovietWestRushGuard"]),
        ("Bottom progress retarget", data["mechanisms"]["bottomProgressRetarget"]),
    ]
    lines = [
        r"\begin{tabular}{@{}lrrrr@{}}",
        r"\toprule",
        r"Mechanism & Control W/D/L & Winner W/D/L & Paired lower & Inactive exact \\",
        r"\midrule",
    ]
    for label, row in specs:
        replication = row["replication"]
        isolation = row["isolation"]
        lines.append(
            f"{label} & {wdl(replication['control'])} & {wdl(replication['winner'])} & "
            f"{replication['paired']['oneSidedLower']:+.3f} & {isolation['inactiveCaseCount']} \\\\"
        )
    lines.extend([r"\bottomrule", r"\end{tabular}"])
    return "\n".join(lines)


def generate_transfer_table(data: dict[str, Any]) -> str:
    row = data["advancedTransfer"]
    strong = row["candidate"]["overall"]
    baseline = row["supalosa"]["overall"]
    return rf"""
\begin{{tabular}}{{@{{}}lrrrrr@{{}}}}
\toprule
First policy vs. RA2Web Advanced & Games & W & D & L & Win rate \\
\midrule
StrongBot & {strong['games']} & {strong['wins']} & {strong['draws']} & {strong['losses']} & {fmt(strong['winRate'])} \\
Pinned Supalosa & {baseline['games']} & {baseline['wins']} & {baseline['draws']} & {baseline['losses']} & {fmt(baseline['winRate'])} \\
\bottomrule
\end{{tabular}}
"""


def generate_bounds_plot(data: dict[str, Any]) -> str:
    hfo = data["hfoConfirmation"]["overall"]
    peak = data["peakStudy"]["replication"]["candidate"]["overall"]
    advanced = data["advancedTransfer"]["candidate"]["overall"]
    supalosa = data["advancedTransfer"]["supalosa"]["overall"]
    rows = [
        ("HFO StrongBot", hfo["winRate"], hfo["oneSided95WilsonLower"], 4),
        ("Peak reciprocal", peak["winRate"], peak["oneSided95WilsonLower"], 3),
        ("Advanced: Supalosa", supalosa["winRate"], supalosa["oneSided95WilsonLower"], 2),
        ("Advanced: StrongBot", advanced["winRate"], advanced["oneSided95WilsonLower"], 1),
    ]
    labels = ",".join(label for label, _, _, _ in sorted(rows, key=lambda row: row[3]))
    segments = "\n".join(
        rf"\addplot[ChronoBlue,line width=1.2pt] coordinates {{({lower},{y}) ({point},{y})}};"
        rf"\addplot[only marks,mark=*,mark size=2.3pt,ChronoBlue] coordinates {{({point},{y})}};"
        for _, point, lower, y in rows
    )
    return rf"""
\begin{{tikzpicture}}
\begin{{axis}}[
  width=.59\linewidth,height=5.0cm,
  xmin=0,xmax=1,ymin=0.5,ymax=4.5,
  xtick={{0,0.25,0.5,0.75,1}},
  ytick={{1,2,3,4}},yticklabels={{{labels}}},
  xlabel={{Literal win rate (point and one-sided 95\% lower bound)}},
  grid=major,grid style={{draw=ChronoGrid}},
  axis line style={{draw=ChronoInk}},
  tick label style={{text=ChronoInk,font=\scriptsize}},
  label style={{text=ChronoInk,font=\small}}
]
\addplot[ChronoInk,dashed] coordinates {{(0.5,0.5) (0.5,4.5)}};
{segments}
\end{{axis}}
\end{{tikzpicture}}
"""


def generate_peak_strata_table(data: dict[str, Any]) -> str:
    candidate = data["peakStudy"]["replication"]["candidate"]
    rows = [
        ("Start (37,73)", candidate["byStart"]["37,73"]),
        ("Start (118,73)", candidate["byStart"]["118,73"]),
        ("Allied", candidate["bySide"]["Allied"]),
        ("Soviet", candidate["bySide"]["Soviet"]),
        ("Slot 0", candidate["bySlot"]["0"]),
        ("Slot 1", candidate["bySlot"]["1"]),
    ]
    lines = [r"\begin{tabular}{@{}lrrrr@{}}", r"\toprule", r"Stratum & W & D & L & Win rate \\", r"\midrule"]
    for label, row in rows:
        lines.append(f"{label} & {row['wins']} & {row['draws']} & {row['losses']} & {fmt(row['winRate'])} \\\\")
    lines.extend([r"\bottomrule", r"\end{tabular}"])
    return "\n".join(lines)


def main() -> int:
    data = load()
    outputs = {
        "metrics.tex": generate_metrics(data),
        "primary_results_table.tex": generate_primary_table(data),
        "mechanism_table.tex": generate_mechanism_table(data),
        "transfer_table.tex": generate_transfer_table(data),
        "primary_bounds_plot.tex": generate_bounds_plot(data),
        "peak_strata_table.tex": generate_peak_strata_table(data),
    }
    for name, text in outputs.items():
        write(name, text)
    manifest = {
        "schemaVersion": 1,
        "kind": "final-paper-generated-assets",
        "source": {
            "path": str(ARTIFACT.relative_to(ROOT)),
            "sha256": EXPECTED_SHA256,
        },
        "outputs": {
            name: hashlib.sha256((OUT / name).read_bytes()).hexdigest()
            for name in sorted(outputs)
        },
    }
    write("manifest.json", json.dumps(manifest, indent=2, sort_keys=True))
    print(json.dumps({
        "status": "PASS_FINAL_PAPER_ASSETS",
        "outputs": len(outputs),
        "sourceSha256": EXPECTED_SHA256,
    }, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
