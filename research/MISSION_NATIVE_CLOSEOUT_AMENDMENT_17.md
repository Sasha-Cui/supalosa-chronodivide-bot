# Mission-Native Closeout: Amendment 17

Date: 2026-08-14

Status: **completed outcome-free V15 gate and prospective V16 freeze**

## Completed V15 evidence

The contact-triggered V15 compatibility gate completed as Slurm job `22232900`
under account `pi_jss233`.

- source commit: `0141dfd2fe28756329565cab7bc8156da2c4ca65`
- external baseline commit: `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`
- artifact:
  `research-evidence/mission-native-closeout/outcome-blind-compatibility-v15/22232900/compatibility-v15.json`
- artifact SHA-256:
  `cb817845a8d8029e752f8f006379899a35ab8157c132d3596371add46a6860d5`
- scheduler state: `FAILED`, exit code `1:0`, elapsed `00:07:15`
- artifact status:
  `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V15`
- coverage: 9 countries, 2 reciprocal slots, 4 deterministic games per cell,
  72 games
- global validation errors: none
- outcome inspected: no

The scheduler failure is the gate's intentional fail-closed exit after writing
the complete artifact.

## Outcome-free findings

All 18 country-slot cells activated and every staged identifier reconciled at
handoff. Only 5/18 cells caused physical building damage and passed the complete
technical contract. Aggregate physical building damage was 2,399. The controller
made 260 objective-advance decisions but 1,700 contact-clear decisions; in the
13 zero-damage cells, an opposing infantry unit was normally already able to
intercept at zero ticks, so the contact rule remained in force-clearance almost
continuously.

Launch telemetry separates the passing and failing cells without inspecting a
game outcome. Every passing activation had estimated complete-route clearance
no slower than estimated strike-force survival. Every failing activation did
not. Typical failed Allied cells launched five infantry against ten route
threats with route-clearance estimate 404 and survival estimate 188. Typical
failed Soviet cells launched twelve infantry against eighteen route threats
with route-clearance estimate 350 and survival estimate 265. The passing Allied
cells launched ten infantry against six threats (251 versus 338); the passing
Soviet cells launched seventeen attackers against fourteen threats (202 versus
345). Most failed cells never acquired a vehicle during the observed execution;
occasional vehicles appeared only much later.

V15 therefore rejects spatial contact as the missing causal mechanism. The
remaining problem is force assembly: the first-blocker certificate launches a
fragile infantry group that can remove one enemy but cannot convert the whole
route into building damage. No outcome-bearing comparison is authorized.

## Tactical invariant

The literal endpoint is destruction of every enemy building. Enemy armed forces
are instrumental obstacles, not an alternative victory condition.

1. If all relevant forces must be removed before a building can be reached or a
   strike can survive, remove them and then destroy the now-unprotected
   buildings.
2. If a building can be destroyed sooner than relevant forces can stop the
   strike, attack the building directly.
3. When exactly one enemy building remains, a feasible strike on that building
   has lexicographic priority even if 100 off-route enemy tanks remain. Destroying
   the last building ends the game; fighting irrelevant tanks does not.
4. Persistent offense means physical progress under a live combat policy, not
   repeated issuance of an attack label.

These rules restate the previously frozen research doctrine; they do not claim
that V16 will improve win probability.

## Frozen V16 mechanism: continuous-vanguard combined-arms readiness

V16 returns to V14's post-launch committed all-blocker allocation and rejects
V15's contact-only rule. It changes pre-launch force assembly as one coherent
mechanism:

1. When the low-building closeout scope is first reached but the complete route
   is not yet certified, preserve the units already assigned to transferable
   predecessor attack missions as an active vanguard. Do not pull them back to
   the start location.
2. Stage only later compatible reinforcements in the existing mission-owned
   readiness reserve. Ordinary Supalosa attack behavior therefore remains live
   while the closeout force grows.
3. While the closeout scope remains live, request the side-generic main battle
   tank (`MTNK` for Allied, `HTNK` for Soviet) at the existing adaptive
   production priority, up to four visible tanks. Four is a frozen small
   platoon-sized production ceiling, not a minimum launch count. The route
   certificate, rather than a country-specific count, decides launch.
4. Evaluate the same public complete-route clearance and force-survival
   quantities over the union of transfer-certified vanguard units and staged
   reinforcements. Launch immediately if no route blocker exists or estimated
   complete-route clearance is no slower than estimated force survival.
5. At launch, release the readiness reserve, preempt only the declared
   predecessor attack missions, and audit every compatible identifier in the
   certified launch set as assigned, destroyed during handoff, or an error.
6. After launch, retain V14 target commitment, zero reserve, phase-pure
   all-blocker clearance, and immediate building attack whenever the building is
   in range, has no route threat, or wins the completion race.
7. No country, reciprocal slot, target identity, map coordinate, outcome-derived
   exception, elapsed launch deadline, or test-family state enters the policy.

The intended causal contrast is not "tanks are always better." It is whether an
actively fighting predecessor plus side-generic durable reinforcement can satisfy
the already validated complete-route certificate and turn takeover into physical
building damage across all supported countries.

## V16 outcome-free gate

The fresh V16 gate uses new seeds, all nine countries, reciprocal slots, and four
deterministic games per cell. Before any outcome access it must establish:

- exact disabled-overlay trace identity with the pinned external Supalosa bot;
- deterministic enabled repeats and exact source/runtime/baseline provenance;
- production requests for both `MTNK` and `HTNK` somewhere in their eligible
  country strata, with no country-specific policy branch;
- a live predecessor vanguard and reinforcement-only staging before takeover;
- activation in all 18 country-slot cells only on building readiness or the
  complete-route clearance certificate;
- identifier-complete launch handoff in all 18 cells;
- actionable legal orders, building-perimeter approach, and physical building
  damage in all 18 cells; and
- preservation of the final-building direct-strike tests, including 100
  irrelevant enemy tanks.

The gate serializes no win, loss, draw, score, terminal tick, or opponent-outcome
field. Any missing cell, production-path mismatch, handoff error, nondeterminism,
or zero-damage cell fails the complete gate. A pass authorizes only a fresh
open-development causal comparison; it does not authorize confirmatory access or
a paper claim.
