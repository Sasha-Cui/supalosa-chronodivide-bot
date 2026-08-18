# Stagnation-assault compatibility runtime repair, amendment 1

Status: **prospectively frozen before any repaired-gate simulator creation**

Compatibility jobs `22618195` and `22618234` failed after three seconds under
`pi_jss233`. The captured stack trace for `22618234` is
`API is not initialized. Call init() first.` from `getAvailableGameModes`.
Neither job reached `withSeededOfflineGame` or created a simulator game. No
winner, score, endpoint state, or gameplay outcome exists for either attempt.

The exact repair is to call `cdapi.init` once with the already frozen driver data
directory after all source/map/provenance preconditions pass and before loading
the first game mode. No country, slot, repeat, map, seed, horizon, policy,
telemetry validator, pass criterion, or information boundary changes.

The repaired gate must use a new exclusive evidence root and record its new
program hash and Slurm job ID. The failed attempts and logs remain immutable.
