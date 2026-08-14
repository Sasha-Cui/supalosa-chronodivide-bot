# Mission-Native Closeout: Amendment 18

Date: 2026-08-14

Status: **completed outcome-free V16 gate and prospective V17 repair freeze**

## Completed V16 evidence

The continuous-vanguard combined-arms V16 compatibility gate completed as
Slurm job `22233375` under account `pi_jss233`.

- source commit: `ddc9f3f2d61e0517007ba75b3a85e16d55373e61`
- external baseline commit: `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`
- artifact:
  `research-evidence/mission-native-closeout/outcome-blind-compatibility-v16/22233375/compatibility-v16.json`
- artifact SHA-256:
  `1d690c4d51209137583d5e02139b341dd11951474194fd631de310a6640f7841`
- scheduler state: `FAILED`, exit code `1:0`, elapsed `00:08:27`
- peak batch RSS: 449,544 KiB
- artifact status:
  `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V16`
- coverage: 9 countries, 2 reciprocal slots, 4 deterministic games per cell,
  72 games
- outcome inspected: no

The scheduler failure is the gate's intentional fail-closed exit after writing
the complete artifact.

## Outcome-free findings

V16 exposed the intended mechanisms but did not satisfy the technical gate.

- Both side-generic tank requests appeared, with 415 requested-production
  telemetry events across `MTNK` and `HTNK`.
- No main battle tank appeared in any certified activation force.
- Four of 18 cells passed the complete contract: Alliance slot 0, French slot 0,
  and both German slots.
- Twelve cells activated; six Allied cells never reached the complete-route
  certificate before the gate horizon.
- Ten cells caused physical building damage, totaling 3,006.
- Every Soviet cell reached a complete-route certificate and activated, but each
  launch assigned only eight of sixteen certified identifiers. All remaining
  64 identifiers were alive and still assigned elsewhere at the first audit.
- The 12 activation cells recorded 168 expected identifiers, 104 assigned, zero
  destroyed, and 64 alive but unassigned.

The exact 8/16 Soviet split matches the reinforcement reserve: staged units
transferred, while the still-active predecessor vanguard remained associated
with its force-disbanded mission for one controller update. Source inspection
found that forced mission disbanding marks a mission for end-of-update removal
but, unlike self-disbanding, does not clear its unit-ownership map before
same-update specific-unit requests. This is a prospective engineering diagnosis,
not an outcome claim.

The production request path also lacked an infrastructure path. On the simple
infantry compatibility profile, requesting `MTNK` or `HTNK` does not itself
create `GAWEAP` or `NAWEAP`; therefore the request was visible but could not
produce the intended unit during the gate.

V16 is rejected as a complete policy and no outcome-bearing comparison is
authorized.

## Frozen V17 repair

V17 preserves the V16 tactical doctrine, continuous predecessor vanguard,
reinforcement-only reserve, complete-route launch certificate, target ranking,
zero terminal reserve, V14 post-launch all-blocker allocation, and direct
priority for a finishable building. It makes only the two repairs required for
the V16 mechanism to exist as specified.

1. **Prospective forced-disband ownership repair.** When the mission controller
   processes a force-disband request, clear the affected mission's live unit
   ownership entries before resolving same-update specific-unit requests. This
   makes forced disband semantics match self-disband semantics and allows the
   new closeout mission to claim the certified vanguard in the first handoff
   update. The removed mission still ends at the existing end-of-update point.
2. **Side-generic assault infrastructure.** While low-building closeout scope is
   live and the side has no visible war factory, request and place `GAWEAP` for
   Allied or `NAWEAP` for Soviet at the existing adaptive tech priority. Once a
   factory exists, retain the V16 request for `MTNK` or `HTNK` up to the frozen
   four-unit ceiling.
3. Emit separate schema-versioned infrastructure telemetry recording side,
   structure name, current count, availability, and whether a placement request
   was issued. V16 production telemetry remains unchanged.
4. Bump the exact policy schema to V17 with an enabled assault-infrastructure
   field. No target count, production priority, activation inequality, country
   exception, map coordinate, deadline, or post-launch micro rule changes.

## V17 outcome-free gate

The fresh V17 gate uses a disjoint seed base, all nine countries, both reciprocal
slots, and four deterministic games per cell. It retains every V16 check and
additionally requires:

- a deterministic pure controller test showing that a force-disbanded locked
  donor releases ownership before a higher-priority same-update request;
- both `GAWEAP` and `NAWEAP` infrastructure paths somewhere in their eligible
  country strata;
- at least one acquired `MTNK` and one acquired `HTNK` in certified activation
  telemetry across their respective strata;
- exact assignment or destruction of every certified launch identifier in all
  18 cells; and
- physical building damage in all 18 cells.

No win, loss, draw, score, terminal tick, or opponent-outcome field is inspected
or serialized. Failure of any cell invalidates the complete gate and returns the
method to prospective engineering; a pass authorizes only a fresh open-development
comparison.
