# HFO RA2Web-Advanced decorated optimizer V5 Stage-0 result

Status: **complete; 18 frozen survivors advance to Stage 1**

## Identities and complete coverage

- Gameplay array: `23642072`, 1,350/1,350 tasks completed `0:0` under
  `pi_jss233`; no retry, replacement, exclusion, or partial-outcome inspection
  occurred.
- Fail-closed finalizer: `23642073`, completed `0:0` after the full array.
- Aggregate SHA-256:
  `362783e25ddd9e1825801dffa6bada8c7d1271eee6f7ef2e99cca41916a69758`.
- Source commit:
  `ad7554f3ffb2d82162638a5af05951d6cc85111b`.
- Program SHA-256:
  `a3d3d06d31070c55cc6e5d6bc432aabc2dc1b5cbff89aafff8378aaca199ceb8`.
- Protocol SHA-256:
  `d83c2fef545de6cad22529a94f33b27b1a425de3d20f05dceae924476df973cb`.
- Master-selection SHA-256:
  `5ab1006be7d323d32a75bf0004303a062834827f58f4dee07aec3eac8df04cb0`.
- Asset-manifest SHA-256:
  `d942117f24363818977d573dbc87006a9b320c6861bddf939d5fc80db2217e67`.
- External Supalosa commit:
  `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.
- RA2Web client commit/release:
  `218fb800614295119e25040986b175fee4c3670f`,
  `0.84.1-r1d35349-dd6a17b9c`.
- RA2Web Advanced bundle SHA-256:
  `81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143`.
- Freeze-manifest SHA-256:
  `a405c0fc6d1d6541f965582c9b53be0bfd01c0c68f4d0f340e1a5ae37671aa5d`.

All 1,350 cell checksums and scheduler identities passed. The aggregate has
exactly three runs, 25 arms per run, and 18 country/slot-balanced west cases
per arm. All 1,350 scheduler job IDs are unique.

## Complete screen structure

The no-op control lost all 18 west-start games in every run. Across the 72
candidate arms (70 unique configurations):

- 19 arms converted one control loss into a win;
- seven arms produced draws, including one arm with two draws;
- 26 arms had a positive paired point estimate;
- only one arm had a positive frozen one-sided 90% robust lower bound; and
- no arm won more than one of 18 games.

A singleton win has paired mean `+0.05556` but lower bound `-0.01852`; the
frozen robust ranking therefore places it below an all-tied configuration
whose lower bound is zero. This is intentional: Stage 0 does not chase a
single favorable case. The only positive lower bound was produced by two
loss-to-draw conversions.

## Frozen survivors

| Run | Rank | Hash | Defense | Tick | Min units | Advantage | Target | W/D/L | Paired mean | Lower |
|---:|---:|---|---|---:|---:|---:|---|---:|---:|---:|
| 0 | 1 | `114bd8e005dc` | off | 7200 | 14 | 4 | production_first | 0/0/18 | 0.00000 | 0.00000 |
| 0 | 2 | `15cdecf11264` | wide | 14400 | 14 | -12 | terminal_race | 0/0/18 | 0.00000 | 0.00000 |
| 0 | 3 | `1a1e7dfedcde` | off | 9600 | 6 | 4 | force_first | 0/0/18 | 0.00000 | 0.00000 |
| 0 | 4 | `2a0a7115c109` | off | 12000 | 6 | -12 | force_first | 0/0/18 | 0.00000 | 0.00000 |
| 0 | 5 | `2b283dea6a06` | off | 14400 | 10 | -4 | production_first | 0/0/18 | 0.00000 | 0.00000 |
| 0 | 6 | `33a77610fbe9` | off | 7200 | 14 | -12 | force_first | 0/0/18 | 0.00000 | 0.00000 |
| 1 | 1 | `0054a0e95ec4` | wide | 12000 | 6 | 4 | production_first | 0/2/16 | 0.05556 | 0.00474 |
| 1 | 2 | `0e5792ec2d6a` | compact | 9600 | 10 | -4 | terminal_race | 0/0/18 | 0.00000 | 0.00000 |
| 1 | 3 | `0edde95de492` | compact | 7200 | 14 | -4 | production_first | 0/0/18 | 0.00000 | 0.00000 |
| 1 | 4 | `233cdb722ed9` | off | 14400 | 10 | -12 | production_first | 0/0/18 | 0.00000 | 0.00000 |
| 1 | 5 | `3c6b06a811e1` | off | 12000 | 10 | -12 | force_first | 0/0/18 | 0.00000 | 0.00000 |
| 1 | 6 | `44e7a1a59a28` | off | 12000 | 6 | -4 | terminal_race | 0/0/18 | 0.00000 | 0.00000 |
| 2 | 1 | `022fee13494a` | off | 7200 | 14 | -4 | terminal_race | 0/0/18 | 0.00000 | 0.00000 |
| 2 | 2 | `0db538faedcc` | off | 9600 | 14 | -4 | force_first | 0/0/18 | 0.00000 | 0.00000 |
| 2 | 3 | `12646b6359cf` | wide | 9600 | 6 | -12 | production_first | 0/0/18 | 0.00000 | 0.00000 |
| 2 | 4 | `25a65a20e35d` | wide | 9600 | 10 | -12 | terminal_race | 0/0/18 | 0.00000 | 0.00000 |
| 2 | 5 | `343d5a120a4b` | compact | 7200 | 10 | 4 | force_first | 0/0/18 | 0.00000 | 0.00000 |
| 2 | 6 | `52d6d2ad147b` | off | 12000 | 6 | 4 | terminal_race | 0/0/18 | 0.00000 | 0.00000 |

Full 64-character hashes and all rejected configurations remain in the
immutable aggregate under
`research-evidence/ra2web-opponents/advanced-optimizer-v5/stage-0/`.

## Interpretation and next step

The simple overlay space has not yet solved the west start. Its effects are
sparse and case-dependent, and the first-stage evidence is mostly negative.
The wide-defense, late, conservative production-first arm in run 1 is the only
configuration with a robustly positive Stage-0 score contrast, but it produced
draws rather than wins.

The protocol nevertheless requires all six frozen survivors per run to receive
36 new west cases in Stage 1 and to be ranked on the combined 54 pairs. Stage 1
is necessary to distinguish genuine low-frequency gains from one-case noise;
it is not evidence that a winning specialist exists. No non-survivor may be
revived based on its point estimate.
