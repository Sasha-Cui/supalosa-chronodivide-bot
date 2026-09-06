# Outcome-blind timestamped action-burst diagnostic V1 amendment A5

Frozen: 2026-09-06, after manifest job `24979178` failed and before any game
initialization

Parents: the V1 protocol and Amendments A1–A4.

Failure record:

`../../results/2026-09-06-action-burst-manifest-v1-runtime-failure.md`

## Repair

All manifest, smoke, array, and finalizer programs must run with:

- Node.js `v20.13.1` from
  `/apps/software/2024a/software/nodejs/20.13.1-GCCcore-13.3.0`;
- ICU `75.1`, GCCcore `13.3.0`, and OpenSSL `3` library roots used by the
  prior validated runners;
- `LC_ALL=C`, `TZ=UTC`, and no inherited `NODE_OPTIONS`; and
- an explicit runtime-version assertion before any artifact or game.

Candidate and external Supalosa runtime-tree commitments retain the original
freeze algorithm. Priority-queue and quadtree transitive dependency
commitments use bytewise UTF-8 relative-path ordering, matching their
independent M0 audit hashes:

- priority queue:
  `1533f9343bc44506b5082a47f5d8dc81420069b9f84e83070c26ebd2cbf57cf7`;
- quadtree:
  `af6f532a321a487d38bf6726858313d296ba90883e5c2bb2df0d290d7f932039`.

The replacement execution root is `execution-v1-a4-runtime-a1`. Preserve the
failed scheduler logs and never describe job `24979178` as a manifest.

## Unchanged requirements

The selected seed audit, 846-seed multiplicity, 1,717 traces, maps, opponents,
countries, starts, slots, horizon, action schema, summaries, reserve rule,
determinism, prohibited fields, storage, file budget, and Slurm CPU resources
are unchanged.
