# HFO RA2Web Advanced public-state diagnostic V7 result

Status: **complete aggregate; protocol-compliance audit failed; synthesis not authorized**

## Complete execution identity

- Outcome-free legacy-selection verifier: job `24284113`, completed `0:0`
  under `pi_jss233`.
- Verified development selection: 36 already-consumed V6 West-versus-East
  cases, four per country and 18 per participant slot; selection SHA-256
  `16548a7443a3e1d181a44b46dfc5fefe185241521fe6db06814ca461868d32a7`.
- Outcome-free 1,200-update smoke: job `24284158`, completed `0:0`; smoke
  SHA-256
  `626869feccbea0b50a4fc7ef7af6d95e2467310688be8421413a5eda1d570c3a`.
- Diagnostic array: job `24284286`, all 72/72 tasks completed `0:0` under
  `pi_jss233`, with 72 distinct scheduler job IDs and no retry, replacement,
  or exclusion.
- Fail-closed finalizer: job `24284287`, completed `0:0` after the full array.
- Aggregate SHA-256:
  `6430b1c3a99d1c5916ec71ae85ad5f83972e2789b1e50208132f39ba1e2cba89`.
- Source commit:
  `6cdba36fdab0b164c10a0d80d4799dca2eeda6f0`.
- Program SHA-256:
  `19fe0c504afa15d422c7b4921ad9c283ab91eeb66fae6b3aab945287331d7c46`.
- Protocol SHA-256:
  `436759ec7aea62744a378f480434399e58c5aff96b0576f33a48e9126eb5be3c`.
- Asset-manifest SHA-256:
  `d942117f24363818977d573dbc87006a9b320c6861bddf939d5fc80db2217e67`.
- Pinned Supalosa commit:
  `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.
- RA2Web client commit/release:
  `218fb800614295119e25040986b175fee4c3670f` /
  `0.84.1-r1d35349-dd6a17b9c`.
- Advanced bundle/freeze-manifest SHA-256:
  `81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143` /
  `a405c0fc6d1d6541f965582c9b53be0bfd01c0c68f4d0f340e1a5ae37671aa5d`.

Every arm contained all nine countries, both slots, and the same 36 cases.
Both prespecified task-0 deterministic repeats reproduced public-state hashes,
action hashes, endpoint status, winner, and update count exactly. No prohibited
competitive key occurred inside the candidate public-state traces.

## Development-only endpoints

These are reused development cases, not confirmation evidence.

| Policy versus Advanced at West | W | D | L | Median updates |
|---|---:|---:|---:|---:|
| Pinned external Supalosa | 0 | 2 | 34 | 28,868.5 |
| Deployed StrongBot | 6 | 0 | 30 | 19,197.5 |

StrongBot's six wins occurred in Libya (2), Iraq (2), Cuba (1), and Russia
(1). It was 1/0/17 in participant slot 0 and 5/0/13 in slot 1. This repeats the
known West failure and is not a new strength claim.

## Actionable failure timeline

All 64 losses across both arms still had at least three buildings, an infantry
or vehicle factory, and either three combatants or 500 credits at update 3,600.
The viable fraction remained 1.0 through update 8,400, 0.969 at update 9,600,
and 0.938 at update 12,000 before falling below 0.75 at update 15,000. Thus the
failure is not predetermined at initialization: the next method must intervene
in economy, production, and force allocation before roughly update 12,000.

Within StrongBot, eventual winners had median 21 versus 11 combatants at update
3,600 and 18 versus 9 combatants in the home region. At update 12,000 they
retained five versus three buildings and one versus zero war factories, then at
update 15,000 fielded 23 versus seven combatants and placed 14.5 versus zero at
the opponent base. These are descriptive development contrasts, not causal
effects or policy thresholds.

The pooled depth-one tree reported grouped balanced accuracy 0.766 at update
1,200 and 0.922 at update 2,400. That result is partly confounded by policy
identity: all Supalosa cases were losses/draws while StrongBot supplied every
win, and early candidate credits distinguish the two policies. It cannot be
used as a within-StrongBot success detector.

## Protocol-compliance audit

The finalizer's nominal
`PASS_HFO_ADVANCED_V7_PUBLIC_STATE_DIAGNOSTIC` flag is not accepted as the
scientific stage decision. The implementation omitted requirements stated in
the frozen protocol:

1. snapshots were captured from the candidate `GameApi` only, rather than
   separately from both participants' public views;
2. first-production timing was not included in the milestone output;
3. the action-ownership conflict check was not represented explicitly;
4. the actionable-window gate was pooled rather than separately checked across
   faction side and participant slot;
5. grouped classification omitted leave-seed-block-out validation;
6. fixed lower-quartile, median, and upper-quartile representative trajectories
   were not selected; and
7. the aggregate did not report a within-StrongBot grouped tree, leaving its
   pooled tree vulnerable to policy-identity confounding.

These are telemetry/analysis omissions, not failed game tasks. Nevertheless,
they prevent the diagnostic from authorizing synthesis. No new Advanced
competitive endpoint may run from this artifact.

## Consequence

Freeze and implement one full-population amendment on the same consumed 36
development cases and both arms. It must add the missing opponent-view,
milestone, grouping, representative-trace, and within-policy analyses without
changing either policy, case, endpoint, or substantive hypothesis. The repair
must rerun all 72 cells, never a favorable subset. V6 validation and replication
populations remain sealed.
