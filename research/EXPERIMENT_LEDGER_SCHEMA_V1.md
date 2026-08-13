# Chrono Divide experiment ledger schema, version 1

Status: operational, append-only evidence index
Frozen: 2026-08-13 UTC

The durable ledger is stored outside the tracked checkout at
`research-evidence/experiment-ledger/ledger-v1.jsonl`. Every line is one JSON
object and is never edited after append. Corrections append a new row whose
`supersedesEntryId` names the prior row.

## Exact row schema

Every row contains exactly:

- `schemaVersion`: integer `1`;
- `entryId`: unique stable identifier;
- `recordedAt`: UTC ISO-8601 time;
- `method`: method or gate version;
- `purpose`: concise scientific or technical purpose;
- `outcomeAccessClass`: one of `outcome-blind`, `permanently-open-technical`,
  `open-training`, `sealed-development`, or `sealed-confirmatory`;
- `claimEligible`: boolean;
- `sourceGitCommit`: exact 40-hex source revision or `null` when historical
  evidence cannot establish it;
- `sourceRuntimeSha256`, `baselineGitCommit`, `baselineRuntimeSha256`,
  `gameApiRuntimeSha256`, `campaignSha256`, `policyIdsSha256`, and
  `inputPopulationSha256`: lowercase SHA-256/commit strings or `null`;
- `expectedLaunches` and `accountedLaunches`: nonnegative integers or `null`;
- `slurmAccount`: exact account or `null`;
- `arrayJobId`, `controllerJobId`, and `jobIds`: scheduler IDs;
- `schedulerStates`: object keyed by exact job ID;
- `technicalFailures`: nonnegative integer or `null`;
- `artifactPaths`: array of absolute durable evidence paths;
- `artifactSha256`: object keyed by absolute artifact path;
- `status`: concise terminal or current status;
- `advancementDecision`: authorization or refusal produced by the frozen rule;
- `supersedesEntryId`: prior entry ID or `null`; and
- `notes`: array of material limitations or incidents.

No policy outcomes, win counts, or rankings appear in outcome-blind rows. An
open-training row may link outcome artifacts only after its full technical gate
passes. A failed or partial campaign remains in the ledger with
`claimEligible=false` and cannot be removed.

The ledger is an index, not the evidence itself. Raw manifests, events,
scheduler records, summaries, and analyses remain immutable at their listed
paths. Hashes are computed from those files rather than transcribed by hand.
