# Multi-map V2 technical selector: infeasible random-start coverage

Date: 2026-09-02. Status: technical failure; no V2 competitive result exists.

## Launch and stop

Array `24547752` was submitted for exactly 13 maps at source
`352e60d6ea2ff853af534244c479b6fd99fe7a19`, program SHA-256
`9b0596dfc46e74aa6d60ea2b5f6fcaced9cdfdb798b26af5a2fa2ee6466eb43f`.
Every task used CPU partition `day` and account `pi_jss233`.
Afterok finalizer `24547753` never ran and was cancelled.

The 2026-09-02 accounting reconciliation is:

- tasks 5, 6, 7, 8, 11: completed 0:0 (five two-start maps);
- task 9, raw job 24547763: failed 1:0 (Tour of Egypt);
- tasks 0, 1, 2, 3, 4, 10, 12: cancelled after the common cause was established;
- no task was retried, and no successful or partial task JSON was opened.

The failed stderr reports
`Multi-map selection incomplete tour-of-egypt 0 0`.
Source inspection establishes that this is exhaustion of 5,000 zero-update
initializations for country ordinal 0 / candidate slot 0. It is not a gameplay
loss. All files and logs under
`research-evidence/multimap-v2/technical` remain preserved.

## Root cause established from source, not outcomes

Pinned game-api 0.75.0 bundle SHA-256:
`dd398f5c8c2b4c3e3d6eb0f9ca6d7549bf70fee16c5950cd8902616ac922497d`.

Its `PublicApi_generateGameOpts` always supplies
`startPos:RANDOM_START_POS` to offline participants. Its
`GameOptRandomGen.generateStartLocations` shuffles starts and then places the
second random participant at a farthest point from the first. It does not
uniformly sample all directed pairs. The selector incorrectly assumed that
every distinct pair had nonzero sampling probability.

Static squared-distance enumeration from the unchanged map waypoints gives:

| Map group | Required pairs per country/slot | Possible natural first-to-second pairs |
|---|---:|---:|
| Original eight-start HFO | 56 | 8 |
| HFO Golden; Tour of Egypt | 30 each | 6 each |
| Each listed four-start map | 12 | 4 |
| Each listed two-start map | 2 | 2 |

Tour of Egypt's natural first-to-second pairs are
0→5, 1→5, 2→3, 3→2, 4→2, 5→0 (waypoint indices).
Candidate slot 1 reverses those role assignments; it does not restore missing
pairs. Continuing the seven remaining rejection searches cannot satisfy the
frozen population and would waste compute.

## Consequences and prospective response

The full 4,068-case population has **not** been obtained and no 900-game
screen may launch. Preserve the five successful technical outputs without
treating them as a whole-suite pass.

Keep every map and the full directed-pair coverage requirement. Before a
replacement census, validate an explicit-start **evaluation-only** adapter at
the existing engine-option boundary. Keep the original installed game-api and
map bytes unchanged, audit both unmodified and effective runtime identities,
and require no-override equivalence plus deterministic explicit-start
coverage. Do not use a favorable subset or simply raise the seed-search cap.

This is a correction to the new selector's feasibility assumption. It does
not change the older opposite-start experiments, their population definitions,
or their recorded results.
