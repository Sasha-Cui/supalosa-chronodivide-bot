# D1: prospective command-budget component diagnostic

Frozen: 2026-09-22, after complete OD1 A1 unblinding and independent audit,
before D1 implementation or initialization.

Evidence: `research/results/2026-09-22-v2-od1-a1/REPORT.md`.
OD1 aggregate SHA-256:
`809956a766dff0f4f6b80d27ac9fffd3dc45f3acd498c96264c129ecb0c398f0`.
Independent audit SHA-256:
`7ea6954787f20e430f2fcb327b65dac892ee01935ca25ae74964ba800c876fd4`.

## Decision and purpose

OD1 rejected the complete V2 component. Do not deploy V2 or present arbitration
as a solution to Advanced. This bounded diagnostic asks whether command-budget
gating contributes to the regression, before abandoning or further revising
the component. It is not a new positive-result claim or a general optimizer.

The cap was reached in 837/900 V2 episodes; 121 reference wins became draws.
Those observations motivate this test but do not identify a causal mechanism.
D1 choices are informed by the **complete** OD1 development result. They are
prospective for new games, not described as blind to all historical evidence.

## Three fixed arms

Run every case in this exact order with matched engine/participant RNG seeds:

1. `disabled`: unchanged deployed StrongBot, arbiter disabled.
2. `separated_lanes_v2`: unchanged failed OD1 challenger, command ceiling 115
   in a rolling 900-update window.
3. `separated_lanes_unbounded_d1`: same arbitration with only order/debug
   command-budget admission removed.

The unbounded diagnostic remains research-only and opt-in. Do not alter
deployment defaults or reinterpret the V2 mode. Add a distinct mode identifier
and explicit null command ceiling; never serialize Infinity as an accidental
null or pretend the 115 cap remains enforced.

For the new arm, both order- and debug-budget admission functions allow calls
without the rolling cap. Preserve order-before-debug processing, debug
coalescing, priorities, deterministic winner/tie-break rules, target validation,
retry intervals, duplicate suppression, pending TTL/expiry, scope revocation,
one-forward-per-unit, canonical grouping, 128-ID chunks, 4096 requested-ID
bounds, essential forwarding and atomic production batches. Do not add new
production, attack, map-specific, or opponent-specific tactics.

Continue measuring rolling order/debug counts and report excursions above
the **reference** 115 level descriptively. They are not violations in the
new mode. Distinguish budget-denied attempts from other pending/deferral causes.
The cap-on arm must retain its original exact telemetry contract.

This intervention identifies the effect of removing the entire shared
order/debug admission cap, not a separate order-only effect, and not the
effects of priority arbitration or duplicate suppression.

## Bounded development population

Use all 25 OD1 opponent-map strata (15 maps versus Supalosa and ten HFO
variants versus Advanced), reciprocal first-two starts, and both player slots.
Use **Americans and Africans only**: the first Allied and first Soviet entries
in the original frozen canonical country ordering, not countries chosen for
favorable outcomes. This is a diagnostic sample, not nine-country confirmation.

Enumerate opponent in Supalosa-then-Advanced order, existing frozen map order,
direction 0 then 1, country Americans then Africans, slot 0 then 1.
This yields 25 × 2 × 2 × 2 = 200 paired-case blocks, eight per stratum.
Three arms produce exactly 600 competitive episodes.

Fresh identities, committed before any initializer:

- competitive case seed = 3,350,110,000 + caseIndex, indices 0–199;
- four canary configurations in the same structural order as OD1:
  HFO LE/Supalosa, Peak/Supalosa, Tour of Egypt/Supalosa, HFO LE/Advanced,
  Americans/slot0/direction0; seeds 3,350,111,000–3,350,111,003;
- one HFO LE/Supalosa Americans/slot0/direction0 smoke:
  seed 3,350,111,100.

Freeze exactly 205 zero-update definitions and verify countries, starts,
requested/effective seeds and exact strata. Register all consumed OD1/A1
identities, including the failed V1 selector, in the metadata-only seed audit.
Any collision blocks initialization; do not shift seeds ad hoc.

Primary endpoint, passive secondary observer, public observation boundary,
pinned maps/opponents/runtime, symmetric resignation suppression, and all
game settings remain OD1-equivalent. The horizon stays 24,000 updates.
Do not extend failed or drawn games after observing D1 outcomes.

## Technical prerequisites

Before simulation, run the current-source build and all relevant semantic,
terminal, firewall, deterministic RNG, V2, unbounded-mode, and endpoint-replay
tests. Require:

- disabled and cap-on default behavior unchanged on deterministic synthetic
  golden fixtures captured from the pre-D1 implementation;
- the only intentional difference in new-mode synthetic admission is removing
  budget rejection, including near/exceeding the rolling threshold;
- essential-call conservation, atomic production, one-forward, target validity,
  chunk bounds and event ordering remain intact;
- explicit mode/ceiling serialization and strict outcome-free projections;
- exact new-mode queue telemetry and deterministic independent analysis tests;
- complete metadata-envelope validation before any initializer.

After the 205-case zero-update manifest passes, run four canary tasks:
three arms × two passive instrumentation variants (v5 reference and dual),
fixed 3,600 updates, **24 episodes total**. Within each arm, require identical
normalized state/action hashes across observer variants, exact horizon, no
early engine finish, valid identities and resignation suppression. Check
cap-on invariants and new-mode invariants separately. Retain no W/D/L,
score, terminal building inventory, or other competitive payload.

Only after the full canary aggregate passes, run one three-arm preserved
natural-termination/24,000-update smoke. Verify ledger reconstruction and
resource/byte limits; discard all competitive payloads. This smoke contributes
three episodes, not scientific observations.

Then run exactly 200 three-arm tasks, concurrency at most 32, pi_jss233/day,
one CPU/8 GiB per task, six-hour task limit, no requeue, and an afterok
fail-closed finalizer (one CPU/24 GiB/eight hours). Budget approximately
100–180 allocated CPU-hours, uncertain until the smoke; do not scale if
technical resource limits fail.

Exact D1 launch counts: 205 zero-update initializations plus
24 canary + 3 smoke + 600 competitive = **627 advancing episodes**.
Preserve immutable intents/receipts, all attempted launches and raw job IDs.
No selective retries, replacements, exclusions, partial outcome inspection,
or source edits while source-bound jobs run.

## Full-population analysis

The primary contrast is unbounded minus V2 cap-on. The secondary development
contrast is unbounded minus unchanged disabled. Also report cap-on minus
disabled, with no suppression of an inconvenient reversal. W/D/L, literal-win
difference and score (win 1, draw 0.5, loss 0) are all required.

Report all 25 stratum results, both opponents, both countries/factions, both
directions, both slots, full transition matrices, cap/nonliteral draw types,
first-result times, v5/v6 differences, commands, reference-cap excursions,
budget-denied attempts, duplicate suppression and pending/expiry diagnostics.
Action rates use actual observed updates and cannot by themselves establish
why combat performance changed.

Use the original exact independent replay/uncertainty machinery, with fresh
SHA-256 domain `unified-intent-budget-diagnostic-d1-bootstrap-v1`, 200,000
replicates and sorted index floor(0.1 × 200000). Separate named streams for
each contrast and grouping. Report paired benchmark-stratum bounds overall
and by opponent; five-topology sensitivity; and opponent-specific four
country/direction clusters with both slots and all maps intact. Four clusters
are very few: label these bounds as a sensitivity description, not reliable
population-wide uncertainty. Keep all paired records linked.

## Prespecified interpretation and stopping rules

A positive budget-removal diagnostic requires unbounded-minus-V2 score and
literal-win one-sided 90% benchmark-stratum lower bounds above zero overall,
score lower above zero for each opponent, and nonnegative country and slot
point score effects. Otherwise do not claim the cap accounts for the regression.

Even if that contrast passes, it is **not policy improvement** unless the
unbounded arm also passes all of these unbounded-minus-disabled conditions:

- overall score and literal-win lower bounds strictly above zero;
- Advanced score lower above zero and more literal wins;
- Supalosa score lower at least -0.02, wins greater than losses, and at most
  two Supalosa strata with score difference below -0.10;
- nonnegative country and slot point score effects; and
- win-to-loss transitions no more frequent than loss-to-win plus draw-to-win.

Absolute Advanced eligibility remains separate: wins greater than losses and
pooled one-sided 90% Wilson win lower bound above 0.50 (z=1.2815515655446004).
It does not replace either paired contrast.

These are open-development filters, not independent confirmatory hypothesis
tests or family-wise claims. Do not select a favorable contrast, country,
map, horizon or uncertainty grouping after the fact.

If budget removal improves over failed V2 but does not improve over unchanged
StrongBot, retain it only as a mechanism finding and stop treating arbitration
as the primary performance-improvement direction. If it also improves over
unchanged StrongBot, require a new nine-country/full-map validation and
replication protocol before deployment or paper claims.

Run D1 at most once after technical prerequisites pass. A failed scientific
result does not authorize another ceiling search or repeated variants.
Subsequent substantive work must address strategic production/force
composition/mission completion with its own prospective protocol, retaining
the confirmed Supalosa policy until improvements pass fresh evidence.
