# Visibility-aware terminal conversion open-development protocol, version 1

Status: **frozen prospectively after the V5-C3 technical gate and before any campaign outcome**

Frozen: 2026-08-15 UTC

## Research question and claim boundary

Does a visibility-aware approach order convert exact Supalosa's final-building
draws into literal wins? The proposed policy retains the exact pinned external
Supalosa bot for production, scouting, defense, and ordinary combat. It
intervenes only when public complete state reports exactly one enemy building:
an exact but unseen building receives attack-move to its coordinates, and the
same strike switches to direct attack once the building becomes visible.

This campaign is permanently open development. Its families and predecessor
outcomes have already informed the mechanism. It may select or reject V5 and
diagnose its behavior, but it cannot support the paper's final superiority
claim. No sealed confirmatory family is opened by this protocol.

A literal win requires candidate-attributed physical destruction of every
enemy building under literal endpoint version 5. Resignation, sale, capture,
engine victory flags, favorable tick-cap state, and nonliteral termination are
not wins. Both bots' resignation calls are suppressed symmetrically and
audited.

## Evidence that motivates this test

The completed progress-certified V4 population found 28 wins, 119 draws, and
33 losses for the final-building hybrid versus 26 wins, 121 draws, and 33
losses for exact Supalosa. Its two additional wins came from baseline draws,
and it introduced no paired win-or-draw to loss transition. This is open
development evidence, not a confirmatory estimate.

In 18 remaining exposed V4 draws, the policy repeatedly selected the exact
final building without physical progress. Source and trace inspection found
that an exact public-state building outside current vision received direct
attack-by-ID. The engine did not move the selected units toward that unseen
target. V5 changes that order only; it does not broaden activation or change
the force-clearance rule.

The broad V37 closeout policy is excluded. Its completed 540-game population
materially underperformed exact Supalosa because early takeover preempted
ordinary attacks and exposed the candidate base. This V5 test is deliberately
restricted to the exact final-building state.

## Technical precondition

The outcome-blind V5-C1 gate ran all 72 technical traces as job `22306572`.
Every country-slot cell passed disabled equivalence, repeat determinism, and
enabled command divergence, but the hybrid smoke did not compel the building
branch in all cells. The artifact is preserved with SHA-256
`4af3de54343b0ea552563e46375a8246f611e2cb463ff5b4e97601389016b559`.
It contains no outcome fields and does not authorize competitive execution.

V5-C2 repeated the complete 72-trace technical population on fresh seeds with a
direct-building exposure-only smoke policy as job `22307245`, source commit
`ec2c91f5a2e926435325361e70e6b04e5e1f5e76`. Its preserved outcome-free artifact
has SHA-256
`a79156a49005cf13d57fb236820e1dbe6c54abab6ba08cde3b82becb649e0556`.
All 18 country-slot cells issued matched legal building orders. Six cells across
six countries exposed exact-unseen coordinate approach, covering both factions
and both physical slots, and three cells exposed a live same-building
approach-to-visible handoff. C2 nevertheless failed because it incorrectly
required both rare state-dependent branches in every country-slot cell.

V5-C3 corrects only that technical gate specification and uses another complete
72-trace population with fresh seeds. It must establish:

- direct Supalosa and disabled V5 trace identity;
- same-seed enabled repeat determinism;
- enabled command divergence;
- schema-v4 public-complete-state telemetry;
- a matched legal building order in every country-slot cell;
- real attack-move actions to exact unseen building coordinates in at least
  four cells and four countries, covering both factions and both slots;
- at least one live direct-attack handoff against the same building after
  visibility; and
- clean `main`, pinned baseline, map, scheduler, and `pi_jss233` provenance.

The smoke policy is not an empirical arm. It broadens activation and uses
building-only routing solely to expose the order interface. Campaign generation
must bind the complete passing V5-C3 artifact, job ID, source commit, and SHA-256:

- V5-C3 job: `22308006`
- V5-C3 source commit: `7b0a4e600ed1178248fb1b8aecff5f89bcb15865`
- V5-C3 artifact SHA-256:
  `573f9a694561ae90d13197c39494144678ebfe039be138672258ed4b0e522718`

V5-C3 completed all 72 traces with no validation errors. All 18 cells
preserved disabled-control equivalence, enabled-repeat determinism, command
divergence, and matched building orders. Exact-unseen coordinate approach was
observed in nine cells across seven countries, both factions, and both slots;
six cells completed a live same-building visible handoff. No outcome field was
emitted or inspected.

## Frozen causal arms

Every family-country block contains these arms in this exact order and both
reciprocal candidate slots:

1. `external_supalosa_control`: disabled V5 overlay, which returns the exact
   external Supalosa construction path.
2. `final_building_hybrid_v4`: the frozen schema-v4 predecessor. An exact unseen
   building receives the historical direct attack-by-ID order.
3. `visibility_aware_final_building_v5`: the proposed policy. The same state
   receives attack-move to exact coordinates and switches to direct attack only
   after visibility.

The two enabled arms are identical after removing `schemaVersion` and V5's
single `unseenExactBuildingOrderMode` field. Both activate only at exact enemy
building count one, no earlier than tick 3,600, use the progress-certified
hybrid route-blocker logic, retain a two-combatant ordinary reserve, release all
combatants at the final building, and use the same physical-progress deadlines.

## Open population and compute budget

Use the complete ten-family open population without filtering any family:

| Family | Map | SHA-256 |
|---|---|---|
| `mf_hills` | `cd_chrono_hills.map` | `d674520bba62402d1679b5e97d391f238d9dbdd410ff22303ebf5549f26d8d3b` |
| `mf_reconcile` | `cd_2_reconcile.map` | `248a459912518fa46aad82387c232e51ca5e287fabe0c1d913ba4d26ed78373a` |
| `mf_mp25mw` | `cd_chrono_mp25mw.map` | `4b90f4eb66bdc19721b9033a268cbafd1b839ea93ed0ad35d6728485e8a177bf` |
| `mf_dustbowl` | `cd_chrono_dustbowl.map` | `e1d66f99af69a0b41165991ebb522de8be0c834db899f1bbc6d5773646640ef4` |
| `mf_mp23t4` | `cd_chrono_mp23t4.map` | `6e053a3df5a9d3b54410ade694e0d61065109bdb44cde44e746181f5c678c722` |
| `mf_nearorefar` | `cd_chrono_6_near_ore_far.map` | `0d608a5c1a48752280751477bf18803caea47edca3af90b975b700a419bbccaf` |
| `mf_offensedefense` | `cd_chrono_offensedefense.map` | `94043927a79a30df9394ac6d6195e0d2926863fdad9c412556d0cc7af409f11a` |
| `mf_mp01t4` | `cd_chrono_mp01t4.map` | `89a428f214d5ca2a5f650b94e2847fc493d51805aac04f869f1fcc76e4db3381` |
| `mf_mp17mw` | `cd_chrono_mp17mw.map` | `e55a460f8d519ae2685d93cd7891b23c2268d20100afaae10c82e9d011e8a25e` |
| `mf_ore2` | `cd_chrono_ore2_startfixed.map` | `af9749ef2f9d085d5406b00fd518cafb29d8e7d58a3f76218280c0e0735cb761` |

Use all nine countries, both reciprocal starts, one paired seed block per
family-country cell, fresh engine-seed base `4,215,000,000`, and a maximum of
24,000 ticks:

$$
10\text{ families}\times9\text{ countries}\times3\text{ arms}
\times2\text{ slots}=540\text{ games}.
$$

There are 90 independent six-game shards, each requesting one CPU and 6 GiB.
The expected aggregate cost is 22--28 CPU-hours, no GPU time, and less than
10 GiB of structured evidence. All simulation uses Slurm account `pi_jss233`.
There are no start filters, retries, substitutions, reserves, or selective
reruns. Every attempted launch counts.

## Whole-population technical gate

No outcome may be read until all 90 shards terminate and one dependent
controller reconciles exactly 90 outputs and 540 launches. It must verify:

- exact campaign, plan, source/runtime, baseline, package-lock, game-API, map,
  endpoint, seed, country, slot, arm, and policy commitments;
- authoritative scheduler job IDs, `COMPLETED 0:0`, and account `pi_jss233` for
  every array task;
- exactly two reciprocal completions per family-country-arm block;
- zero technical failures, forwarded resignations, nonliteral credited wins,
  duplicate launches, missing events, or mixed revisions;
- schema-v3 V4 and schema-v4 V5 information-boundary-valid telemetry; and
- complete intervention-exposure reporting without selectively repairing a
  nonexposed outcome-bearing game.

Any game-level software or protocol defect invalidates the complete campaign.
A repair requires a new protocol version and fresh seeds.

## Primary estimand and positive development gate

For literal match score $S\in\{0,0.5,1\}$, define the paired family effect

$$
D_f=\frac{1}{18}\sum_{c=1}^{9}\sum_{s=0}^{1}
\left(S_{\mathrm{V5},fcs}-S_{\mathrm{external},fcs}\right),
\qquad
\Delta=\frac{1}{10}\sum_{f=1}^{10}D_f.
$$

The frozen one-sided family-clustered 80% lower bound is

$$
L_{0.80}=\Delta-0.8834038596855205\,
\frac{\operatorname{sd}(D_1,\ldots,D_{10})}{\sqrt{10}}.
$$

V5 advances only if every condition holds:

1. the whole-population technical gate passes all 540 launches;
2. $L_{0.80}>0$ for V5 versus exact Supalosa;
3. V5 literal wins exceed losses overall, in pooled Allied countries, and in
   pooled Soviet countries;
4. V5 wins exceed losses in at least seven of nine countries;
5. equally family-weighted V5 literal-win probability exceeds both exact
   Supalosa and V4;
6. equally family-weighted V5 draw probability is below both exact Supalosa
   and V4; and
7. every leave-one-family-out V5-minus-external score effect is positive.

These requirements operationalize reliable improvement rather than selection
of the least poor arm. This open screen may freeze a method for fresh
confirmation but cannot itself support a held-out performance claim.

## Prespecified diagnostics

The one controller reports complete-population W/D/L and score; family,
country, faction, slot, terminal-status, and time-to-win strata; exact paired
transitions; family and leave-one-family-out effects; terminal building counts;
suppressed resignation attempts; activation timing; building and blocker
decisions; exact-unseen coordinate approaches; visible handoffs; physical
progress; deadlines; target switches; reserve release; and attacker allocation.

If V5 fails, these open diagnostics may define one new mechanism and fresh
development version. They cannot redefine this gate, rescue a subgroup, or
justify selective replay. If V5 passes, freeze it before accessing fresh or
sealed confirmation families.
