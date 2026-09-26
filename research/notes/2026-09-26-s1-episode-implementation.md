# S1 episode adapter implementation checkpoint

Updated 2026-09-26 UTC. This follows the committed passive foundations and
the unchanged prospective S1 protocol. It is development implementation,
not a completed formal gate, measurement study or stronger-policy claim.

## Scope and lifecycle

`packages/chronodivide-bot-driver/src/training/strategicS1Episode.ts` is a new
adapter; historical D1/OD1 adapters and evaluation modules remain unchanged.
Its four modes are diagnostic, smoke, canary endpoint-only and canary with
strategic observation. Both canary modes use the same passive v5/v6 endpoint
observers and unchanged gameplay. The adapter checks seed/case-role/horizon,
participant names, slots/start ordinals, game mode and allowed country before
creation, then effective country/start positions and public API availability.

The future source-bound launcher must still reconstruct the entire exact case
from the frozen plan, create the disabled StrongBot with unchanged deployment
defaults, install api_full_state for both participants, check assets/runtime
and all prerequisites, and reserve/journal each launch before initialization.
The adapter is not a replacement for those missing gates. It checks absent
arbiter telemetry but that alone is not proof of correct factory options.

The existing PublicActionAudit wrapper is installed first at startup; the
S1 wrapper then installs before the original policy callback. Startup calls
are counted once. Sampling occurs at zero, each 300 updates and a unique
final tick while public APIs still exist. Both action windows must conserve
the complete public-call totals. Candidate mission metadata is never read in
the endpoint-only canary and no opponent mission metadata is read in any mode.

Canaries retain only explicit technical projections: public-call/state hashes
and counts, symmetric resignation records, and a hash of every dual-observer
state/building snapshot/engine-status tuple. Both trajectories have 3,601
observations; an observed canary has exactly 13 strategic samples. The final
records contain no endpoint result, strategic samples, screens or ledger
payload. Fixed-horizon canaries continue after a first observer result but
fail on an early native game termination; immutable first results remain intact.

Diagnostic/smoke paths encode and replay both bounded ledgers. Runtime replay
checks exact final endpoint objects, strategic samples, per-episode analysis
and public-call bindings. The combined artifact is bounded to 32 MiB; the
future stage publisher must check its complete outer record again. The main
result embeds both ledgers, not a second full copy of strategic samples. Smoke
returns only explicit replay/schema/grid/conservation/resource assertions and
storage counts after discarding both payloads. No smoke strength inference is
permitted, nor independent replay claims about discarded payloads.

Strategic action wrappers are removed before seeded-instance disposal. Callback
descriptors are restored after the seeded lifecycle; failure before entry to
the body also restores the strategic wrappers. No command or debug output is
issued by the observer, and no policy RNG is consumed in the synthetic paths.
Real-game noninterference remains unproven until the frozen fresh canaries.

## Verified development evidence

Current formatted-source build and **344 pure/synthetic development checks
passed**: 305 Vitest assertions across 32 files plus 39 Node checks. All
failed/pending/todo/skipped/cancelled checks are zero. No real engine was
initialized or advanced. No S1 launch intent, selector or Slurm job exists.

Evidence outside the repository:
`research-evidence/strategic-diagnostic-s1/development/episode-regression-qnjg1p/result.json`,
6,441 bytes, SHA-256
`04b564c6d98fa4e4f325091397a883514dfe144e0ca0d41adfd159a23d978de3`.
It binds formatted source, reports and command logs and explicitly records
`formalLaunchGate=false`, zero game initializations and zero advancing episodes.

The 13 new adapter assertions cover complete disabled D1 payload equality in
both slots, startup/action-window conservation, final sampling before disposal,
deduplicated destruction events, exact endpoint and strategic replay, different
immutable v5/v6 results through the 24,000 cap (81 samples), full canary equality
with and without an early observer result, strict smoke payload discard, identity
and effective-configuration failures, clock/telemetry/native-finish failures,
startup cleanup, zero observer RNG calls and the combined byte ceiling.
The game-creation wrapper is explicitly mocked: these are not real canaries.

Preserved attempts:

- `episode-KYzaHX`: initial build failed TS2683, missing explicit this type
  in a synthetic install spy. Source and build log remain preserved.
- `episode-bF0B7S`: build passed; nine assertions failed because the fake
  getVisibleUnits ignored the API rules predicate and returned vehicles to
  a building-only collection. Four assertions passed. Only the fixture was
  corrected; the frozen production endpoint collection guard was not changed.
- `episode-BGF2UC`: build and all 13 adapter tests passed before formatting.
- `episode-regression-qnjg1p`: full formatted-source 344-check pass above.

## Foundation reconciliation and remaining work

Trusted refresh/SSH succeeded again on 2026-09-26 UTC, without agent changes
to trust settings. The saved dirty worktree matched its checkpoint, and no
Chrono source-bound jobs were active. The interrupted post-format Vitest
report and missing 39 Node checks were reconciled without overwriting any
attempt. Protocol review removed an unintended active-mission condition from
the dispersion screen before any observations. The original source is retained
in `protocol-review-7vJXbI`; the separate 331-check foundation result is in
`foundation-final-Co5blC`. See the foundation implementation note for all hashes.

Foundations were committed in logical groups: `f93993c` (copying accessor and
golden checks), `e8671b6` (passive foundation modules and synthetic tests), and
`0b0137a` (verified checkpoint/STATUS). The original pre-S1 generator/fixture
commit `9d7d24a` and pre-D1 fixture remain unchanged; never recapture them.

Still required before any formal S1 gate or game: complete descriptive
population aggregation and all distributions/subgroups/status tables; strict
outer result/projection validation; provenance and full metadata registration
context including every D1 registration; runner/finalizer; new pure gate,
immutable submission helper and CPU Slurm wrappers. Validate exact factory,
firewall, policy defaults and all initialization routes in that integration.

Then commit/push clean source and proceed only through independently verified
pure →205-case selector →eight canary episodes →one smoke →200 main tasks and
finalizer, followed by the independent all-population endpoint/strategic audit.
No partial competitive inspection, source edits during bound jobs, old-game
reruns, threshold changes, or policy selection from incomplete diagnostics.
The original deployed bot and manuscript are unchanged; M2 is not achieved.
