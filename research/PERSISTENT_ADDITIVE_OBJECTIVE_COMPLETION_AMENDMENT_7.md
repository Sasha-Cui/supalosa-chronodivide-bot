# Persistent additive objective completion: prospective amendment 7

Status: **frozen before policy-v6 compatibility and before any outcome-bearing launch**  
Frozen: 2026-08-14 UTC

## Compatibility-v7 launch audit and complete outcome-free evidence

Jobs `22192030` and `22192068` failed before the first simulation because the
proposed seed base `4,300,000,000` exceeded the engine's unsigned 32-bit maximum.
The first failure occurred before log redirection; the second preserved the
exact range error after preflight logging was repaired. The unused valid seed
base `3,900,000,000` was then frozen prospectively. Both zero-simulation job IDs
remain part of the launch audit.

Compatibility-v7 job `22192102` completed all 72 fixed-tick runs under
`pi_jss233` on clean main commit
`8117159bdd54e51a13197592a6d1204e7371635e`. It returned exit `1:0` after
preserving the complete outcome-free artifact with SHA-256
`e4c930139a57197593b929ed5ed1e4073cba340652dfc1c487c212f871ea9cdd`.
No winner, score, endpoint, terminal aggregate, or policy-performance outcome
was recorded or inspected.

Both completion-race branches were exercised and every numeric certificate
passed validation. Twelve of 18 country-slot cells physically damaged a
building, for 2,070 total building hit points. Six cells failed: Americans slot
0, French slot 1, both British slots, Arabs slot 1, and Russians slot 1. The
last two never issued a building-directed action within the fixed horizon.
Across the audit, 2,875 completion-race blocker decisions and 11,073 blocker hit
points greatly exceeded 156 race-based force bypass decisions.

The estimator treated every relevant corridor threat as if it applied damage
at the current tick. Failed cells therefore received survival estimates as low
as a fraction of a tick even when the threat was still distant. This is a
structural pessimism in the interception clock, not evidence that another force
cap is needed.

## Prospective policy-v6 correction

Policy v6 retains the completion race but adds time to interception:

1. Use each unit's public rules speed (`speed / 256` tiles per tick), with the
   existing conservative 1/15-tile fallback only when speed is unavailable.
2. Estimate selected-attacker approach time to building firing range from its
   current distance and speed.
3. For each mutually damage-capable corridor threat, estimate the earliest time
   it can close to a damaging weapon range using the sum of public attacker and
   threat speeds.
4. Exclude a route threat from the current building race when its earliest
   interception is no earlier than estimated building completion.
5. Compute detachment destruction time piecewise: threat damage begins only at
   its estimated interception tick, and active damage rates accumulate as more
   threats arrive.
6. Attack the building when its estimated completion is no later than this
   piecewise destruction time. Otherwise clear the removable relevant threat
   with the highest damage-removal score discounted by interception delay.

As before, an in-range building is attacked immediately, undefined threat
damage implies infinite survival, and undefined building damage fails closed.
Off-route forces remain irrelevant. All policy components other than the race's
travel clock remain unchanged.

Policy v6 requires a distinct exact schema and canonical hash. Compatibility-v8
must use fresh valid seeds and an exclusive root, preserve all prior checks,
record earliest relevant interception time, exercise both branches, and require
physical enemy-building damage in all 18 country-slot cells. No outcome-bearing
screen is authorized unless compatibility-v8 passes.
