#!/usr/bin/env python3
"""Fail closed on structural defects in a SCITEPRESS review candidate."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
EMPTY_METADATA_FIELDS = ("Title", "Subject", "Keywords", "Author")
REQUIRED_INFO = {
    "Encrypted": "no",
    "Form": "none",
    "JavaScript": "no",
    "Page rot": "0",
    "Suspects": "no",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def executable(name: str) -> str:
    resolved = shutil.which(name)
    if resolved is None:
        raise ValueError(
            f"required Poppler executable {name!r} is not on PATH; "
            "load/install Poppler before running submission-check"
        )
    return resolved


def run_text(command: list[str]) -> str:
    completed = subprocess.run(
        command,
        check=False,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if completed.returncode:
        detail = completed.stderr.strip() or completed.stdout.strip()
        raise ValueError(f"command failed ({' '.join(command)}): {detail}")
    return completed.stdout


def parse_pdfinfo(output: str) -> dict[str, str]:
    fields: dict[str, str] = {}
    for line in output.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        fields[key.strip()] = value.strip()
    return fields


def validate_pdfinfo(fields: dict[str, str], expected_pages: int) -> None:
    for key in EMPTY_METADATA_FIELDS:
        if fields.get(key, ""):
            raise ValueError(f"review PDF metadata field {key!r} is not empty")

    for key, expected in REQUIRED_INFO.items():
        actual = fields.get(key)
        if actual != expected:
            raise ValueError(f"review PDF {key!r} is {actual!r}, expected {expected!r}")

    try:
        pages = int(fields["Pages"])
    except (KeyError, ValueError) as exc:
        raise ValueError("could not determine PDF page count") from exc
    if pages != expected_pages:
        raise ValueError(f"review PDF has {pages} pages, expected {expected_pages}")

    page_size = fields.get("Page size", "")
    match = re.search(r"([0-9.]+)\s+x\s+([0-9.]+)\s+pts\s+\(A4\)", page_size)
    if not match:
        raise ValueError(f"review PDF page size is not identified as A4: {page_size!r}")
    width, height = map(float, match.groups())
    if abs(width - 595.276) > 0.5 or abs(height - 841.89) > 0.5:
        raise ValueError(f"review PDF A4 geometry drifted: {width} x {height} pts")


def validate_fonts(output: str) -> int:
    rows = [line.split() for line in output.splitlines()[2:] if line.strip()]
    if not rows:
        raise ValueError("pdffonts reported no embedded fonts")
    failures: list[str] = []
    for fields in rows:
        if len(fields) < 6:
            failures.append(" ".join(fields))
            continue
        name = fields[0]
        embedded, unicode_map = fields[-5], fields[-3]
        if embedded != "yes" or unicode_map != "yes":
            failures.append(
                f"{name} (embedded={embedded}, unicode-map={unicode_map})"
            )
    if failures:
        raise ValueError("font embedding/Unicode failure: " + "; ".join(failures))
    return len(rows)


def compact_alphanumeric(text: str) -> str:
    return "".join(character.lower() for character in text if character.isalnum())


def validate_metadata_binding(metadata: dict[str, object], pdf_text: str) -> None:
    title = metadata.get("title")
    abstract = metadata.get("abstract")
    keywords = metadata.get("keywords")
    word_count = metadata.get("abstractWordCount")
    if not isinstance(title, str) or not title.strip():
        raise ValueError("submission metadata has no title")
    if not isinstance(abstract, str) or not abstract.strip():
        raise ValueError("submission metadata has no abstract")
    if not isinstance(keywords, list) or not keywords or not all(
        isinstance(item, str) and item.strip() for item in keywords
    ):
        raise ValueError("submission metadata has invalid keywords")
    if not isinstance(word_count, int) or not 70 <= word_count <= 200:
        raise ValueError(f"abstract word count {word_count!r} is outside 70--200")

    compact_pdf = compact_alphanumeric(pdf_text)
    for label, value in (
        ("title", title),
        ("abstract", abstract),
        ("keywords", " ".join(keywords)),
    ):
        if compact_alphanumeric(value) not in compact_pdf:
            raise ValueError(f"portal {label} does not match text extracted from PDF")

    source_hashes = metadata.get("sourceSha256")
    if not isinstance(source_hashes, dict) or not source_hashes:
        raise ValueError("submission metadata has no source hash map")
    for relative, expected in source_hashes.items():
        if not isinstance(relative, str) or not isinstance(expected, str):
            raise ValueError("submission metadata source hash map is malformed")
        path = ROOT / relative
        if not path.is_file():
            raise ValueError(f"metadata-bound source is missing: {relative}")
        actual = sha256(path)
        if actual != expected:
            raise ValueError(
                f"metadata-bound source drifted: {relative}: {actual} != {expected}"
            )


def validate_text(
    pdf_text: str,
    minimum_characters: int,
    maximum_characters: int,
    expected_characters: int | None,
    forbidden_tokens: list[str],
) -> int:
    character_count = sum(not character.isspace() for character in pdf_text)
    if not minimum_characters <= character_count <= maximum_characters:
        raise ValueError(
            f"PDF has {character_count} non-whitespace characters; expected "
            f"{minimum_characters}--{maximum_characters}"
        )
    if expected_characters is not None and character_count != expected_characters:
        raise ValueError(
            f"PDF has {character_count} non-whitespace characters; "
            f"frozen candidate has {expected_characters}"
        )

    lowered = pdf_text.casefold()
    if "anonymous author(s)" not in lowered:
        raise ValueError("review PDF does not contain the anonymous author marker")
    for placeholder in ("redacted_for_double_blind", "todo", "tbd"):
        if placeholder in lowered:
            raise ValueError(f"review PDF contains unresolved marker {placeholder!r}")
    for token in forbidden_tokens:
        if token and token.casefold() in lowered:
            raise ValueError("review PDF contains a caller-supplied forbidden token")
    return character_count


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path)
    parser.add_argument("metadata", type=Path)
    parser.add_argument("--expected-pages", type=int, default=10)
    parser.add_argument("--minimum-characters", type=int, default=10_000)
    parser.add_argument("--maximum-characters", type=int, default=50_000)
    parser.add_argument("--expected-characters", type=int)
    parser.add_argument("--expected-sha256")
    parser.add_argument("--forbidden-token", action="append", default=[])
    args = parser.parse_args()

    pdf = args.pdf.resolve()
    metadata_path = args.metadata.resolve()
    if not pdf.is_file() or not metadata_path.is_file():
        raise SystemExit("review PDF and submission metadata JSON must both exist")
    if args.expected_sha256 and sha256(pdf) != args.expected_sha256:
        raise SystemExit("review PDF SHA-256 does not match the requested freeze")

    try:
        info = parse_pdfinfo(run_text([executable("pdfinfo"), str(pdf)]))
        validate_pdfinfo(info, args.expected_pages)
        # Use Poppler's default reading order. Besides matching the venue-facing
        # character count recorded for this freeze, it keeps the abstract and
        # keyword blocks contiguous for the portal-to-PDF binding check.
        pdf_text = run_text([executable("pdftotext"), str(pdf), "-"])
        character_count = validate_text(
            pdf_text,
            args.minimum_characters,
            args.maximum_characters,
            args.expected_characters,
            args.forbidden_token,
        )
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        if not isinstance(metadata, dict):
            raise ValueError("submission metadata root must be an object")
        validate_metadata_binding(metadata, pdf_text)
        font_count = validate_fonts(run_text([executable("pdffonts"), str(pdf)]))
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        raise SystemExit(f"SCITEPRESS submission check failed: {exc}") from exc

    print(
        "SCITEPRESS submission candidate passed: "
        f"{args.expected_pages} A4 pages, {character_count} non-whitespace "
        f"characters, {font_count} embedded fonts, anonymous metadata"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
