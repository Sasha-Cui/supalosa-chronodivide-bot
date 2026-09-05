# Outcome-blind timestamped action-burst diagnostic V1 amendment A2

Frozen: 2026-09-05, after A1 audit `24935965` failed and before any new
initialization or action trace

Parents:

- `2026-09-05-outcome-blind-action-burst-diagnostic-v1.md`;
- `2026-09-05-outcome-blind-action-burst-diagnostic-v1-amendment-a1.md`.

Failure records:

- `../../results/2026-09-05-action-burst-seed-audit-v1-collision.md`;
- `../../results/2026-09-05-action-burst-seed-audit-v1-a1-collision.md`.

## Reason

Two complete retained-metadata scans independently found real prior-use
collisions at their proposed lower boundaries. Neither initialized a new game.
This amendment replaces serial guessed-range audits with one deterministic,
outcome-blind ordered selection.

## Ordered candidate intervals

Evaluate the following lower bounds in exactly this order. Each candidate is
the half-open one-million-seed interval ([B,B+1{,}000{,}000)):

[
egin{aligned}
B in [&3{,}010{,}000{,}000, 3{,}020{,}000{,}000,3{,}030{,}000{,}000, 3{,}040{,}000{,}000,3{,}050{,}000{,}000, 3{,}060{,}000{,}000,\
&3{,}070{,}000{,}000, 3{,}080{,}000{,}000,3{,}090{,}000{,}000, 3{,}120{,}000{,}000,3{,}130{,}000{,}000, 3{,}140{,}000{,}000,\
&3{,}150{,}000{,}000, 3{,}160{,}000{,}000,3{,}170{,}000{,}000, 3{,}180{,}000{,}000,3{,}190{,}000{,}000, 3{,}210{,}000{,}000,\
&3{,}220{,}000{,}000, 3{,}230{,}000{,}000,3{,}240{,}000{,}000, 3{,}250{,}000{,}000,3{,}260{,}000{,}000, 3{,}270{,}000{,}000,\
&3{,}280{,}000{,}000, 3{,}290{,}000{,}000].
end{aligned}
]

The order was fixed from tracked-source lexical absence only. Retained
off-checkout evidence has not yet been used to select among candidates.

## Selection rule

In one complete scan, inspect decimal, grouped, underscored, hexadecimal, and
signed-int32-equivalent integer tokens plus explicit range declarations for
all 26 candidates.

A candidate passes only if it has:

- zero exact integer tokens in its interval or signed equivalent;
- zero explicit declared-range overlaps;
- zero scan errors; and
- complete file/hash coverage under the parent scan contract.

Select the first passing candidate in the frozen order. Preserve collision
paths and token/range counts for every rejected predecessor. If none passes,
the A2 audit fails and no game may initialize.

Do not prefer a later candidate because it is aesthetically convenient, near
other work, or has fewer collisions. Do not narrow an interval around observed
tokens.

## Derived game seeds

Let (B) be the selected lower bound. Replace all prior block bases with:

- pinned-Supalosa map block `i`: `B + 1,000*i`;
- Advanced HFO map block `i`: `B + 100,000 + 1,000*i`.

The within-block formula, reciprocal-slot pairing, opponent-start rule,
duplicate construction, 1,717-trace population, horizon, instrumentation,
summaries, reserve rule, gates, storage, and Slurm resources are unchanged.

## Execution

Run once under a new exclusive `seed-audit-v1-a2` root. Exclude and
hash-bind the current protocol/amendments, implementation, tests, and Slurm
source. Preserve both earlier failed roots.

A successful final artifact must record every candidate interval, its
unsigned and signed bounds, token and range collision counts, rejected paths,
the selected interval, all file hashes/sizes, exclusions, errors, scheduler
identity, and source identities. Only its immutable completion marker and
sidecar authorize manifest generation.
