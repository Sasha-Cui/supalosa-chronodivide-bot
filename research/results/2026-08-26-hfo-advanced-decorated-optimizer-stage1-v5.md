# HFO RA2Web-Advanced decorated optimizer V5 Stage-1 result

Status: **complete; six frozen survivors advance to Stage 2**

## Identities and complete coverage

- Gameplay array: `23654832`, 756/756 tasks completed `0:0` under
  `pi_jss233`; no retry, replacement, exclusion, or partial-outcome inspection
  occurred.
- Fail-closed finalizer: `23654833`, completed `0:0` after the full array.
- Aggregate SHA-256:
  `96cc5ff5d5937d6611c4dd219dcfacd05405a0c13d1c6f768e527f17f055df74`.
- Source commit:
  `b038f84982a2fe38acd105cc6caeb8433ac016ce`.
- Program SHA-256:
  `a3d3d06d31070c55cc6e5d6bc432aabc2dc1b5cbff89aafff8378aaca199ceb8`.
- Protocol SHA-256:
  `d83c2fef545de6cad22529a94f33b27b1a425de3d20f05dceae924476df973cb`.
- Master-selection SHA-256:
  `5ab1006be7d323d32a75bf0004303a062834827f58f4dee07aec3eac8df04cb0`.
- Frozen Stage-0 input SHA-256:
  `362783e25ddd9e1825801dffa6bada8c7d1271eee6f7ef2e99cca41916a69758`.
- Asset-manifest SHA-256:
  `d942117f24363818977d573dbc87006a9b320c6861bddf939d5fc80db2217e67`.
- External Supalosa commit:
  `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.
- RA2Web client commit/release:
  `218fb800614295119e25040986b175fee4c3670f`,
  `0.84.1-r1d35349-dd6a17b9c`.
- RA2Web Advanced bundle and freeze-manifest SHA-256:
  `81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143`,
  `a405c0fc6d1d6541f965582c9b53be0bfd01c0c68f4d0f340e1a5ae37671aa5d`.

All 756 cell checksums and unique scheduler job IDs passed. The aggregate has
exactly three runs, seven arms per run, and 36 fresh country/slot-balanced west
cases per arm. Ranking used each survivor's combined 18 Stage-0 plus 36
Stage-1 pairs, as frozen.

## Frozen combined rankings

| Run | Rank | Hash | Configuration | Combined W/D/L | Paired mean | 90% lower | Improved/tied/worsened | Advances |
|---:|---:|---|---|---:|---:|---:|---:|---|
| 0 | 1 | `2a0a7115c109` | off, tick 12000, 6 units, -12, force-first | 0/3/51 | +0.02778 | +0.00736 | 3/51/0 | Yes |
| 0 | 2 | `15cdecf11264` | wide, tick 14400, 14 units, -12, terminal-race | 0/2/52 | +0.01852 | +0.00169 | 2/52/0 | Yes |
| 0 | 3-6 | four arms | - | 0/0/54 each | 0 | 0 | 0/54/0 | No |
| 1 | 1 | `233cdb722ed9` | off, tick 14400, 10 units, -12, production-first | 0/1/53 | 0 | 0 | 0/54/0 | Yes |
| 1 | 2 | `3c6b06a811e1` | off, tick 12000, 10 units, -12, force-first | 0/1/53 | 0 | 0 | 0/54/0 | Yes |
| 1 | 3 | `44e7a1a59a28` | off, tick 12000, 6 units, -4, terminal-race | 0/1/53 | 0 | 0 | 0/54/0 | No |
| 1 | 4 | `0054a0e95ec4` | wide, tick 12000, 6 units, +4, production-first | 0/3/51 | +0.01852 | -0.00551 | 3/50/1 | No |
| 1 | 5-6 | two compact arms | - | 0/0/54 each | -0.00926 | -0.02128 | 0/53/1 | No |
| 2 | 1 | `0db538faedcc` | off, tick 9600, 14 units, -4, force-first | 1/0/53 | 0 | 0 | 0/54/0 | Yes |
| 2 | 2 | `52d6d2ad147b` | off, tick 12000, 6 units, +4, terminal-race | 1/0/53 | 0 | 0 | 0/54/0 | Yes |
| 2 | 3 | `25a65a20e35d` | wide, tick 9600, 10 units, -12, terminal-race | 2/0/52 | +0.01852 | -0.02337 | 2/51/1 | No |
| 2 | 4-6 | three arms | - | at most 0/2/52 | at most 0 | below 0 | each worsened once | No |

Full configuration hashes, raw paired rows, and all rejected arms remain in
the immutable aggregate under
`research-evidence/ra2web-opponents/advanced-optimizer-v5/stage-1/`.

## Interpretation

Fresh data did not turn the simple west overlay into a winning policy. The two
run-0 survivors have statistically positive score contrasts, but only because
they convert a few certain losses into draws; neither won a game in 54 combined
cases. The earlier run-1 draw signal did not replicate cleanly: it improved
three cases but worsened one and its robust lower bound became negative.
Run 2 illustrates why the paired gate matters: a two-win arm still ranked below
exact ties because it also worsened one control win.

The six frozen survivors are therefore low-risk or draw-producing policies,
not evidence of strength. Stage 2 remains necessary because it evaluates fresh
balanced all-start populations and explicitly checks that the west-only overlay
is trajectory-identical elsewhere. Given the west records, no positive Stage-2
result should be presumed.

## Next step

Evaluate exactly the two frozen survivors per run plus the no-op control on 72
fresh balanced cases per run. A run winner may advance only if it passes every
absolute win, paired improvement, faction, start, country, slot, and 54-pair
non-west trajectory-equivalence gate. No Stage-1 reject may be revived.
