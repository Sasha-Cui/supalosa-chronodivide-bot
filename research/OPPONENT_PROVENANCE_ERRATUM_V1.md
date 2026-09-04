# Opponent-provenance erratum V1

Date: 2026-09-04

Status: non-retroactive correction; frozen historical records remain unchanged

## Correction

The following frozen records incorrectly describe RA2Web Advanced or the
RA2Web opponent set as independently developed:

- `research/protocols/ra2web/RA2WEB_EXTERNAL_OPPONENT_PROTOCOL_V1.md`;
- `research/protocols/ra2web/2026-08-24-hfo-advanced-crossplay-v1.md`;
- `research/results/2026-08-24-hfo-ra2web-advanced-crossplay-v1.md`; and
- the current frozen manuscript.

The public `ra2web/ra2web-chronodivide-bot` repository is identified by
GitHub as a fork of `Supalosa/supalosa-chronodivide-bot`:

<https://github.com/ra2web/ra2web-chronodivide-bot>

The public `ra2web/ra2web-custom-ai` README states that it is deeply modified
from Supalosa's AI design:

<https://github.com/ra2web/ra2web-custom-ai>

Therefore the tested RA2Web family is external and behaviorally distinct, but
shares Supalosa lineage. It is not evidence from independent algorithmic
ancestry.

## Correct roles

- **Pinned Supalosa:** primary named baseline at commit
  `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.
- **RA2Web Advanced / Old Priest:** externally sourced, substantially modified,
  generation-3 rules-driven Supalosa-lineage opponent. It is the main
  opponent-distribution-shift test.
- **RA2Web Standard / Medium:** a later Supalosa-derived version-shift
  comparator.
- **RA2Web Sea/Land / MediumSea:** a specialized derived naval/mixed-domain
  comparator.

The three RA2Web configurations must not be counted as three independent
algorithm families. Their value is behavioral, version, capability, and
topology breadth under shared ancestry.

## Frozen byte provenance

The V1 freeze remains authoritative for the exact tested bytes:

- freeze-manifest SHA-256:
  `a405c0fc6d1d6541f965582c9b53be0bfd01c0c68f4d0f340e1a5ae37671aa5d`;
- Advanced actual bundle SHA-256:
  `81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143`;
- Standard actual bundle SHA-256:
  `00ede36939d614b96f830d288fe8ac22c1c5b95dea65c3f09e3fa3e56e99d348`;
- Sea/Land actual bundle SHA-256:
  `89899c6f4ba57d3e4cb6db0bca5dc0d0ae6310b10da81a77196bd1eb44f2a54f`.

The adjacent upstream Bot3 manifest reports Advanced bundle SHA-256
`f1fb8a074e565b4e152fc36553ee0e213305670ecd799830d35d5a9ce91c8584`,
which does not match the frozen bytes. Preserve and disclose this discrepancy;
do not substitute the adjacent manifest hash for the measured artifact hash.

## Claim boundary

Future writing must say “external Supalosa-derived opponent,” “behaviorally
distinct opponent,” or “opponent/version shift.” It must not say “independent
opponent,” “independent algorithm family,” or use RA2Web results as evidence
of ancestry-independent generalization.

Negative RA2Web evidence remains valid and must be reported. This correction
changes provenance language, not any outcome, gate, or ranking. Redistribution
of RA2Web bundles remains subject to its own license and the project's
third-party release boundary.
