# Live-owned building ledger: prospective technical repair plan

Status: technical plan; no corrected competitive endpoint is authorized.

## Motivation and unchanged objective

The intended objective remains first opponent-attributed physical destruction
of every currently live enemy-owned building. Counting destroyed rubble with
an old owner tag does not implement that objective. Do not change outcomes,
countries, map sets, ranking gates, resignation handling or statistical
thresholds to make an existing result pass.

The legacy version-5 endpoint, all legacy artifacts and the completed
confirmation results remain immutable. A new snapshot candidate is separate
and not wired into any competitive runner.

## Candidate interface

For each declared combatant, query public GameApi live-owned collections using
getVisibleUnits(name, self, buildingFilter). Cross-check returned unit type and
owner, reject missing/nonfinite health, and retain only positive-health
buildings. Deduplicate IDs and sort deterministically.

This is evaluator bookkeeping, not additional enemy information supplied to
the policy. Agent observations and actions are unchanged. Attribution and
owner-change/sale/cleanup rules remain strict; no disappearance without the
opponent's qualifying destruction event becomes a win.

## Synthetic checks before simulation

Require rubble exclusion, alive-building retention, malformed-data rejection,
deterministic ordering, both-side symmetry, strict same-update destruction
attribution, and continued rejection of capture, sale, unexplained removal and
engine cleanup. Demonstrate the first-elimination ordering issue independently
of recorded competitive outcomes.

## Required live gate, to be fully implemented/frozen before launch

Use fresh controlled fixtures, not selectively replayed winners/losers.
Observe real non-rubble and leaveRubble building destruction, public world
versus owned collections, health, owner tags and destroy/unspawn event timing.
Include negative lifecycle controls and both participant orientations.
Compare legacy and candidate snapshots over the same trace, without producing
competitive policy rankings. Freeze fixture map bytes, actors, seeds,
timeouts, exact launch counts and pass/fail checks before any fixture runs.

Do not merely trust a mock or assume every recorded nonliteral draw was rubble.
Native stalemate cleanup is a separate mechanism and must not be relabeled as
opponent destruction.

## Advancement boundary

A synthetic snapshot pass does not lift the hold on new competitive training.
A live compatibility pass is required, followed by a separately versioned
evaluation protocol and fresh complete cohorts where needed. Preserve the
legacy results and disclose the metric repair. Never selectively rescore the
95 draws, revive V8 rejects, or tune on the failed confirmation population.

All simulation stays on pi_jss233 CPU day; source changes only on main with no
source-bound jobs active. The paper remains frozen.
