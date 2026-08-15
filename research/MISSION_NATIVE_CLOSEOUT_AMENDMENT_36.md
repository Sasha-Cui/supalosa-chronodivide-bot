# Mission-Native Closeout: Amendment 36

Date: 2026-08-15

Status: **V35 open-development technical failure; prospective V36 no-owner recovery freeze**

## Preserved V35 campaign disposition

The frozen V35 open-development campaign launched all 540 scheduled games in
90 family-country shards under Slurm account `pi_jss233`. Every shard completed
with exit `0:0`, all 90 summaries exist, and no shard stderr file is nonempty.
The games are preserved and are not rerun.

The original dependent controller, job `22267947`, was cancelled while still
pending because a pre-unblinding audit found that its intervention-exposure
gate was weaker than the frozen protocol. Corrected controller job `22268863`
failed before analysis on an event-sequencing validator defect. After that
defect was repaired, controller job `22268924` failed before analysis on a real
protocol violation: at least one V35 deadline fallback released its force,
suspended the overlay, and replanned at the exact 180-tick boundary, but no
unit-owning Supalosa predecessor attack mission appeared during the interval.

The frozen protocol requires predecessor ownership for every V35 fallback.
Therefore this campaign is technically invalid. Neither corrected controller
created a technical-gate artifact or an open-development analysis artifact.
No win, loss, draw, score, terminal tick, or other competitive outcome was
inspected. The sealed confirmatory population remains unauthorized.

The immutable disposition record is:

- `research-evidence/mission-native-closeout/open-development-v1/campaign-0b2b612-v1/results/campaign-invalid-no-outcome-access.txt`
- SHA-256: `9d820f9b77415964e5a2470ec02f3de6faa65d379ba7cf4fcf5d0c4b24997c72`

## Failure interpretation

The failed fallback is a controller-liveness defect, not evidence about
competitive performance. Suspending the closeout layer for a fixed interval is
useful only when Supalosa actually takes control and continues combat. If no
predecessor mission owns the released units, the controller has converted a
stalled objective attack into bounded passive waiting. Replanning only at the
end of the full fallback interval violates the intended continuous-offense
doctrine even though the interval is finite.

## V36 no-owner recovery contract

V36 inherits V35's building and blocker no-progress deadlines unchanged. It
adds one causal mechanism: a fallback must either establish predecessor attack
ownership or end early and replan.

1. On a physical no-progress deadline, release the overlay force, clear stale
   target and blocker commitments, and suspend all closeout overlay missions.
2. Give the unchanged Supalosa predecessor a bounded ownership grace interval.
   Predecessor ownership means that a preemptible Supalosa attack or retreat
   mission owns at least one combat unit; an empty mission name is insufficient.
3. If predecessor ownership occurs, retain the existing bounded fallback and
   replan no later than its frozen outer boundary.
4. If no predecessor ownership occurs by the grace boundary, emit an explicit
   `fallback_no_predecessor_replan` event, clear the fallback immediately, and
   evaluate a fresh building, minimum-blocker, search, capability, or bounded-
   defense action on that same controller update. Do not wait out the unused
   remainder of the fallback interval.
5. A no-owner recovery may not recreate the same stale commitment without a
   change in target feasibility, blocker identity, physical progress state, or
   assigned force. Repeated no-owner recoveries are counted and bounded by the
   compatibility gate.

This amendment does not define continuous offense as indiscriminate fighting.
The literal objective remains destruction of every enemy building. The policy
compares the direct building mission with the minimum blocker-then-building
mission. Clearing the enemy army is preferred only when it is necessary for the
strike or makes subsequent building destruction faster or feasible. With one
reachable enemy building remaining, a feasible lethal building strike has
lexicographic priority even if a much larger off-route army survives.

## Required outcome-blind evidence

Before a fresh outcome-bearing screen, V36 must pass deterministic and live
tests establishing:

- unchanged disabled behavior and unchanged V34/V35 behavior;
- exact building and blocker deadline timing;
- overlay-force release and overlay suspension;
- the ordinary predecessor-owned fallback path;
- the no-predecessor grace expiry and same-update replan path;
- no passive interval after a no-owner recovery;
- deterministic terminal-building priority with 100 irrelevant tanks;
- minimum blocker clearance when the same force truly prevents the strike;
- all-nine-country and reciprocal-slot exposure; and
- no outcome fields in compatibility artifacts.

The full-population gate must accept only episodes in which every V36 fallback
either demonstrates correlated predecessor ownership or demonstrates the exact
bounded no-owner recovery and immediate replan. Aggregate exposure elsewhere
cannot rescue a missing country-slot cell.

## Fresh evaluation boundary

V35 outcomes remain unopened permanently. V36 selection returns to the same
permanently open development families with a newly frozen protocol, unused
fresh paired seeds, reciprocal starts, all nine countries, and exact Supalosa
control. V34 remains the no-deadline mechanism baseline; V35 is not reused as
an outcome arm because its technical contract failed in the preserved
population. No sealed confirmatory identity may be read unless the fresh V36
campaign passes its complete technical gate and prespecified positive
competitive signal.

This amendment is a prospective implementation and evaluation specification,
not evidence that V36 reduces draws or beats Supalosa.
