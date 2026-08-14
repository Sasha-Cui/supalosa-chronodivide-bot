# Persistent additive objective completion: prospective amendment 2

Status: **frozen before compatibility-v3 and before any outcome-bearing launch**  
Frozen: 2026-08-14 UTC

Compatibility-v2 job `22189716` ran on clean main commit `29741da` under
`pi_jss233` and failed after 46 seconds with exit `1:0`. The strict gate found
no physical enemy-building damage in the first enabled `Americans`, slot-1
trace. The job recorded no winner, score, endpoint, terminal aggregate, policy
ranking, compatibility JSON, or completion marker. Its zero-byte stdout and
562-byte stderr are preserved under
`research-evidence/persistent-objective/outcome-blind-compatibility-v2/22189716`.

The damage requirement behaved correctly, but throwing at the first failed cell
discarded the outcome-free per-type diagnostics needed to distinguish travel,
selection, mission-lock, rejection, or order-liveness failure. Compatibility-v3
therefore changes failure handling only:

- use a fresh seed block beginning at `4260000000` and a new exclusive root;
- complete the fixed 72-run allocation unless a simulation itself terminates
  early or fails technically;
- collect validation errors per country-slot and per deterministic repeat;
- always write the complete outcome-free summaries before returning a failed
  process status; and
- authorize an outcome-bearing screen only if every row passes.

The policy, map, countries, slots, tick cap, direct and disabled controls,
enabled smoke policy, physical-damage requirement, and all other checks remain
unchanged. A failed compatibility-v3 artifact may guide a prospective technical
or policy repair on open interfaces, but never supplies a performance result.
