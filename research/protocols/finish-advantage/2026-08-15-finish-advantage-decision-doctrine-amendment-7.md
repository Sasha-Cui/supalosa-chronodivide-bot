# Finish-Advantage Decision Doctrine Amendment 7

Date: 2026-08-15

Status: **prospectively frozen before any finish-advantage competitive outcome and while the repaired V5 confirmation remains blinded**

## Problem

The staged multi-building finisher estimated destruction time as the slowest
compatible unit's travel time plus target hit points divided by the sum of all
compatible damage rates. This makes a distant slow unit delay credit for damage
that nearer units can begin immediately. It can turn an immediately feasible
building strike into a false fallback or blocker-clear decision.

The same staged code treated any route-local force capable of nonzero ordinary
damage as a blocker as soon as it could intercept. That is not the stated
doctrine. A force is a causal blocker only when the relevant forces can collapse
the strike detachment before the detachment completes the building objective.

Both defects are visible from source and endpoint logic. No competitive outcome
was used to identify them.

## Staggered-arrival completion certificate

For a target with positive hit points \(H\), let each compatible attacker
\(i\) have a nonnegative arrival time \(a_i\) and positive constant ordinary
damage rate \(d_i\). The certified idealized completion time is the earliest
finite \(T\) satisfying

\[
\sum_i d_i\max(0,T-a_i)\ge H.
\]

Compute it exactly by sorting arrival events, accumulating active damage rate,
and integrating damage between consecutive arrivals. Units arriving after the
earliest completion time are excluded from the objective detachment. Equal
arrival times are processed as one deterministic group; identifiers break
remaining ties.

This certificate is still conservative with respect to path and mechanic
calibration supplied by the compatibility layer, but it no longer waits for a
unit that contributes no damage before destruction.

## Causal route-blocker certificate

For ordinary calibrated route threats, calculate a conservative collective
strike-collapse time with the same staggered-arrival integrator:

- each threat's arrival is its earliest route-interception time;
- its damage rate is the maximum ordinary rate it can apply to any member of
  the selected strike detachment; and
- target hit points are the sum of the selected detachment's current hit
  points.

The aggregate intentionally favors the threat: it assumes all participating
threat damage is continuously useful against a pooled strike-health budget. If
even that optimistic enemy collapse time is later than the building completion
time plus the frozen safety margin, the forces cannot be certified as causal
blockers and must not interrupt the building strike. If collapse occurs no
later than the objective deadline, only threats participating before that
collapse time are blocker candidates.

Special or uncalibrated route-local threats remain a separate fail-closed case;
this amendment does not silently classify them as harmless. Off-route forces
remain irrelevant regardless of total army size.

## Required tests

Before competitive launch, deterministic tests must prove that:

1. a near unit can finish before a distant high-damage unit arrives, and the
   distant unit is excluded from the detachment;
2. several arrival waves integrate damage correctly;
3. invalid, duplicate, non-finite, zero-damage, or nonpositive-hit-point input
   fails closed;
4. one weak route force that intercepts early but cannot collapse the strike
   before building destruction does not trigger force combat;
5. several individually weak threats that collectively collapse the strike do
   trigger blocker handling; and
6. the existing lethal-blocker and one-building-versus-remote-army behaviors
   remain unchanged.

This amendment changes no active sealed job and authorizes no paper claim.
