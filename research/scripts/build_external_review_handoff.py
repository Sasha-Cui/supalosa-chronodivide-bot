#!/usr/bin/env python3
"""Build an identity-checked, unprimed Phase-A review handoff."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from dataclasses import dataclass
from pathlib import Path
import tempfile
from zipfile import ZIP_STORED, ZipFile, ZipInfo


ROOT = Path(__file__).resolve().parents[2]
PROMPT = ROOT / "research" / "EXTERNAL_REVIEW_PHASE_A_PROMPT.txt"


@dataclass(frozen=True)
class Candidate:
    source_commit: str
    pdf_path: Path
    pdf_sha256: str


CANDIDATES = {
    "icaart": Candidate(
        source_commit="ccc0c101de207a7100fd553e15efc4fa18108a35",
        pdf_path=ROOT / "paper_scitepress" / "build" / "main.pdf",
        pdf_sha256=(
            "98500e11d7ccaa6d1c0f88f2e741b499737124cdac1565190379029bc82c4c07"
        ),
    ),
    "scag": Candidate(
        source_commit="ccc0c101de207a7100fd553e15efc4fa18108a35",
        pdf_path=ROOT / "paper" / "build" / "main.pdf",
        pdf_sha256=(
            "efcc9856799493fdb93b29f58ad895abee7b0822d075297433f273507a25aaa3"
        ),
    ),
}

ARCHIVE_MEMBERS = ("anonymous-paper.pdf", "review-prompt.txt")
FORBIDDEN_PROMPT_CUES = (
    "strongbot",
    "supalosa",
    "chrono divide",
    "deployed default",
    "absolute gate",
    "relative gate",
    "method v1",
    "method v2",
    "0.535",
    "0.336",
    "sealed famil",
)


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def validate_prompt(text: str) -> None:
    lowered = text.lower()
    required = (
        "relevance",
        "originality",
        "technical quality",
        "significance",
        "presentation",
        "acceptance and rejection arguments",
        "accept, borderline, or reject",
    )
    missing = [phrase for phrase in required if phrase not in lowered]
    if missing:
        raise ValueError(f"neutral prompt is incomplete: {missing}")

    leaked = [cue for cue in FORBIDDEN_PROMPT_CUES if cue in lowered]
    if leaked:
        raise ValueError(f"neutral prompt leaks targeted-review cues: {leaked}")


def archive_info(name: str) -> ZipInfo:
    info = ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
    info.compress_type = ZIP_STORED
    info.create_system = 3
    info.external_attr = 0o100644 << 16
    return info


def build_handoff(
    *,
    pdf_path: Path,
    expected_pdf_sha256: str,
    prompt_path: Path,
    output_path: Path,
    replace: bool = False,
) -> dict[str, object]:
    pdf_payload = pdf_path.read_bytes()
    observed_pdf_sha256 = sha256_bytes(pdf_payload)
    if observed_pdf_sha256 != expected_pdf_sha256:
        raise ValueError(
            "PDF identity mismatch: "
            f"expected {expected_pdf_sha256}, observed {observed_pdf_sha256}"
        )
    if not pdf_payload.startswith(b"%PDF-"):
        raise ValueError(f"input is not a PDF: {pdf_path}")

    prompt_text = prompt_path.read_text(encoding="utf-8")
    validate_prompt(prompt_text)
    prompt_payload = prompt_text.encode("utf-8")

    if output_path.exists() and not replace:
        raise FileExistsError(f"output already exists: {output_path}")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.NamedTemporaryFile(
        prefix=f".{output_path.name}.",
        suffix=".tmp",
        dir=output_path.parent,
        delete=False,
    ) as stream:
        temporary_path = Path(stream.name)

    try:
        with ZipFile(
            temporary_path,
            mode="w",
            compression=ZIP_STORED,
        ) as archive:
            archive.writestr(
                archive_info(ARCHIVE_MEMBERS[0]),
                pdf_payload,
                compress_type=ZIP_STORED,
            )
            archive.writestr(
                archive_info(ARCHIVE_MEMBERS[1]),
                prompt_payload,
                compress_type=ZIP_STORED,
            )
        archive_payload = temporary_path.read_bytes()
        with ZipFile(temporary_path) as archive:
            observed_members = tuple(archive.namelist())
            if observed_members != ARCHIVE_MEMBERS:
                raise RuntimeError(
                    f"unexpected archive members: {observed_members!r}"
                )
            if archive.read(ARCHIVE_MEMBERS[0]) != pdf_payload:
                raise RuntimeError("archived PDF differs from the validated input")
            if archive.read(ARCHIVE_MEMBERS[1]) != prompt_payload:
                raise RuntimeError("archived prompt differs from the validated input")

        if output_path.exists() and not replace:
            raise FileExistsError(f"output appeared during build: {output_path}")
        os.replace(temporary_path, output_path)
    except BaseException:
        temporary_path.unlink(missing_ok=True)
        raise

    return {
        "archiveSha256": sha256_bytes(archive_payload),
        "members": list(ARCHIVE_MEMBERS),
        "output": str(output_path.resolve()),
        "pdfSha256": observed_pdf_sha256,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--candidate",
        choices=sorted(CANDIDATES),
        default="icaart",
        help="venue-formatted PDF to package (default: icaart)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="output ZIP (default: tmp/external-review/<candidate>-phase-a.zip)",
    )
    parser.add_argument(
        "--replace",
        action="store_true",
        help="replace an existing output only after revalidating all inputs",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    candidate = CANDIDATES[args.candidate]
    output_path = args.output or (
        ROOT / "tmp" / "external-review" / f"{args.candidate}-phase-a.zip"
    )
    record = build_handoff(
        pdf_path=candidate.pdf_path,
        expected_pdf_sha256=candidate.pdf_sha256,
        prompt_path=PROMPT,
        output_path=output_path,
        replace=args.replace,
    )
    record.update(
        {
            "candidate": args.candidate,
            "sourceCommit": candidate.source_commit,
        }
    )
    print(json.dumps(record, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
