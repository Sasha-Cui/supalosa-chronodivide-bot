# HFO Soviet-west activation-isolation V5 result

Status: **complete traces; frozen gate failed due to an invalid inactive rule**

## Identities

- Zero-update selector: job `23421891`, 129 initialized games, 36 selected
  country/start cells, selection SHA-256
  `14fddae473204b64311e7d77f3d098fe9a8ee9e601cad0ef754e5ddffdd0a823`.
- Trace array: `23422004`, all 36 tasks ran under `pi_jss233`; 31 completed
  `0:0` and five exited `2:0` after writing failed technical cell artifacts.
- Dependent finalizer `23422005` was cancelled without running because the
  array did not satisfy `afterok`.
- Complete 36-cell JSON tree SHA-256:
  `5d36ca1cf626ebe0e6fdcf84fbf9cd5bbe3015ff4fb6348dc1c61f6132b767ec`.
- Source commit:
  `2ae3d4037a4399796dc6bef6d5775778ba176e71`.
- Program SHA-256:
  `01fb7a86fb5d9cd8d21c3e4716a7544a436d8df399a193dca40dd92e3f2b181d`.
- Protocol SHA-256:
  `15f76dcd9ba797834ec2dddfc3e3f7515be07a878c5e5f57d7baab77241b37e0`.

## Technical result

All four expected active cells passed their action-difference,
snapshot-difference, and nonzero guard-anchor requirements:

| Country | Action differs | Snapshot differs | Winner guard-anchor orders |
|---|---|---|---:|
| Libya | Yes | Yes | 7,415 |
| Iraq | Yes | Yes | 5,628 |
| Cuba | Yes | Yes | 11,752 |
| Russia | Yes | Yes | 5,628 |

All 32 expected inactive cells had exact equality between default and winner
for action hash, snapshot hash, observed ticks, engine-finished flag, and
suppressed-resignation counts. Thus the conditional strategy and guard
permission produced no differential behavior outside Soviet west.

Five inactive cells nevertheless failed the frozen rule that the winner arm
must emit zero guard-anchor orders:

| Country | Start | Default guard orders | Winner guard orders | All paired traces equal |
|---|---|---:|---:|---|
| USA | West | 12,332 | 12,332 | Yes |
| Korea | West | 12,332 | 12,332 | Yes |
| France | West | 9,461 | 9,461 | Yes |
| Germany | West | 9,461 | 9,461 | Yes |
| Great Britain | West | 12,332 | 12,332 | Yes |

Those orders are the already deployed Allied-west guard, present identically
in both arms. Requiring their absolute absence was incompatible with the
existing policy and was not a valid test of Soviet-policy leakage.

## Decision and repair

V5 is retained as a failed gate because its prespecified absolute-zero rule did
not pass. It is not retroactively reclassified, and its traces will not be
selectively rerun.

The prospective V6 repair must use fresh seeds and retain the full 9-by-4
matrix. Active Soviet-west cells keep all V5 requirements. Every inactive cell
must retain exact paired trace equality, and the guard-specific check must be
equality of winner and default guard-anchor counts rather than an absolute
zero. Deployment remains prohibited until that corrected gate passes.
