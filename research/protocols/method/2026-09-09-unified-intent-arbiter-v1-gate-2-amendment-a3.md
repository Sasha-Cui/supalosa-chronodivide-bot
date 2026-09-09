# Unified intent arbiter V1 Gate 2 amendment A3

Frozen: 2026-09-09, after complete seed audit 25480245 passed and before the
audit was used by a selector or any game was initialized.

Parents: Gate 2 and Amendments A1–A2.

## Complete audit

Audit 25480245 completed 0:0 under pi_jss233/day with zero restart. Its
585,357,862-byte JSON has SHA-256
6e83a8d51597236dbf1fe80d22262b40bfc737dc6234c68a94853af5ddfaf52a.
The final marker and sidecar match. The audit reports 1,818,439 files,
16,158,239,032 compressed/on-disk bytes, 7,172 gzip files,
58,215,611,851 decompressed gzip bytes, and zero read error.

All 20 candidates were assessed. The first two candidates collided with
retained evidence. The first collision-free candidate is
[3,350,000,000, 3,351,000,000), signed equivalent
[-944,967,296, -943,967,296).

## Compact certificate requirement

The full audit is too large for safe single-string ingestion by the Node
selector. Before selection, run an independent streaming certificate job. It
must:

- rehash the full JSON and match the immutable sidecar and marker;
- validate audit job 25480245 as COMPLETED 0:0, pi_jss233/day, one CPU, zero
  restart;
- validate source, program, Gate 2, A1, and A2 identities;
- parse all 20 candidate assessments and prove that 3,350,000,000 is the first
  passing base;
- stream all 1,818,439 file records without materializing the list;
- require strictly increasing unique paths;
- validate every path, byte count, gzip byte count, and SHA-256 field;
- reproduce total files, bytes, gzip files, and decompressed gzip bytes;
- require zero recorded error;
- select the 2,048 records with the smallest SHA-256 of
  auditSha256 + NUL + absolutePath;
- re-stat and rehash every sampled path against its audit record;
- hash the canonical ordered sample records; and
- emit one compact certificate with a SHA-256 sidecar and immutable completion
  marker.

The deterministic sample is an independent drift check. The complete audit
generator already hashed and stability-checked every listed file during its
single pass; the certificate does not replace or weaken that full binding.

## Certificate identity

Bind:

- audit path, SHA-256, bytes, sidecar, marker, and job ID;
- audit source/program/protocol/A1/A2 hashes;
- certificate source/program/this A3/Slurm hashes;
- all concise candidate assessments;
- selected unsigned and signed intervals;
- recomputed file and gzip totals;
- deterministic sample size and canonical sample SHA-256;
- scheduler account, partition, CPU count, state, exit, restart, and elapsed
  seconds; and
- technical-only and competitive-field-absence flags.

Use new root seed-certificate-v1-a3, one CPU, 8 GiB, two hours,
pi_jss233/day, zero GPU, and no requeue. Inspect no candidate result until the
certificate job and immutable marker complete.

## Selector ingestion

The Gate 2 selector must read the compact certificate, not parse the full
585-MB audit. It must independently rehash the full audit file and verify its
size, sidecar, marker, and certificate binding. It must use selected base
3,350,000,000 and the unchanged paired seed formula.

## Unchanged requirements

The 180 paired cases, 360 tasks, maps, starts, countries, slots, arms, fixed
horizon, exact disabled identity gate, no-outcome boundary, Slurm resources,
file budget, and advancement rules are unchanged.
