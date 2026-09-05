# Chrono Divide experiment ledger schema, version 2

Status: operational, append-only evidence index

Frozen: 2026-09-05 UTC

The durable ledger is
`research-evidence/experiment-ledger/ledger-v2.jsonl`. Version 1 remains
immutable at `ledger-v1.jsonl`; V2 starts with a hash-bound legacy snapshot
row rather than rewriting or silently upgrading V1 records. Every V2 line is
canonical JSON and is never edited after append. Corrections append a new row
whose `relationships.supersedes` identifies the earlier row.

## Why V2 exists

V1 compressed execution, integrity, scientific decision, and claim eligibility
into overlapping status strings. That made it possible to confuse a completed
job with a valid experiment or a valid negative result with a failed
experiment. V2 represents those dimensions separately and requires explicit
unknowns.

## Exact top-level schema

Every row contains exactly:

- `schemaVersion`: integer `2`;
- `entryId`: unique stable identifier;
- `recordedAt`: UTC ISO-8601 timestamp;
- `studyId` and `componentId`: stable campaign and component identifiers;
- `method` and `purpose`: human-readable descriptions;
- `executionState`: `planned`, `running`, `completed`, `failed`,
  `cancelled`, or `superseded`;
- `integrityState`: `unverified`, `passed`, `failed`, or
  `not-applicable`;
- `scientificDecision`: `not-evaluated`, `positive`, `negative`,
  `mixed`, `descriptive-only`, `technical-pass`, or
  `technical-failure`;
- `outcomeAccessClass`: `outcome-blind`,
  `permanently-open-technical`, `open-development`,
  `sealed-development`, `sealed-confirmatory`,
  `mixed-complete-population`, or `legacy-unknown`;
- `claimClass`: `none`, `technical`, `development`, `descriptive`,
  `within-map-reliable`, or `confirmatory-negative`;
- `claimEligible`: whether this exact row may support only its declared
  `claimClass`;
- `source`: exact `gitCommit`, `runtimeSha256`, `analysisGitCommit`,
  and `analysisProgramSha256`, each a hash or explicit `null`;
- `comparators`: comparator records with exact `id`, `ancestry`,
  `gitCommit`, and `runtimeSha256`;
- `population`: exact `expectedLaunches`, `accountedLaunches`, `unit`,
  `manifestSha256`, `maps`, `countries`, and `notes`;
- `scheduler`: `account`, `partition`, and exact job records containing
  `jobId`, `role`, `state`, `exitCode`, `expectedTasks`, and
  `accountedTasks`;
- `artifacts`: absolute `path`, SHA-256, byte size, and `kind` records;
- `results`: a component-specific object. It must be empty for outcome-blind
  rows and must never hide an opened unfavorable result;
- `relationships`: arrays `supersedes` and `derivedFrom`;
- `advancement`: exact `decision` and `nextMilestone`; and
- `limitations`: material limitations and incidents.

No other top-level or nested keys are accepted by the validator.

## State invariants

A claim-eligible row must have `executionState=completed` and
`integrityState=passed`. Failed, cancelled, superseded, or unverified rows
cannot be claim eligible. Claim eligibility does not mean “positive”: a valid
negative row can be eligible as `confirmatory-negative`, and descriptive
screens can be eligible only as `descriptive`.

For a completed, integrity-passing population with non-null launch counts,
expected and accounted launches must agree. A scheduler failure is
`integrityState=failed` even if every game artifact was written.

Outcome-blind rows serialize no competitive result. Mixed-population rows must
split their scientific components into separate ledger entries before any
positive claim is eligible.

## Artifact verification

`research/scripts/validate_experiment_ledger_v2.py --verify-artifacts`
requires every artifact to exist at its absolute path with its declared byte
size and SHA-256. The validator also enforces canonical JSON, exact keys,
unique entries and artifacts, state invariants, and the outcome-access
boundary.

The ledger is an index, not a replacement for raw evidence. Manifests, cells,
ledgers, scheduler exports, analyses, protocols, results, and failure records
remain immutable at their listed paths.
