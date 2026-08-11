#!/usr/bin/env python3
"""Export the exact plain-text metadata for an ICAART submission form."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCITEPRESS = ROOT / "paper_scitepress"
MAIN = SCITEPRESS / "main.tex"
ABSTRACT = SCITEPRESS / "abstract.tex"
METRICS = ROOT / "paper" / "generated" / "metrics.tex"

AREA = "Agents"
TOPICS = [
    "Agent Models and Architectures",
    "Simulation",
    "Task Planning and Execution",
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def metrics() -> dict[str, str]:
    values: dict[str, str] = {}
    pattern = re.compile(r"^\\newcommand\{\\([A-Za-z]+)\}\{([^{}]*)\}$")
    for line in METRICS.read_text(encoding="utf-8").splitlines():
        match = pattern.fullmatch(line.strip())
        if match:
            name, value = match.groups()
            if name in values:
                raise ValueError(f"duplicate generated macro: {name}")
            values[name] = value
    if not values:
        raise ValueError(f"no generated macros found in {METRICS}")
    return values


def latex_to_plain(source: str, generated: dict[str, str]) -> str:
    used = set(re.findall(r"\\([A-Z][A-Za-z]+)\{\}", source))
    missing = sorted(used.difference(generated))
    if missing:
        raise ValueError(f"unresolved generated macros: {missing}")
    for name in sorted(used, key=len, reverse=True):
        source = source.replace(f"\\{name}{{}}", generated[name])

    inline = re.compile(r"\\(?:emph|textit|textbf)\{([^{}]*)\}")
    while inline.search(source):
        source = inline.sub(r"\1", source)

    replacements = {
        r"\&": "&",
        r"\%": "%",
        r"\_": "_",
        "~": " ",
        "---": "—",
        "--": "–",
    }
    for old, new in replacements.items():
        source = source.replace(old, new)
    source = " ".join(source.split())
    if re.search(r"[\\{}]", source):
        raise ValueError(f"unconverted LaTeX remains in plain text: {source!r}")
    return source


def extract_argument(source: str, command: str) -> str:
    match = re.search(rf"\\{command}\{{([^{{}}]*)\}}", source, re.DOTALL)
    if not match:
        raise ValueError(f"could not find \\{command} in {MAIN}")
    return " ".join(match.group(1).split())


def build_metadata() -> dict[str, object]:
    main_source = MAIN.read_text(encoding="utf-8")
    abstract = latex_to_plain(ABSTRACT.read_text(encoding="utf-8"), metrics())
    keywords = extract_argument(main_source, "keywords").rstrip(".")
    keyword_list = [value.strip() for value in keywords.split(",")]
    words = re.findall(r"[A-Za-z0-9][A-Za-z0-9'&.-]*", abstract)
    return {
        "paperClass": "Regular paper",
        "area": AREA,
        "topics": TOPICS,
        "title": extract_argument(main_source, "title"),
        "abstract": abstract,
        "abstractWordCount": len(words),
        "keywords": keyword_list,
        "sourceSha256": {
            "paper_scitepress/main.tex": sha256(MAIN),
            "paper_scitepress/abstract.tex": sha256(ABSTRACT),
            "paper/generated/metrics.tex": sha256(METRICS),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    rendered = json.dumps(build_metadata(), indent=2, ensure_ascii=False) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
    else:
        print(rendered, end="")


if __name__ == "__main__":
    main()
