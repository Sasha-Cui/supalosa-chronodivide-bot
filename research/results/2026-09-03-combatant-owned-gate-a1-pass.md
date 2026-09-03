# Combatant-owned lifecycle gate A1: complete pass

The full gate passed in all 40 cases. Every compressed canonical stream was
independently decompressed and replayed, including ownership preparation,
readiness, native callback timing, queued requests and first-transition
attribution. All ten scenario/orientation groups were identical across both
evaluator labels and both deterministic repeats.

## Complete result

| Scenario | Cases passing | Candidate snapshot: physical credit | Legacy snapshot: physical credit |
|---|---:|---:|---:|
| Physical destruction, no rubble | 8 / 8 | 8 | 8 |
| Physical destruction, rubble | 8 / 8 | 8 | 0 |
| Capture | 8 / 8 | 0 | 0 |
| Sale | 8 / 8 | 0 | 0 |
| Unattributed cleanup | 8 / 8 | 0 | 0 |

There was no physical-destruction credit in any of the 24 negative controls.
The two physical scenarios transitioned at updates 2045 or 1977, capture
at 2146 or 2432, sale at 1854, and cleanup at 1801. Both evaluator labels
produced the expected symmetric interpretation of the same world/action
stream. All five smoke streams exactly matched their full-stage counterparts.

This establishes the tested engine bookkeeping mechanism on actual
combatant-owned buildings. It is not a measurement of bot strength or a
frequency estimate for affected historical matches. These are controlled
fixtures with two countries, two coupled start/slot orientations and
deterministic repetitions, not 40 independent population samples.

## Evidence and audit

- Source: 7dc09b2ada90cb896d0de58f18f935d861cbf12c.
- Init: 24647674; five-scenario smoke: 24647675.
- Array: 24647816; finalizer: 24647817.
- All 43 scheduler records: pi_jss233 day, COMPLETED 0:0, zero restarts,
  one allocated CPU per job.
- Aggregate SHA:
  0f8525c2874c8fc99c04ba121687e03c76a1a3a86675b80d95b4af75c79034ba.
- Manifest SHA:
  b5416fccaef433d6d07376c49c51b987b78a11eacf6a7be2020d4ce7c43f1e0f.
- Original protocol SHA:
  874ace6fbf40b6570abe767290641e47732dcb32db6f021cf547ea20da5e43ee.
- Callback amendment SHA:
  90fda84c248a59af8fcaf75bbd26c4de63e3857f390613e93c4092dc12705aaa.

Reproduce the audit with:
node research/scripts/audit-combatant-owned-gate-a1.mjs.

The audit checks every raw case, marker, gzip/plain checksum, asset/runtime
binding and scheduler identity; recomputes every stored gate; and verifies
the full stream chronology, label/repeat invariance, and smoke/full equality.
See [case/job/hash table](2026-09-03-combatant-owned-gate-a1-audit/cases.csv),
[scenario totals](2026-09-03-combatant-owned-gate-a1-audit/scenarios.csv),
[scheduler records](2026-09-03-combatant-owned-gate-a1-audit/scheduler.csv), and
[validation](2026-09-03-combatant-owned-gate-a1-audit/validation.json).

Execution used 606 allocated CPU-seconds across these 43 records. The 40
compressed case streams total 2,730,928 bytes. Raw evidence remains under
research-evidence/live-building-ledger/combatant-owned-gate-v1-callback-a1.

The first failed attempt is preserved separately: init 24647236 and failed
smoke 24647237, including its schema-1 stream and timing failure. Nothing was
overwritten or selectively folded into the completed gate.

## Consequences and boundaries

A separately versioned live-owned endpoint can now be implemented and tested
without altering the legacy endpoint. Fresh complete competitive cohorts
must be prespecified before its use. All prior wins, losses and draws remain
as run; the 633/24/63 HFO result, Peak replication and failed map/Advanced
studies must not be selectively rescored or presented as repaired results.

Source inspection also found that StrongBot.getKnownEnemyUnits/getKnownEnemyBuildings
use the world list without a positive-health filter. This makes corpse
inclusion in policy decisions a plausible additional mechanism. Its actual
effect on tactics or strength is not established by this gate. The next
measurement study freezes policy behavior and records passive diagnostics;
it must not confound endpoint correction with a policy repair.

The paper remains frozen until the relevant fresh empirical evidence and
uncertainty analyses are complete.
