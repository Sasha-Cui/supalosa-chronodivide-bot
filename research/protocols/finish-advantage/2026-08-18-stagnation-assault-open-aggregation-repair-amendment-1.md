# Stagnation-assault open-screen aggregation repair, amendment 1

Status: **prospectively frozen before repaired aggregation and without manual outcome inspection**

The complete fresh open-screen array `22619156` finished all 90 tasks and all
900 games successfully under `pi_jss233`. Controller `22619157` then validated
the campaign and loaded the complete population, but failed before writing an
analysis artifact with:

`Open causal-screen arm identity mismatch: expected visibility_aware_final_building_v5, received unchanged_v5`

The stagnation campaign deliberately names the unchanged V5 comparator
`unchanged_v5`. The borrowed generic paired-comparison helper retains the older
finish-advantage campaign's label assertion. The policies and rows are otherwise
the intended paired comparator.

## Exact repair

For the call to the borrowed V5 comparison helper only, make a non-mutating copy
of the unchanged-V5 rows whose `armId` is the helper's historical alias
`visibility_aware_final_building_v5`. Do not alter family, country, slot,
outcome, draw classification, policy, seed, or any stored shard artifact. Keep
the original `unchanged_v5` rows and label for absolute summaries and the final
artifact.

Because the campaign source is already frozen, a repaired finalizer may run from
a later clean pushed `main` only when all of these exact bindings hold:

- campaign SHA-256 `c33ae1474ac7251b506d7d8125b71e711a3a1a5d142802bb28d61696f2a19e17`;
- campaign source commit `78fc074581f69262604c6e2f555eb09955215268`;
- complete array `22619156` with exactly 90 successful tasks;
- original failed controller `22619157`;
- this amendment's exact SHA-256; and
- a new exclusive repaired-finalizer evidence root.

The repaired finalizer records its aggregator commit, repair hash, and repaired
controller job ID. It must retain every existing campaign, scheduler, runtime,
map, endpoint, telemetry, artifact-hash, complete-population, uncertainty, and
selection check. No game is rerun and no eligibility rule changes.
