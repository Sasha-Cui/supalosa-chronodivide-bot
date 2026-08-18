# RA2Web external-opponent protocol, version 1

Status: **prospectively frozen before RA2Web simulator outcomes**

Recorded: 2026-08-18 UTC

## Purpose and claim boundary

This protocol adds independently developed RA2Web bots as secondary opponents
without changing the project's primary comparison against exact pinned
Supalosa. Architecture and client labels are not evidence of playing strength.
No RA2Web win, draw, loss, score, or terminal state had been generated or
inspected when this protocol was frozen.

The primary paper claim remains that the final selected policy reliably beats
exact Supalosa commit `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f` under the
already frozen literal-building endpoint and positive gates. RA2Web results add
opponent diversity and an external robustness test; they cannot rewrite the
Supalosa policy-selection rule or authorize early access to sealed map-family
outcomes.

## Frozen artifacts

The external freeze manifest is:

`/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/ra2web-opponents/source-freeze-v1/freeze-manifest-v1.json`

Its SHA-256 is
`a405c0fc6d1d6541f965582c9b53be0bfd01c0c68f4d0f340e1a5ae37671aa5d`.
The client repository is `https://github.com/ra2web/ra2web.github.io` at commit
`218fb800614295119e25040986b175fee4c3670f`, release
`0.84.1-r1d35349-dd6a17b9c`.

The opponent roles are fixed as follows:

| Opponent ID | Client difficulty | Actual bundle SHA-256 | Role |
|---|---|---|---|
| `ra2web_standard` | Medium | `00ede36939d614b96f830d288fe8ac22c1c5b95dea65c3f09e3fa3e56e99d348` | equivalence/reference diagnostic only |
| `ra2web_sea_land` | MediumSea | `89899c6f4ba57d3e4cb6db0bca5dc0d0ae6310b10da81a77196bd1eb44f2a54f` | naval and mixed-domain secondary opponent |
| `ra2web_advanced_old_priest` | Advanced | `81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143` | main secondary external opponent |

Advanced reports version `0.83.1-bot3`, generation 3, rules-driven mode, build
`ra2web-0.83.1-ai-old-priest-phase258-20260716`, and telemetry schema 111.

## Manifest discrepancy

RA2Web's adjacent Bot3 manifest reports bundle SHA-256
`f1fb8a074e565b4e152fc36553ee0e213305670ecd799830d35d5a9ce91c8584`,
which does not match the current or release-scoped bundle. The actual byte hash
above is authoritative. The freeze also binds Git blob
`d213e7fe59ee53d22f3b2994af7c0abe75006fc4` and the July 23 repair commit
`e5b0d2639f7314cab1fb0e1278e3f5a586c40b1d`. The paper and artifact record
must disclose this upstream provenance discrepancy.

## License and release boundary

The deployment repository contains AGPL-3.0-or-later license text and its README
also states personal-research, attribution, and noncommercial conditions. The
public custom naval repository declares GPL-3.0. A newer naval branch archive
declares `UNLICENSED` and has no license file.

Therefore the project repository will not vendor any RA2Web bundle or
unlicensed naval source. We may run exact frozen bytes for noncommercial
research and report derived aggregate results. A public artifact will release
our adapter, hashes, retrieval instructions, and legally releasable metadata;
redistribution of third-party bytes requires a separate license review.

## Outcome-blind compatibility gate

Before competitive use, run a complete gate under Slurm account `pi_jss233` on
the committed `simple-1v1-no-preview.map` bytes
`bd61bb9ab4412b15895c89188336ab53b03dd20879936b92aaf4418e091cf7fc`.

Use all nine countries and both reciprocal candidate slots. For each of the 18
country-slot cells, use one fresh engine seed and run:

1. exact external Supalosa control;
2. RA2Web Standard first run and deterministic repeat;
3. RA2Web Sea/Land first run and deterministic repeat; and
4. RA2Web Advanced first run and deterministic repeat.

This is 126 short games, each stopped after exactly 1,200 updates. The seed base
is `4,229,000,000`, with one seed per country-slot cell. Every attempted game
creation counts. No cell may be retried selectively.

The gate records only normalized action and fixed-state digests, update counts,
bundle/module identities, source/runtime commitments, scheduler accounting,
and errors. It forbids winner, score, endpoint orientation, terminal building
counts, resignation-derived labels, and competitive rankings.

The gate passes only if:

- each actual bundle, freeze manifest, client commit, and map matches its frozen
  commitment;
- AMD module name and dependencies are exact and each bundle defines once;
- each exported bot inherits from the simulator's one physical game-API `Bot`;
- all countries and both slots construct and execute 1,200 updates;
- first and repeat traces are identical for Sea/Land and Advanced;
- no game finishes before the technical horizon;
- no forbidden field or simulator error is persisted; and
- scheduler accounting contains exactly 126 launches under `pi_jss233`.

Standard-versus-pinned-Supalosa trace identity is reported as a diagnostic. It
does not determine whether Sea/Land or Advanced is technically admissible,
because the client Standard bundle may contain a later Supalosa-derived version.

## Competitive evaluation

RA2Web competitive outcomes begin only after the current finish-advantage
candidate passes its predeclared Supalosa open-development gates and is frozen.
The multi-opponent evaluation then uses fresh paired seeds, reciprocal starts,
all nine countries, family-clustered uncertainty, and the literal building-
elimination endpoint.

Advanced is evaluated on every technically supported land and mixed-domain
family. Sea/Land is evaluated only on a separately frozen naval or mixed-domain
stratum selected without policy outcomes. The tournament includes enough
cross-play to separate candidate strength from opponent and slot effects:

- exact Supalosa versus RA2Web Advanced;
- final candidate versus exact Supalosa;
- final candidate versus RA2Web Advanced; and
- final candidate and relevant controls versus Sea/Land on the naval stratum.

No claim that Advanced is stronger than Supalosa, or that the final candidate
generalizes to it, is permitted until this paired tournament and uncertainty
analysis finish.
