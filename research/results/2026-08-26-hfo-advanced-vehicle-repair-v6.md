# HFO RA2Web-Advanced V6 vehicle-queue repair result

Status: **complete; narrow technical repair passed**

## Identities and complete coverage

- Zero-update selector: job `23694414`, 68 initialized games, 18 selected
  west-versus-east cases, two per country and nine per participant slot.
- Selection SHA-256:
  `31ec1a385c617b3f2e0ab72c7942a5e171b2ad9007137b3c68717b4213443fa4`.
- Preserved no-op smoke: job `23704789`, exactly 9,600 updates, nine snapshots,
  no early finish, no prohibited field, and zero no-op overlay action.
- Technical array: `23704847`, 36/36 tasks completed `0:0` under
  `pi_jss233`; no retry, replacement, exclusion, or partial-trace inspection
  occurred.
- Fail-closed finalizer: `23704848`, completed `0:0` after the full array.
- Aggregate SHA-256:
  `76ec31ed449a87e530464a4b49d482e93b997e3fdc3a290e27a88d1bb7b3cb7b`.
- Source commit:
  `0e6af015f860bdd721e7d947104722b19ea9b7b7`.
- Program SHA-256:
  `d5edc20fd1291f5740659a12e54a2235bdb715291612f30508cb9403bf324ea3`.
- Protocol SHA-256:
  `7be4ad792ac54dde51c3ba4bc125aec56e9b6a9147d7d9ccc9678cbe246e2f1a`.
- Asset-manifest SHA-256:
  `d942117f24363818977d573dbc87006a9b320c6861bddf939d5fc80db2217e67`.
- External Supalosa commit:
  `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.
- RA2Web client commit/release:
  `218fb800614295119e25040986b175fee4c3670f`,
  `0.84.1-r1d35349-dd6a17b9c`.
- RA2Web Advanced bundle/freeze-manifest SHA-256:
  `81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143`,
  `a405c0fc6d1d6541f965582c9b53be0bfd01c0c68f4d0f340e1a5ae37671aa5d`.

Every scheduler ID and cell checksum passed. Both arms contain all 18
country/slot cells. All 36 traces reached update 9,600 with nine fixed
snapshots and no early finish. The recursive audit found no W/D/L, result,
score, defeated side, endpoint orientation, terminal building count, or
competitive rank.

## Frozen repair gates

| Requirement | Observed | Gate |
|---|---:|---:|
| Intended tank available | 18/18 | at least 16/18 |
| At least one intended production mutation | 18/18 | at least 12/18 |
| Trace/action hash differs from no-op | 18/18 | at least 12/18 |
| No-op overlay actions | 0 | exactly 0 |
| Overlay combat orders | 0 | exactly 0 |
| Prohibited queue/semantic actions | 0 | exactly 0 |
| Production-window violations | 0 | exactly 0 |
| Mutation-timing violations | 0 | exactly 0 |

The repaired arm issued 52 idle-queue tank requests and 17 bounded
active-item replacements. Every mutation touched only the vehicle queue, used
the available country tank metadata, and occurred on an allowed 90- or
600-update check. Mutation cases covered all five Allied and four Soviet
countries in both participant slots.

## Fixed-horizon composition

At update 9,600, repaired minus paired no-op intended-tank count was:

| Stratum | Mean difference |
|---|---:|
| Overall | +0.2222 |
| Allied | +0.4000 |
| Soviet | 0.0000 |
| Slot 0 | +0.2222 |
| Slot 1 | +0.2222 |

This satisfies the frozen rule: positive overall, nonnegative in both sides
and slots, positive in at least one side and both slots. It is a technical
mechanism result, not a competitive estimate.

## Combined V6 conclusion

Original V6 plus Amendment 1 now validate the complete interface set:

- exact no-op lifecycle decoration;
- early infantry, tank, and dual idle-queue production;
- production-only separation from combat orders;
- bounded vehicle idle-or-replace production;
- early force-first and production-first combat activation;
- country-aware Allied/Soviet unit names; and
- complete queue, action-window, trace, side, and slot auditing without
  competitive outcomes.

The repair does not rehabilitate the original narrow replacement rule; it
shows that the broader prespecified idle-or-replace interface actuates reliably.
No original V6 passed arm was rerun.

## Next step

A separate competitive V6 protocol may now be frozen. It must use fresh
disjoint cases, include the exact no-op control, compare only technically
validated profiles, enforce paired and absolute uncertainty plus country,
faction, start, and slot safety, preserve non-west isolation, and require fresh
replication before any Advanced-specialist or adaptive-policy claim.
