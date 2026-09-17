# OD1 selector publication failure — execution V1

Date: 2026-09-17. This is a technical failure, not a competitive result.

## Preserved execution

- Source: `468dae122744505a7c46e3de1b0d13c4fa15d13a`.
- Selector: `26516850`, pi_jss233/day, one CPU, 2,450 seconds,
  `FAILED 1:0`, zero restarts.
- Root: `research-evidence/unified-intent-arbiter-v2/od1/execution-v1/manifest`.
- Both the submission intent and receipt remain intact.
- There is no published `record.json` or valid final completion line.
  The file named `COMPLETE` contains the preserved launch journal only.

## Diagnosis and exact accounting

The journal contains exactly the 905 prespecified, unique zero-update
initializations and matches the failed runner's launch list byte-for-byte
after parsing. No advancing episode, canary, smoke, or competitive game ran.

The failure location is the post-loop `technicalOnly(artifact)` call at
runner line 154. Reaching it requires all 905 awaited zero-update callbacks,
country checks, and start checks to have returned successfully. This is
control-flow evidence, **not a substitute for the unpublished observations
or a valid selector manifest**; execution V1 does not pass.

The seed-registration metadata used keys `inventoryRoot` and
`inventoryAfterUtc`. The general safety checker rejects keys containing
`inventory` to prevent game-unit inventory leakage. Applying that checker to
these filesystem metadata keys reproduces the exact stored error-message
hash. The prohibition is correct for game data; the metadata field names and
the absence of an early complete-envelope check were integration errors.

## Integrity

- Failure SHA-256:
  `ca726a89c6dcd00635f4eae458aafb53ea6d1fd7f9354b254860b4979aef4a2b`.
- Launch-journal SHA-256:
  `9dd5fe87d5e08e15884a0821dc8a1b41fa6f0578cb6fc7eae9a5a6854b54b9c6`.
- Error-message SHA-256:
  `8de3e390fe7c55ce5d60ca38d5acc80a0b1a719bc4941e5adfec892c0eba17b2`.
- Independent audit:
  `research-evidence/unified-intent-arbiter-v2/od1/selector-failure-audit-v1.json`.
- Audit SHA-256:
  `04a7ab8f3c9ce8ceecbacc818e1d38d7ab35453b9318b57756a230d3ad85b7b3`.

## Decision

Abandon execution V1 without advancing it, reconstructing a success marker,
deleting receipts, or selectively repeating cases. Preserve all original
artifacts and unused competitive identities. A prospective A1 protocol will
authorize a narrow metadata repair and a complete fresh population before
any new initialization. No policy, endpoint, horizon, or statistical gate
change is justified by this failure.

Process correction: validate the entire technical metadata envelope before
the first simulator initialization, not only at final publication.
