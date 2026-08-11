#!/usr/bin/env python3
"""Fail closed on actionable SCITEPRESS manuscript build defects."""

from __future__ import annotations

import re
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 4:
        raise SystemExit("usage: check_build.py MAIN_LOG MAIN_BLG MAIN_PDF")

    log_path, blg_path, pdf_path = map(Path, sys.argv[1:])
    log = log_path.read_text(errors="replace")
    blg = blg_path.read_text(errors="replace")

    match = re.search(r"Output written on .*?\((\d+) pages?,", log)
    if not match:
        raise SystemExit("could not determine PDF page count from LaTeX log")
    pages = int(match.group(1))
    if pages > 12:
        raise SystemExit(f"SCITEPRESS fallback has {pages} pages; limit is 12")

    forbidden_log = (
        r"Overfull \\hbox",
        r"LaTeX Warning: (?:Reference|Citation).*undefined",
        r"There were undefined references",
        r"multiply defined",
        r"Undefined control sequence",
    )
    for pattern in forbidden_log:
        if re.search(pattern, log, re.IGNORECASE):
            raise SystemExit(f"actionable LaTeX log pattern: {pattern}")

    if "Warning--" in blg:
        raise SystemExit("BibTeX emitted a warning")
    if not pdf_path.is_file() or pdf_path.stat().st_size == 0:
        raise SystemExit("missing or empty PDF")

    print(f"SCITEPRESS build passed: {pages} pages, {pdf_path.stat().st_size} bytes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
