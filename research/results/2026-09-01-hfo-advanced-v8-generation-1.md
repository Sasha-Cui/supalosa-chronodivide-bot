# HFO Advanced V8 Generation 1

## Status

`PASS_HFO_ADVANCED_V8_GENERATION_1` is a complete-aggregate and advancement
status, not a performance claim. The 48 evaluated policies again failed to
produce a credible Advanced specialist.

No partial cell or outcome was inspected. Analysis began only after all 1,944
cells and the fail-closed finalizer completed with exit `0:0`.

## Immutable identity

- Array job: `24408391`, exactly 1,944 tasks on `pi_jss233`.
- Afterok finalizer: `24408392`, completed `0:0`.
- Source commit: `be0206b1af5aba5e3b66743081e4d75026ac7e7b`.
- Program SHA-256:
  `f925c76a76e9acb40e9af4e35491cbd8b8f14ad5b2efc04946a883dcfb0f18cf`.
- Protocol SHA-256:
  `186ede4a712c68d2c0324dc350de4de8428f3b52cb55d344224b50934c447f88`.
- Selection SHA-256:
  `9730745e171ecc73531369ddfd8308700eec44a7586491852713806fb097f713`.
- Generation-0 aggregate SHA-256:
  `f3eb995c15d2f947bad6afcc1c24653aa18391e40c2026661cc4fd25eafa5a0f`.
- Asset-manifest SHA-256:
  `d942117f24363818977d573dbc87006a9b320c6861bddf939d5fc80db2217e67`.
- Pinned Supalosa commit: `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.
- Pinned RA2Web client commit: `218fb800614295119e25040986b175fee4c3670f`.
- Advanced bundle SHA-256:
  `81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143`.
- Aggregate SHA-256:
  `186a9d4f7f456183f69379620d94b1afd727874debb8bb7f3a9f8f072a7db3c6`.

The finalizer verified all 1,944 scheduler task identities, 18 arms and 36
fresh cases per run, cell checksums, all frozen source/runtime/opponent hashes,
the prior aggregate binding, and zero forwarded resignations.

## Complete evidence

Across 48 policy arms and 1,728 games, synthesized policies produced
`0W/143D/1585L`. The controls on the same three fresh populations were:

| Control | W/D/L |
|---|---:|
| Deployed StrongBot | 18/4/86 |
| Pinned external Supalosa | 0/1/107 |

Two policies had positive paired point estimates versus deployed StrongBot,
but neither had a positive one-sided 90% paired lower bound. No synthesized
policy won a single game.

| Run | Rank-0 hash prefix | W/D/L | Paired mean | One-sided 90% lower |
|---:|---|---:|---:|---:|
| 0 | `c69a79cf6c63` | 0/7/29 | -0.0833 | -0.1676 |
| 1 | `70cd638e787e` | 0/4/32 | -0.1250 | -0.2128 |
| 2 | `242068698b81` | 0/13/23 | -0.0139 | -0.1163 |

Run 2 policy `3e005f83a096` had the strongest paired point estimate,
`+0.0278`, but its lower bound was `-0.0408` and one faction-or-slot minimum
was zero. The frozen lexicographic ranking placed it fourth; it advances only
because exactly four survivors were prespecified.

## Advancement

Generation 1 has no performance stop gate. The finalizer retained four hashes
per run and generated exactly eight Generation-2 policies per run using two
elites, four deterministic mutations, and two deterministic crossovers.

All 24 Generation-2 hashes are globally unique. The 18 non-elite offspring are
also unique and none collides with any of the 132 previously evaluated policy
hashes. Generation 2 therefore proceeds on the frozen 72-case balanced
all-start populations.

The evidence now makes V8 success unlikely. Generation 2 is nevertheless the
prespecified point at which the full eligibility gates are applied. No
championship, replication, routing, or improvement claim is permitted unless
at least one run winner passes every original gate.
