# Progress-certified V5 confirmatory technical-repair protocol, version 1

Status: **prospective, outcome-blind repair frozen before any replacement-map
engine execution or confirmatory rerun**

Frozen: 2026-08-15 UTC

## Purpose and admissibility decision

The first sealed V5 confirmation launch is technically invalid in full. Slurm
array `22312734` completed all 504 tasks and all 3,024 planned games on account
`pi_jss233`, but its result population contains 324 games in which one assigned
side never established ownership of a building. The failure is balanced across
all three policies and reciprocal assignments: each policy has 108 invalid
games, and each of six map families contributes 54 invalid games. No policy
outcome was needed to identify this failure.

The affected families are:

- `mf_archive_09f37c66d32c7849`
- `mf_archive_0d65da8719b4d184`
- `mf_archive_28cfcf99ced03914`
- `mf_fresh266f190627e9340b856282b749f36b13cf3dca27`
- `mf_fresh64ad2c42f1bbe142dd53ed06be3fc01e1ab9abab`
- `mf_freshe2c24f49c0fc814024587bb28105e21d523788f2`

The invalidity follows only from endpoint-establishment, identity, scheduler,
and map/start metadata. Winners, scores, terminal orientation, and policy
comparisons remain sealed. The 2,700 technically valid games are not salvaged,
combined with replacements, or analyzed. Controller `22339263` passed the old
summary/provenance gate, demonstrating that the gate was incomplete; unblinder
`22339264` then failed closed when its stricter result validator encountered the
missing establishment. Neither job authorizes outcome access.

The complete launch is retained as an immutable technical incident and cannot
support policy selection, a paper result, or uncertainty estimation.

## Root cause

The frozen map-fidelity worker instantiated two passive bots with
`shortGame: true`. It checked exact map bytes, map loading, tick advancement,
warning classes, declared start locations, and reciprocal identity-to-start
assignment through tick 250. A passive bot never attempted to deploy its MCV,
so the gate could not test whether both physical starts supported the building
establishment required by a real Supalosa match.

This is a gate-design defect, not evidence about any candidate policy. The
repair therefore changes technical eligibility and validation only. It does not
change the V5 policy arms or reinterpret any game.

## Outcome-blind deployability gate

Every candidate family must pass one complete gate before inclusion in a new
confirmation. The gate uses the exact pinned external Supalosa implementation
on both sides; it does not use a learned or experimental overlay.

For each family, run all nine countries. For each country, run both reciprocal
agent orderings under the same committed engine seed, producing 18 games per
family. Use the standard evaluation settings, including `shortGame: false`,
10,000 starting credits, no crates, no superweapons, zero starting combat units,
MCV repacking enabled, and game speed 6. The fixed technical horizon is 600
ticks. A run may stop early only after both sides have each owned at least one
building.

A cell passes only when all of the following hold:

- the exact committed map bytes load through the authenticated alias;
- both bot identities receive distinct declared physical starts;
- the reciprocal ordering swaps those assignments as specified;
- both physical starts establish at least one bot-owned building by tick 600;
- tick arithmetic is valid and deterministic under the repeated ordering;
- the external baseline, game API, source tree, map, seed, country, scheduler
  account, task ID, and runtime hashes match the campaign commitment; and
- no fail-class warning, engine exception, truncated diagnostic stream, or
  unauthorized scheduler state occurs.

The public technical record may contain map identity, country, reciprocal
ordering, physical start coordinates, establishment booleans, first
establishment ticks, tick arithmetic, warnings, and provenance. It must not
read or emit winner, loser, score, resources, surviving force, terminal
orientation, policy action, or literal outcome. It must not call an outcome
analyzer. A family is eligible only if all 18 cells pass; partial family evidence
does not clear it.

## Reserve population and replacement rule

The original 56-family commitment remains the first tier. It is screened in
full; no family is excluded merely because it appears in the incident list.
Eligibility is determined by the new gate's complete, uniformly generated
technical record.

The only reserve tier is derived from the already frozen, outcome-blind CNC Map
Archive snapshot at
`research-evidence/external-map-sources/cncmaparchive-20260812T0200Z`.
Selection continues the existing SHA-256 rank after Blocks A-D, excludes every
normalized revision family already represented in those blocks, retains the
first content item for each remaining normalized family, and takes the complete
Block-D tail already identified as `below_frozen_block_d_rank_cutoff`. That tail
contains 71 content records and 70 unique normalized families, so the stated
first-per-family rule yields exactly 70 reserve candidates. This rule and count
are fixed before any tail map bytes are downloaded or inspected.

All 70 selected tail families receive the unchanged strict ordinary-skirmish byte screen.
There is no backfilling beyond this tail. Every byte-pass family then receives
the complete deployability gate above. Selection never uses establishment
speed, warnings among passing cells, map name preference, or a policy outcome.

The repaired confirmatory population is formed deterministically:

1. retain every original family that passes, in its original committed order;
2. append reserve families that pass both byte and deployability gates, ordered
   by `(rankSha256, sourceSha1)`; and
3. stop at 56 total families.

If fewer than 56 total families pass, retain the complete eligible population,
recompute the family-level power analysis before execution, and report the
reduced technical population transparently. Do not relax a gate or introduce a
second reserve source merely to restore sample size.

## Confirmation rerun

If and only if the repaired population is frozen and every selected family has
a complete passing gate, generate a new confirmation campaign with a new seed
base and exclusive evidence roots. Rerun the entire population: three unchanged
V5 arms, nine countries, both reciprocal slots, and one paired seed block per
family. No game or result from array `22312734` enters the rerun.

The dependent technical controller must validate every episode result without
reading its outcome fields. In addition to exact scheduler, manifest, plan,
source, map, policy, seed, country, slot, launch-count, and artifact commitments,
it must require:

- `technicalFailure` is exactly null;
- `endpointEstablished.candidate` is exactly true;
- `endpointEstablished.baseline` is exactly true;
- `shortGame` is exactly false; and
- the exact number of task and episode records is present once each.

Only that controller may authorize one complete unblinding. A failed technical
predicate invalidates the new launch in full; it is never repaired with
outcome-conditioned reruns.

## Tactical doctrine preserved across the repair

This technical repair does not alter the policy doctrine. Literal destruction
of every enemy building is the objective. Enemy forces are attacked only when
they block or can defeat the building strike, can regenerate relevant
resistance, or can win the race against our own final building. If one enemy
building can be destroyed before 100 off-route tanks can prevent it, attack the
building and win immediately. If those tanks would destroy our final building
first, divert only the minimum defense needed to reverse that race, then resume
the committed building strike. Favorable positions that repeatedly attack
without irreversible building progress are controller failures, not acceptable
stalemates.

The finish/base-race controller remains staged and cannot be integrated or
evaluated against sealed families until this V5 technical incident is resolved.

## Claim boundary

This protocol records a prospective technical repair. It is not evidence that
V5 beats Supalosa, that any new finishing controller works, or that Chrono
Divide is ready to support a paper claim. Paper writing and tactical screenshot
selection remain downstream of a technically valid positive experiment and its
uncertainty analysis.
