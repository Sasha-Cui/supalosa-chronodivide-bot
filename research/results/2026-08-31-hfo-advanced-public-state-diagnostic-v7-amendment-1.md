# HFO RA2Web Advanced public-state diagnostic V7 amendment 1 result

Status: **complete; amended diagnostic passed; synthesis protocol authorized**

## Exact execution

- Frozen amendment protocol SHA-256:
  `b9d8e6cc1d0d404fa75f07b401e16b76e1b0285f40c360efaa1f6bbcf136402f`.
- Source commit:
  `dad004b9bdfad1ffe004a7ed2269c515d9b63976`.
- Program SHA-256:
  `e4770d795e982c181915f59c84d108d1a35dd2325274c634e483740322d56dd6`.
- Outcome-free smoke: job `24287755`, 1,200 updates, synchronized candidate
  and opponent public snapshots, zero prohibited outcomes, SHA-256
  `16fead68dc0b0ccdc7fece347d3120738cc5b35b17db8e01e31d72875e703d06`.
- Full-population array: job `24287794`, 72/72 tasks completed `0:0` under
  `pi_jss233`, with 72 distinct scheduler job IDs and no retry, replacement,
  or exclusion.
- Fail-closed finalizer: job `24287795`, completed `0:0` only after all tasks.
- Aggregate SHA-256:
  `e3141a327cf9ebf73d7c595302521b8c88375a8f710dc1bae4e0ea5c51c03e1b`.
- Original outcome-free selection SHA-256:
  `16548a7443a3e1d181a44b46dfc5fefe185241521fe6db06814ca461868d32a7`.
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

Every candidate and opponent public trace passed recursive prohibited-key and
hash checks. Candidate/opponent snapshot schedules matched in all cells. All 72
cells reported `applicable=false`, zero action-ownership conflicts, and the
exact reason `immutable-arms-have-no-overlay`. Every cell that issued a
production request recorded first-production timing. Both task-0 repeats
reproduced candidate trace, opponent trace, action, endpoint, and update count
exactly.

## Repeated development endpoints

The complete endpoints reproduce the first V7 run exactly and do not constitute
independent performance evidence.

| Policy versus Advanced at West | W | D | L | Median updates |
|---|---:|---:|---:|---:|
| Pinned external Supalosa | 0 | 2 | 34 | 28,868.5 |
| Deployed StrongBot | 6 | 0 | 30 | 19,197.5 |

Both policies first requested production at median update 72. StrongBot first
created a combatant at median update 2,400, first saw an enemy combatant at
3,300, first lost a building at 5,700, and first registered aggregate damage at
7,500. Supalosa first created a combatant at 1,200, saw an enemy combatant at
3,600, lost a building at 5,700, and registered damage at 4,800.

## Actionable window

The amended grouped gate passed at update 3,600:

| Loss group | Observed | Viable | Fraction |
|---|---:|---:|---:|
| Overall | 64 | 64 | 1.000 |
| Allied | 38 | 38 | 1.000 |
| Soviet | 26 | 26 | 1.000 |
| Slot 0 | 34 | 34 | 1.000 |
| Slot 1 | 30 | 30 | 1.000 |

The pooled viable fraction remained 1.0 through update 8,400, 0.969 at 9,600,
and 0.938 at 12,000. Therefore the next policy class must take ownership before
the collapse, preferably at the already validated opponent-detection update
1,200, and must affect production, force retention, and force allocation rather
than only late target choice.

## Grouped diagnostic trees

All trees were depth one and used only lagged candidate-view public features.
Leave-country, leave-slot, and leave-repeat-block-out outputs and deterministic
permutation importance are present at every registered update.

The pooled tree is explicitly labeled policy-confounded because all six wins
occurred in the StrongBot arm. At update 1,200 all three pooled holdouts selected
candidate credits and reached balanced accuracy 0.766. It is not a causal policy
rule.

The StrongBot-only analysis retained six wins and 30 losses. All three grouped
holdouts reached balanced accuracy 0.833 at update 1,200 using candidate
credits. By update 8,400, leave-country and leave-repeat selected home
combatants with balanced accuracy 0.85, while leave-slot was only 0.55. At
15,000 all holdouts selected combatants at the opponent base; country and slot
balanced accuracy were 1.0 but repeat-block accuracy was 0.75. These findings
locate candidate grammar features but remain descriptive because the population
is small, outcome-exposed, and restricted to West.

## Fixed representative traces

The aggregate selected three deterministic quantiles per arm using the frozen
outcome-score/update/case rule. Their case identities and both public-trace
hashes are stored in the aggregate. No trajectory was chosen manually.

## Decision

Amendment 1 satisfies every original and amended diagnostic gate. It authorizes
freezing, implementing, and technically validating a new state-conditioned
policy-synthesis protocol. It does not authorize a positive Advanced claim and
does not authorize inspecting or using the old sealed V6 validation or
replication populations. New competitive endpoints require a separate frozen
population and protocol.
