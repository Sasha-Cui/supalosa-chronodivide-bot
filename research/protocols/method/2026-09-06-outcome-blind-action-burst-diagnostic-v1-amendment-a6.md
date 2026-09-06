# Outcome-blind timestamped action-burst diagnostic V1 amendment A6

Frozen: 2026-09-06, after manifest job `24982190` failed and before any game
initialization

Parents: the V1 protocol and Amendments A1–A5.

Failure record:

`../../results/2026-09-06-action-burst-manifest-v1-a5-string-limit-failure.md`

## Compact seed-selection certificate

Before another manifest attempt, run one outcome-blind Python certificate job
under `pi_jss233/day`. It must:

1. rehash the complete A2 seed-audit artifact and require SHA-256
   `ac9c2100702750270e4bc9df311fbdff62aca29a933687e44d16d18f7318a231`;
2. parse the complete JSON and validate its source, program, protocol,
   scheduler, 1,811,152-file/13,717,433,802-byte coverage, zero errors,
   26 ordered candidates, first-passing selection, and selected unsigned and
   signed intervals;
3. retain each candidate's base, bounds, collision count, pass flag, and
   selection flag;
4. serialize no scanned-file list, collision token, outcome, action, endpoint,
   building, or policy field;
5. write an immutable compact JSON, checksum sidecar, and completion marker
   under a new `seed-certificate-v1-a2` root; and
6. bind its source, program, scheduler job, Python version, and complete-audit
   hash.

The certificate is a verified projection, not a replacement for the complete
537 MB audit. Both remain required evidence.

## Manifest ingestion

The Node manifest program must rehash the complete A2 audit bytes but must not
convert them into one string or parse them. It parses the compact certificate,
verifies its sidecar/marker and complete-audit binding, and requires the same
selected interval.

The replacement execution root is
`execution-v1-a4-runtime-a1-certificate-a1`.

## Unchanged requirements

Node 20.13.1 and Amendment A5 remain mandatory. The selected seeds,
multiplicity, traces, maps, opponents, countries, starts, slots, horizon,
action fields, summaries, reserve rule, determinism, prohibited fields,
storage, file budget, and CPU resources are unchanged.
