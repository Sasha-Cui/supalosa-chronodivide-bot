# Persistent additive objective completion: prospective amendment 9

Status: **frozen before policy-v8 compatibility and before any outcome-bearing launch**  
Frozen: 2026-08-14 UTC

## Complete outcome-free compatibility-v9 evidence

Compatibility-v9 job `22197542` completed all 72 fixed-tick runs under
`pi_jss233` on clean main commit
`587301fe934214487f728320c5df7a0d6733170e`. It returned exit `1:0` after
preserving the complete outcome-free artifact with SHA-256
`da7b5ffbb1f1ab7a40dd8f61cd10de8b42581ac60e787641dd08623a2fbdb537`.
No winner, score, endpoint, terminal aggregate, or policy-performance outcome
was recorded or inspected.

The gate exercised four target types and both the blocker and building-bypass
branches, but only eight of 18 country-slot cells physically damaged a
building. Ten failed. In those cells the controller accumulated 11,345 blocker
hit points across the complete population while producing zero building damage.
Five failed Soviet cells never issued a building-directed order. Failed Allied
cells remained committed to `GAPOWR`; failed Soviet cells remained committed to
`NAHAND`. The controller repeatedly made local blocker progress without testing
a different building mission.

This reveals a liveness defect independent of the complete-mission cost model.
The frozen protocol says that expiry or stall clears a stale commitment and
replans, but the implementation's fallback cleared only the lease and blocker.
It retained the building commitment. The compatibility smoke policy also
overrode the ordinary 1,800-tick lease with 20,000 ticks, so the 5,400-tick gate
could not exercise bounded mission rotation.

## Prospective policy-v8 correction

Policy v8 changes only multi-building liveness:

1. On a building-route stall without a usable blocker, a blocker-clear stall,
   or a full lease window with no physical damage to the committed building,
   record that building as the one temporarily avoided target, clear the target
   and blocker commitments, return the lease to exact Supalosa for the frozen
   cooldown, and replan.
2. When at least one other finite building mission exists, select the best
   complete-mission-cost target other than the temporarily avoided target. If
   no alternative is feasible, retry the avoided target rather than idle.
3. If the current target receives physical building damage during a lease
   window, renew the bounded lease window instead of rotating merely because
   time elapsed.
4. When a committed building is destroyed, clear the avoidance record. If a
   different target later stalls, it becomes the sole avoided target, allowing
   deterministic cycling without a permanent blacklist.
5. At exactly one remaining enemy building, ignore rotation and preserve the
   lexicographically dominant full-force terminal attack.

All target-cost calculations, force-versus-building race rules, detachment
caps, reserves, home protection, progress deadlines, and the exact external
Supalosa core remain unchanged. Policy v8 requires a distinct exact schema and
canonical hash.

Compatibility-v10 must use fresh valid seeds and a new exclusive root. It must
restore the default bounded lease, preserve all prior outcome-free checks,
prove deterministic rotation from a blocked target to a feasible alternative,
exercise at least two live target types, and require physical building damage
in all 18 country-slot cells. No outcome-bearing screen is authorized unless
compatibility-v10 passes.
