# HFO RA2Web-Advanced decorated optimizer V5 Stage-2 result

Status: **complete; no eligible run winner and no championship**

## Identities and complete coverage

- Gameplay array: `23660545`, 648/648 tasks completed `0:0` under
  `pi_jss233`; no retry, replacement, exclusion, or partial-outcome inspection
  occurred.
- Fail-closed finalizer: `23660546`, completed `0:0` after the full array.
- Aggregate SHA-256:
  `fe68b3f455350089c6b371e9421cbd05376638c23b01af083c3c8caeea2be863`.
- Source commit:
  `699b82af93cc5aa7184b5db9ea2dd409137b077f`.
- Program SHA-256:
  `bd90513661c2844a54516dda3c88c2824ceaeddbf1a4ab8f03091c244964d16e`.
- Protocol SHA-256:
  `d83c2fef545de6cad22529a94f33b27b1a425de3d20f05dceae924476df973cb`.
- Master-selection SHA-256:
  `5ab1006be7d323d32a75bf0004303a062834827f58f4dee07aec3eac8df04cb0`.
- Frozen Stage-1 input SHA-256:
  `96cc5ff5d5937d6611c4dd219dcfacd05405a0c13d1c6f768e527f17f055df74`.
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

All 648 cell checksums and unique scheduler job IDs passed. The aggregate has
exactly three runs, three arms per run, and 72 fresh country/start/slot-balanced
cases per arm. Every candidate was exactly trajectory- and endpoint-identical
to its no-op control on all 54 non-west cases.

## Frozen candidate results

| Run | Hash | Configuration | W/D/L | Win lower | Paired mean | Paired lower | West W/D/L | Non-west exact | Eligible |
|---:|---|---|---:|---:|---:|---:|---:|---:|---|
| 0 | `2a0a7115c109` | off, tick 12000, 6 units, -12, force-first | 38/7/27 | 43.18% | 0 | 0 | 0/0/18 | 54/54 | No |
| 0 | `15cdecf11264` | wide, tick 14400, 14 units, -12, terminal-race | 38/7/27 | 43.18% | 0 | 0 | 0/0/18 | 54/54 | No |
| 1 | `233cdb722ed9` | off, tick 14400, 10 units, -12, production-first | 36/7/29 | 40.48% | 0 | 0 | 0/0/18 | 54/54 | No |
| 1 | `3c6b06a811e1` | off, tick 12000, 10 units, -12, force-first | 36/8/28 | 40.48% | +0.00694 | -0.00204 | 0/1/17 | 54/54 | No |
| 2 | `0db538faedcc` | off, tick 9600, 14 units, -4, force-first | 38/6/28 | 43.18% | 0 | 0 | 0/0/18 | 54/54 | No |
| 2 | `52d6d2ad147b` | off, tick 12000, 6 units, +4, terminal-race | 38/6/28 | 43.18% | 0 | 0 | 0/0/18 | 54/54 | No |

Five candidates were score-identical to their control on all 72 cases. The
remaining run-1 candidate converted one west loss into a tick-cap draw, but
its paired lower bound remained below zero. No candidate won a west game.

## Frozen gate audit

No candidate passed the advancement rule:

- pooled one-sided 95% Wilson lower bounds were 40.48% or 43.18%, all below
  50%;
- paired one-sided 90% lower bounds were zero or negative, never positive;
- west was 0/0/18 for five arms and 0/1/17 for one arm;
- country safety failed, most visibly for Americans in every run and for
  additional Allied countries in runs 1 and 2;
- at least one faction and participant-slot gate failed where required; and
- no run contributed an eligible survivor.

The non-west isolation gate passed perfectly, so the failure is not caused by
collateral regression at east, top, or bottom. Those starts carried the pooled
records: for example, run 0 was 14/1/3 east, 12/0/6 top, and 12/6/0 bottom,
while remaining 0/0/18 west.

## Mechanistic interpretation

V5 cleanly separates three facts:

1. the external lifecycle decorator is exactly equivalent when inactive;
2. the west-only order overlay is perfectly isolated from other starts; and
3. its direct defense/attack target controls do not repair the west loss.

The overlay often changed west trajectories—only 38 of 108 candidate west
pairs were completely identical—but 107/108 west outcomes were unchanged and
the sole change was a draw. West losses terminated at median updates between
approximately 26,100 and 28,700. This indicates that changing unit orders
after the baseline has built its force is insufficient; the next prospective
method must act on earlier production, force composition, or mission creation,
not merely retarget the same force.

## Consequence and next step

The V5 search is complete and negative. The championship and replication
populations remain sealed and must not be run, because the frozen prerequisite
of an eligible Stage-2 run winner was not met.

The next Advanced method should preserve the validated external lifecycle seam
but add an early, west-only production/mission expert. A new protocol must
freeze its production choices, action interface, diagnostic traces, candidate
space, and fresh development populations before outcomes. It should first
verify that the expert actually changes build/mission state before another
large outcome campaign. No V5 reject or threshold may be reused post hoc.
