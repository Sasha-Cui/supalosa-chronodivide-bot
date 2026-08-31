#!/usr/bin/env python3
"""Build a deterministic, identity-neutral final-study review artifact."""

from __future__ import annotations

import argparse
import contextlib
import gzip
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import shutil
import sys
import tarfile
import tempfile
from typing import Any


PACKAGE_NAME = "chrono-divide-review-artifact"
REDACTED = "REDACTED_FOR_DOUBLE_BLIND"
EVIDENCE_NAME = "final_paper_evidence_v1.json"
EVIDENCE_SHA256 = "0670bdeefab47ca68fb5fc584be6a299e777ee0d69f04cd45de7caebf32c31e3"
CURRENT_SECTIONS = (
    "introduction.tex",
    "related_work.tex",
    "environment.tex",
    "protocol.tex",
    "results.tex",
    "diagnostics.tex",
    "reproducibility.tex",
    "conclusion.tex",
)
CURRENT_ASSETS = (
    "metrics.tex",
    "mechanism_table.tex",
    "peak_strata_table.tex",
    "primary_bounds_plot.tex",
    "primary_results_table.tex",
    "transfer_table.tex",
)
DENIED_TEXT = (
    "Sasha Cui",
    "sasha.z.cui@gmail.com",
    "zc362",
    "pi_jss233",
    "/nfs/roberts",
    "github.com/Sasha-Cui",
    "Yale University",
    "Bouchet",
)
REDACTED_KEYS = {"sourceCommit", "sourceGitCommit"}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot import {path}")
    module = importlib.util.module_from_spec(spec)
    previous = sys.dont_write_bytecode
    sys.dont_write_bytecode = True
    try:
        spec.loader.exec_module(module)
    finally:
        sys.dont_write_bytecode = previous
    return module


def sanitize_payload(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: REDACTED if key in REDACTED_KEYS else sanitize_payload(child)
            for key, child in value.items()
        }
    if isinstance(value, list):
        return [sanitize_payload(child) for child in value]
    if value == "pi_jss233":
        return REDACTED
    return value


def copy_file(source: Path, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, target)


def copy_review_sources(
    repo_root: Path,
    package_root: Path,
    evidence: dict[str, Any],
) -> None:
    for name in CURRENT_SECTIONS:
        copy_file(
            repo_root / "paper" / "sections" / name,
            package_root / "paper" / "sections" / name,
        )
    copy_file(
        repo_root / "paper" / "references.bib",
        package_root / "paper" / "references.bib",
    )
    copy_file(
        repo_root / "paper" / "scripts" / "generate_final_assets.py",
        package_root / "paper" / "scripts" / "generate_final_assets.py",
    )

    frames = evidence["frameEvidence"]["frames"]
    require(len(frames) == 15, "expected exactly 15 final frame records")
    seen: set[str] = set()
    for row in frames:
        relative = row["file"]
        require(
            relative.startswith("paper/figures/game_frames/")
            and relative.endswith(".png")
            and relative not in seen,
            f"invalid or duplicate frame path: {relative}",
        )
        seen.add(relative)
        source = repo_root / relative
        require(source.is_file(), f"missing frame: {relative}")
        require(source.stat().st_size == row["bytes"], f"frame size drift: {relative}")
        require(sha256(source) == row["pngSha256"], f"frame hash drift: {relative}")
        copy_file(source, package_root / relative)

    shutil.copytree(
        repo_root / "paper_scitepress",
        package_root / "paper_scitepress",
        ignore=shutil.ignore_patterns(
            "build",
            "generated",
            "references.bib",
            "__pycache__",
            "*.pyc",
        ),
    )


def write_sanitized_evidence(
    repo_root: Path,
    package_root: Path,
) -> tuple[str, str]:
    source = repo_root / "research" / "artifacts" / EVIDENCE_NAME
    require(sha256(source) == EVIDENCE_SHA256, "final evidence hash drifted")
    payload = json.loads(source.read_text(encoding="utf-8"))
    require(
        payload["status"] == "PASS_FINAL_PAPER_EVIDENCE"
        and payload["complete"] is True,
        "final evidence is incomplete",
    )
    target = package_root / "research" / "artifacts" / EVIDENCE_NAME
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        json.dumps(sanitize_payload(payload), indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return EVIDENCE_SHA256, sha256(target)


def replace_generator_hash(
    generator_path: Path,
    original_hash: str,
    sanitized_hash: str,
) -> None:
    text = generator_path.read_text(encoding="utf-8")
    require(text.count(original_hash) == 1, "expected one pinned final-evidence hash")
    generator_path.write_text(
        text.replace(original_hash, sanitized_hash),
        encoding="utf-8",
    )


def regenerate_assets(package_root: Path) -> None:
    generator = load_module(
        package_root / "paper" / "scripts" / "generate_final_assets.py",
        "artifact_generate_final_assets",
    )
    with contextlib.redirect_stdout(io.StringIO()):
        require(generator.main() == 0, "final paper asset generation failed")

    source_generated = package_root / "paper" / "generated"
    observed = {path.name for path in source_generated.glob("*.tex")}
    require(observed == set(CURRENT_ASSETS), f"unexpected generated assets: {sorted(observed)}")

    target_generated = package_root / "paper_scitepress" / "generated"
    target_generated.mkdir(parents=True, exist_ok=True)
    for name in CURRENT_ASSETS:
        copy_file(source_generated / name, target_generated / name)
    copy_file(
        package_root / "paper" / "references.bib",
        package_root / "paper_scitepress" / "references.bib",
    )


def write_manifest(package_root: Path) -> dict[str, str]:
    entries = {
        path.relative_to(package_root).as_posix(): sha256(path)
        for path in sorted(package_root.rglob("*"))
        if path.is_file() and path.name != "MANIFEST.json"
    }
    payload = {
        "schemaVersion": 1,
        "scope": "all package files except MANIFEST.json",
        "files": entries,
    }
    (package_root / "MANIFEST.json").write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return entries


def anonymity_scan(package_root: Path) -> None:
    violations: list[str] = []
    for path in sorted(package_root.rglob("*")):
        relative = path.relative_to(package_root).as_posix()
        folded_relative = relative.casefold()
        for token in DENIED_TEXT:
            if token.casefold() in folded_relative:
                violations.append(f"filename contains {token!r}: {relative}")
        if not path.is_file():
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        folded_text = text.casefold()
        for token in DENIED_TEXT:
            if token.casefold() in folded_text:
                violations.append(f"file contains {token!r}: {relative}")
    if violations:
        raise ValueError("anonymous artifact scan failed:\n" + "\n".join(violations))


def build_package(repo_root: Path, package_root: Path) -> dict[str, str]:
    if package_root.exists():
        raise FileExistsError(package_root)
    package_root.mkdir(parents=True)

    evidence_path = repo_root / "research" / "artifacts" / EVIDENCE_NAME
    evidence = json.loads(evidence_path.read_text(encoding="utf-8"))
    copy_review_sources(repo_root, package_root, evidence)
    original_hash, sanitized_hash = write_sanitized_evidence(repo_root, package_root)
    replace_generator_hash(
        package_root / "paper" / "scripts" / "generate_final_assets.py",
        original_hash,
        sanitized_hash,
    )
    regenerate_assets(package_root)

    copy_file(
        repo_root / "artifact" / "templates" / "REVIEW_README.md",
        package_root / "README.md",
    )
    copy_file(
        repo_root / "artifact" / "THIRD_PARTY.md",
        package_root / "THIRD_PARTY.md",
    )
    copy_file(
        repo_root / "artifact" / "scripts" / "verify_package_manifest.py",
        package_root / "verify_manifest.py",
    )
    (package_root / "artifact_hashes.json").write_text(
        json.dumps({EVIDENCE_NAME: sanitized_hash}, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    anonymity_scan(package_root)
    return write_manifest(package_root)


def write_deterministic_archive(package_root: Path, archive_path: Path) -> None:
    archive_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = archive_path.with_suffix(archive_path.suffix + ".tmp")
    with temporary.open("wb") as raw:
        with gzip.GzipFile(filename="", mode="wb", fileobj=raw, mtime=0) as compressed:
            with tarfile.open(fileobj=compressed, mode="w") as archive:
                for path in sorted(package_root.rglob("*")):
                    relative = path.relative_to(package_root)
                    arcname = Path(PACKAGE_NAME) / relative
                    info = tarfile.TarInfo(arcname.as_posix())
                    info.mtime = 0
                    info.uid = 0
                    info.gid = 0
                    info.uname = ""
                    info.gname = ""
                    if path.is_dir():
                        info.type = tarfile.DIRTYPE
                        info.mode = 0o755
                        archive.addfile(info)
                    elif path.is_file():
                        data = path.read_bytes()
                        info.size = len(data)
                        info.mode = 0o644
                        archive.addfile(info, fileobj=io.BytesIO(data))
                    else:
                        raise ValueError(f"unsupported package entry: {path}")
    temporary.replace(archive_path)


def build_archive(repo_root: Path, archive_path: Path) -> str:
    build_parent = repo_root / "artifact" / "build"
    build_parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="package.", dir=build_parent) as directory:
        package_root = Path(directory) / PACKAGE_NAME
        build_package(repo_root, package_root)
        write_deterministic_archive(package_root, archive_path)
    return sha256(archive_path)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    repo_root = args.repo_root.resolve()
    output = args.output or repo_root / "artifact" / "dist" / f"{PACKAGE_NAME}.tar.gz"
    digest = build_archive(repo_root, output.resolve())
    print(f"archive={output.resolve()}")
    print(f"sha256={digest}")


if __name__ == "__main__":
    main()
