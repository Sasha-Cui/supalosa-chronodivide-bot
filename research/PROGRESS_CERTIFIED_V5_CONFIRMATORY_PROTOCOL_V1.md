# Progress-Certified V5 Sealed Confirmatory Protocol V1

Status: **frozen before any V5 outcome is generated on the confirmatory map population**

## Research question

Does the frozen visibility-aware final-building policy (V5) improve literal
head-to-head score against the exact external Supalosa bot, while itself scoring
above even, on a fresh and technically verified population of Chrono Divide
maps? A literal win requires physical destruction of every enemy building under
the frozen endpoint. Material advantage, engine defeat, resignation, and a
favorable position at the tick cap are not wins.

The policy objective is lexicographic. A feasible final-building kill outranks
combat with irrelevant forces. Forces are attacked only when they can intercept,
block, or destroy the building strike; after that minimum obstruction is removed,
the policy returns immediately to the building. V5 is frozen for this test. The
broader multi-building version of this rule is a prospective V6 direction only
if V5 fails confirmation and may not be selected using confirmatory outcomes.

## Evidence authorizing confirmation

- Complete V5 open-development aggregate:
  `4c6fedf27f034870d8ed827f93463d70049494764c2c7f50b57d15bb50fa353a`.
  Its frozen advancement rule passed on all 540 scheduled games. This is
  selection evidence only and supports no paper claim.
- Role-blind fresh map catalog:
  `8ecc01bb490f419045298a292ce4935c9e107d0ee1059abe400d9db44427d7b7`.
- Role-blind fidelity targets:
  `6b9ec4b0704db15b7b01bd05839228da005abb192aeda9953f88841aa59f2766`.
- Outcome-blind full-population fidelity gate, Slurm job `22311963`, account
  `pi_jss233`:
  `2351787e84a15f6efb359706c585ec7e31f3cc1217ed354c5c2222a60adc9c1d`.
  All 56 requested families passed, with zero reviews, failures, or warning
  categories. This gate contains no policy outcomes.

No family in this population has been used to evaluate V5. Because every
prospectively cataloged family passed the technical gate, confirmation uses all
56 rather than selecting a favorable subset or retaining discretionary reserves.

## Frozen design

The three simultaneous arms are:

1. exact external Supalosa control;
2. frozen V4 final-building hybrid; and
3. frozen V5 visibility-aware final-building hybrid.

For each of 56 map families and each of all nine supported countries, all three
arms play the exact external Supalosa bot in reciprocal candidate slots with the
same derived engine seed. The design therefore contains:

- 56 map-family clusters;
- 9 countries per family;
- 2 reciprocal slots per country;
- 3 arms per paired cell;
- 504 six-game shards; and
- 3,024 scheduled games.

The maximum duration is 24,000 ticks. The fresh engine-seed base is
`4,216,000,000`; shard index is the paired seed-block index. No retries,
selective extensions, family substitutions, or outcome-dependent reruns are
allowed.

## Power and uncertainty

The open-development paired V5-minus-Supalosa family effects had mean
`0.01388888888888889` and sample standard deviation
`0.035258208823444021`. Treating those ten families only as design evidence,
the planned 56-family one-sample family-level test has approximate power
`0.89880788041509219` at one-sided alpha 0.05 under the observed effect and
variance. This is a planning calculation, not a promised result.

Each family receives equal weight. Within-family score is the mean over the 18
country-slot games for an arm. The paired family effect is V5 score minus exact
Supalosa-control score. The one-sided 95% Student-t critical value at 55 degrees
of freedom is `1.6730339652899118`.

The paper-positive gate is an intersection-union claim and requires both:

1. the one-sided 95% family-level lower confidence bound for paired
   V5-minus-Supalosa score is strictly above zero; and
2. the one-sided 95% family-level lower confidence bound for V5 absolute score
   minus 0.5 is strictly above zero.

Both component nulls must be rejected; testing each component at alpha 0.05 is
valid for the conjunction. V5-minus-V4 is a prespecified secondary mechanism
comparison. Also report, without redefining success, full win/draw/loss counts,
paired outcome transitions, family effects, leave-one-family-out estimates,
country and faction diagnostics, terminal tick distributions, and policy
telemetry. Report the complete result regardless of direction.

## Sealing and unblinding

Shard summaries and stdout may contain only launch accounting, provenance, and
technical status. Outcomes remain confined to private event artifacts. A
fail-closed technical controller must verify all 504 exact plan hashes,
scheduler account and job identities, 3,024 accounted completions, clean source
provenance, literal-endpoint validation availability, and absence of outcome
fields from summaries. It must not compute or print scores, winners, terminal
ticks, or terminal building counts.

Only after every shard passes may one dependent unblinder read the complete
immutable event population. It must bind itself to the campaign hash, technical
gate hash, and result-artifact commitment and write one immutable analysis.

If any shard fails technically, do not inspect any policy outcome and do not
advance on partial evidence. Preserve the failed campaign, diagnose using only
technical artifacts, repair prospectively, and execute a complete replacement
campaign version rather than selectively rerunning outcome-bearing games.

## Interpretation and next action

Passing supports the narrow claim that visibility-aware terminal conversion
reliably improves on exact Supalosa across the frozen fresh-map population. It
does not by itself establish a general paradigm shift. The V4 comparison and
mechanism telemetry must show that the extra wins are consistent with the
unseen-approach-to-visible-attack handoff before attributing the effect to that
mechanism.

Failure means V5 is not the paper result. The next prospective policy must
implement continuous multi-building objective pressure: strike a reachable
building, clear only route-relevant or strike-lethal forces when required, and
return to buildings immediately. It must pass deterministic final-building vs.
irrelevant-army, necessary-blocker, cleared-force-to-free-building, target-focus,
and no-progress-liveness tests before any new open-development outcomes.
