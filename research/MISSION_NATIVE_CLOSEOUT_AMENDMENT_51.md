# Mission-Native Closeout: Amendment 51

Date: 2026-08-15

Status: **V36-R2 invalid without outcome access; prospective V37 active-ownership lease**

## Preserved V36-R2 disposition

V36-R2 ran once as outcome-blind Slurm array `22271867` under account
`pi_jss233`, from clean tracked `main` source
`5e94e7c0e116816f3a81111186c04d3e60655ffd`. Its fail-closed `afterok`
controller was `22271888`.

All 18 planned country-by-reciprocal-slot tasks reached a terminal scheduler
state. Tasks 12 through 17 completed with exit `0:0`; tasks 0 through 11 failed
with exit `1:0`. Controller `22271888` was cancelled without running because
the array did not satisfy its dependency. No complete-population aggregate or
advancement authorization exists.

Tasks 0 through 9 observed an engine finish between diagnostic ticks 6,196 and
6,436, before the frozen 7,200-tick cap, and therefore failed under the R2
technical rule. Tasks 10 and 11 reached a progress fallback for which sampled
telemetry contained neither a unit-owning predecessor mission nor the required
bounded no-owner recovery. Their validators failed before writing cell
artifacts.

No winner, score, terminal building count, or competitive outcome was
serialized or inspected. The complete invalid disposition and all task logs are
preserved under `research-evidence/mission-native-closeout/
v36-no-owner-exposure-v2/`. V36-R2 provides no performance evidence.

## Failure mechanism and uncertainty

Source inspection establishes a contract defect. V36 sets a permanent boolean
after any predecessor mission owns at least one unit during the fallback. Once
that boolean is set, no-owner recovery remains disabled even if the predecessor
immediately loses all units. Ownership is reported only by a throttled
fallback heartbeat, so a short ownership interval can set the internal latch
without appearing in the recorded heartbeat sample.

The failed R2 artifacts do not preserve the two affected telemetry traces.
Consequently they cannot distinguish a transient unrecorded owner from another
live integration fault. This amendment does not convert that ambiguity into a
claim. It removes both failure modes prospectively by making active ownership,
not historical ownership, the recovery condition and by recording ownership
transitions immediately.

## Frozen V37 policy change

V37 retains V36's building and blocker progress deadlines, 180-tick predecessor
fallback, 120-tick ownership grace period, objective-race allocation, and every
other policy field. It adds one boolean policy field:

`recoverAfterPredecessorOwnershipLoss: true`

For a fallback starting at tick \(t_0\), let \(g=120\) and let \(A_t\) be the
set of unit-owning preemptible predecessor missions at update tick \(t\). V37
uses the following rule:

1. For \(t<t_0+g\), continue the ordinary fallback and observe ownership.
2. For \(t\ge t_0+g\), if \(A_t\ne\varnothing\), leave current predecessor
   control in place.
3. For \(t\ge t_0+g\), if \(A_t=\varnothing\), end the fallback immediately,
   clear the stale fallback state, and replan during the same update.
4. Historical ownership does not veto step 3. If an owner existed and then
   disappeared, recovery occurs on the first subsequent controller update.

V35 and V36 retain their original behavior because the new field defaults to
false. V37 is a new policy identity rather than a semantic rewrite of V36.

## Sealed technical telemetry

When V37 observes the first nonempty \(A_t\), it emits one immediate ownership
transition record containing the fallback start, observation tick, active
mission names, released unit IDs, and planned fallback boundary. This record is
not heartbeat-throttled. A recovery record must identify whether ownership was
ever observed, contain an empty current owner set, and occur no earlier than
the grace boundary and before the ordinary 180-tick replan boundary.

The outcome-blind trace interface also records:

- the last updated tick;
- whether the engine finish predicate was observed; and
- the tick at which that predicate was first observed.

It must not query or serialize the winner, participant score, terminal building
counts, defeat cause, or any other competitive outcome. Under the next
diagnostic, an engine finish is a censoring boundary for technical telemetry,
not a policy success or failure. This replaces R2's unusable early-finish rule
prospectively; it does not retroactively validate R2.

Every R3 validation error must still write a fail-marked outcome-free artifact
before its task exits nonzero, so a technical failure remains diagnosable.

## Frozen V37-R1 exposure diagnostic

The first V37 live exposure diagnostic will:

1. use fresh seed interval `4_294_930_000` through `4_294_930_017`;
2. retain all nine countries, both reciprocal candidate slots, deterministic
   same-seed repeats, and the exact direct-versus-disabled control;
3. retain a maximum horizon of 7,200 ticks while truncating only at the first
   outcome-free engine-finish predicate;
4. validate each fallback against the trace's actual observed boundary;
5. require immediate, non-throttled accounting of every first predecessor-
   ownership observation;
6. require at least one live V37 recovery after a previously observed owner has
   disappeared;
7. reconcile all 18 scheduler tasks, source and policy identities, launch
   counts, artifacts, failures, and forbidden outcome fields in one fail-closed
   controller; and
8. authorize broader compatibility testing only if every cell passes and the
   complete population satisfies step 6.

Cap-truncated fallback intervals remain explicitly counted and cannot be called
recoveries. If no live ownership-loss recovery occurs, V37-R1 fails its
mechanism-exposure objective and competitive evaluation remains blocked.

## Claim boundary

V37 is a prospective liveness repair motivated by technical evidence and the
literal building-destruction objective. It is not evidence of more wins, fewer
draws, faster closeout, or superiority over Supalosa. Those claims require a
subsequent complete open-development comparison and fresh confirmation.
