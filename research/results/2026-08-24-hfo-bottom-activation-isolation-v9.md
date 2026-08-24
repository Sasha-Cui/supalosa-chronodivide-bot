# HFO bottom activation-isolation V9 result

Status: **complete; gate failed active-action exposure**

## Identities

- Zero-update selector: job `23400237`, 120 initialized games, 36 selected
  country/start cells, selection SHA-256
  `eb9fe29049296c7d16620e063ac6fb1944198a88d3f7e7a01d8c5bc30ac9ce2c`.
- Trace array: `23400681`, 32 cells completed `0:0` and three deliberate
  gate failures completed `2:0`; no retries or replacements.
- Original afterok finalizer `23400740` was cancelled by the failed cells.
- Failure-preserving finalizer: job `23402653`, completed `0:0`.
- Aggregate SHA-256:
  `21e4b44d646b8e23a1a5076a6799b8695a5b3c5178723abaeff93381ae5806be`.
- Cell source commit:
  `8331174f6e8845e2a7e162fb227599c399bf59c0`.
- Cell program SHA-256:
  `8a8704a678425df905caafd2b43da72d40d19f3aed0ee6e10a2e388052c9c2a4`.
- Reducer program SHA-256:
  `c9cbfc0fe4d0bbe5bac0181e414eb5171429614013dfd41cc330b29d3ee4813c`.
- Protocol SHA-256:
  `b9c98440c1f404f86757641877c88edd0fa9e55c64b97f98d774f755161632e2`.

## Results

All 27 expected-inactive cells passed exact equality for normalized actions,
own-state and production snapshots, observed ticks, engine-finished state, and
quit-suppression counts. The exposure-enabled activation flag remained false
in every inactive cell.

All nine expected-active bottom cells had:

- disabled activation flag false; and
- exposure-enabled activation flag true.

Six active cells also had different action hashes and passed. Three active
cells failed only the action-difference requirement:

| Task | Country | Disabled actions | Enabled actions | Activated |
|---:|---|---:|---:|---|
| 11 | France | 16,533 | 16,533 | Yes |
| 15 | Germany | 12,753 | 12,753 | Yes |
| 19 | Great Britain | 11,416 | 11,416 | Yes |

Both arms ran the complete 24,000 ticks without engine termination in these
cells. Their action and snapshot traces were exactly equal despite the enabled
controller setting its activation flag.

## Decision

The aggregate status is
`FAIL_HFO_BOTTOM_RETARGET_ACTIVATION_ISOLATION`. The bottom policy remains
disabled by default.

V9 proves the intended inactive boundary across all countries and non-bottom
starts, but its technical exposure horizon was insufficient to demonstrate a
distinct retarget order for three active Allied cases. V10 uses fresh seeds and
extends every trace to 36,000 ticks. No V9 cell is selectively rerun.
