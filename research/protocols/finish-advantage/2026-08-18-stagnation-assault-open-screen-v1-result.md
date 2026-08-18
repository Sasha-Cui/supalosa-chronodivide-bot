# Stagnation-assault open screen V1: complete result

Status: **complete, technically clean, no advancing candidate; development-only**

## Immutable execution

- campaign SHA-256: `c33ae1474ac7251b506d7d8125b71e711a3a1a5d142802bb28d61696f2a19e17`
- source commit: `78fc074581f69262604c6e2f555eb09955215268`
- array: `22619156`, 90/90 tasks completed under `pi_jss233`
- games: 900/900, with no retries or technical failures
- original controller: `22619157`, failed after complete loading on a historical V5 label assertion
- repaired controller: `22623104`, completed without rerunning a game
- final artifact SHA-256: `0c416e94566a9d851ca5b1dd6eb310c2a39480753182a4058190b1477ffcc259`

The original controller failure and exact non-mutating label repair are bound by
`2026-08-18-stagnation-assault-open-aggregation-repair-amendment-1.md`.

## Complete arm results

| Arm | Wins | Draws | Losses | Win rate | Draw rate |
|---|---:|---:|---:|---:|---:|
| exact external Supalosa | 33 | 119 | 28 | 0.1833 | 0.6611 |
| unchanged V5 | 41 | 111 | 28 | 0.2278 | 0.6167 |
| V5 + conservative additive assault | 39 | 114 | 27 | 0.2167 | 0.6333 |
| V5 + early additive assault | 40 | 112 | 28 | 0.2222 | 0.6222 |
| V5 + early-strong additive assault | 40 | 111 | 29 | 0.2222 | 0.6167 |

All three intervention arms had a positive family-clustered paired-score lower
bound versus exact Supalosa, but none improved on unchanged V5. Conservative
had V5 paired effect −0.00278, early −0.00278, and early-strong −0.00556.
The early and early-strong arms each converted two V5 draws to wins, but each
also regressed two V5 wins to draws and one V5 win to a loss. No arm passed the
prospective absolute-win and draw-reduction rules.

The interventions were not inert: conservative created 310 additive missions,
early 488, and early-strong 395. Their failure to improve V5 therefore rejects
the hypothesis that simply requesting another generic attack squad after
building-progress stagnation is sufficient.

## Interpretation boundary

This screen does not show that objective-aware offense is impossible. It shows
that a second generic attack producer mostly duplicates Supalosa's existing
offense. The previously completed V37 mission-native building takeover supplies
the opposite bound: it generated physical building pressure but reduced paired
score by approximately 0.197 and produced only six wins with 76 losses in its
selected arm. Broad takeover is unsafe.

The next causal target is the middle intervention: retain exact Supalosa
economy, defence, scouting, engineer, and composition selection, but replace
only the attack-mission factory so the already-created attack force uses a
different target-priority rule. This result authorizes design of that fresh
mechanism; it does not authorize confirmation or a paper claim.
