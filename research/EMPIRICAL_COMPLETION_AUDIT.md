# Empirical completion audit

Status: **core empirical program complete; paper writing may begin**.

Reconciled: **2026-08-11**. This audit freezes the evidentiary boundary for the
current method-v2 paper. It does not authorize additional outcome-bearing games
on already opened families.

## Execution reconciliation

The finalized training and evaluation path contains 8,704 completed policy
games. Every accepted shard is bound to its plan, source/runtime hashes,
candidate and baseline identities, map family, engine and participant seeds,
reciprocal starting slot, scheduler account, and raw completion record.

| Stage | Slurm job IDs | Games | Reconciliation |
| --- | --- | ---: | --- |
| Five method-v1 optimizer runs, stage 0 | `21655584`--`21655588` | 1,920 | 30/30 shards clean; 384 games/run |
| Five optimizer runs, stage 1 | `21749720`, `21749724`, `21749725`, `21749726`, `21749727` | 1,440 | 60/60 shards clean; 288 games/run |
| Fail-closed stage-2 controller | `21749797` | 0 | Completed `0:0`; launched exactly the five frozen arrays below |
| Five optimizer runs, stage 2 | `21759850`--`21759854` | 1,320 | 110/110 shards clean; 264 games/run |
| Common-seed championship, stages A/B | `21788958`, `21799790` | 2,112 | 44/44 shards clean; one frozen champion selected |
| Fresh development phases 1/2/3 | `21920172`, `21920905`, `21922464` | 440 | 110/110 shards clean; one scheduled unblinding passed |
| Sealed confirmatory evaluation | `21925439` | 512 | 128/128 shards clean; one scheduled unblinding |
| Common-seed optimizer diagnostic | `21928633` | 480 | 40/40 shards clean; one analysis |
| Policy-component diagnostic | `21938403` | 480 | 40/40 shards clean; one analysis |
| **Total** |  | **8,704** | **No accepted technical failure or extra attempt** |

All simulation rows above used account `pi_jss233`. Scheduler accounting and
preserved manifests agree on every array ID, raw task ID, launch count,
completion count, and zero technical-failure count. No Chrono Divide job is
currently active.

Each optimizer run contains exactly 936 accepted games. The five frozen
training-only finalizers were generated after all stage-2 shards completed; the
artifacts and SHA-256 values are:

- run 0: `4981febcb99503564a6850f47c161fecd1f9a6159defae881f13e0744f1dae28`;
- run 1: `4d7fd4baba96cf579ae3193baa83f08f87b39d8e8d6fddb82e38c253ed9533f4`;
- run 2: `1e24851265f30cf5df05da821d99203a4b41434468a76e590a59f16d58163908`;
- run 3: `666570957161e4382d31fe617996bf2fdf675b13ddeab62a2089b11d9b5a4f41`;
- run 4: `b82d6c3423ed99b94c1fb2be2514ad98624f916463c49f3d8d5ae01f0d79b896`.

The championship artifact is
`40a53c142fa30725ea5d22032d4b6dfcda4f358e15e1b8d36ac6a102b76e9ee1`.
It freezes policy
`ab0071009cbd5f1fc9e2f1a76a562455a0ebeacf77dac1cd9c13b9fc6374203f`;
the frozen generic reference comparator (historically labeled `default` in
machine artifacts) is
`8fc9e46aba10fb84d7283e16a4ccde12d3e3e429c29d5caca5b42dd5a25cef4a`.

Two prospective zero-launch failures remain preserved but contribute no game:

- arrays `21655409`--`21655413` were cancelled after a runtime-tree change and
  before any `launch_counted` event; and
- component array `21938264` failed uniformly at private-role loading before
  any results directory or `launch_counted` event. Its failure record is
  `9481d3055d0f79c7b3bc021dbc95647cca52363d13ad3be346125881c3954b89`.

## Frozen empirical conclusions

### Confirmatory result

On 16 sealed test families and 256 paired games per method, the champion scores
0.53516 (47 wins, 180 draws, 29 losses) and the frozen generic reference scores
0.19922 (1 win, 100 draws, 155 losses). The equally family-weighted improvement
is 0.33594 with
family-clustered standard error 0.05695 and two-sided 95% interval
[0.21456, 0.45732]. Fourteen family effects are positive and two are zero.

The relative-improvement gate passes. The separate absolute-strength gate
fails: the champion's margin above 0.5 is 0.03516, but its prespecified
one-sided 95% lower margin is -0.02117. The paper may say that optimization
substantially and robustly improves the frozen generic StrongBot reference
against the pinned Supalosa opponent. It may not say that the champion reliably beats
Supalosa.

### Mechanism and component evidence

On the open development panel, the champion exceeds the equal average of the
five independently selected local optimizer policies by 0.08250; its 95%
interval is [-0.02679, 0.19179]. All five pairwise point estimates are positive,
but all five intervals include zero.

The champion exceeds the equal average of five single-group reverts by 0.05750;
its 95% interval is [-0.00347, 0.11847]. The strategy-group revert is the
dominant observed contrast at 0.33125. Its ordinary 95% interval excludes zero,
but the prespecified five-comparison Bonferroni interval is
[-0.00734, 0.66984]. No individual component therefore clears the familywise
criterion. The defense-growth and force-attack reverts have slightly higher
point scores than the champion, and the scouting revert is endpoint-identical
to the champion in all 80 paired games; all null and negative results remain
reportable evidence.

### Terminal-state decomposition

The 1,472-game post-outcome analysis is committed at
`61d84614a5f8088bb38f263a772ec1c34a1334283d51098e96af3d85839dc6b4`.
The champion primarily converts reference losses into tick-cap survival or wins.
Even within 76 pairs that remain draw-to-draw, it ends with 22.71 more relative
combatants and 683.82 fewer relative credits. This is consistent with converting
banked resources into combat power. It is descriptive terminal evidence, not a
logged trajectory or causal mechanism.

## Why the empirical program stops here

Additional games on the same test families after unblinding cannot strengthen
the frozen confirmatory claim without becoming post-selection evidence. The
current supported population has no untouched role pool: training, earlier
development, method-v2 development, reserve/review screening, and sealed test
families have all been assigned or exposed by the completed program. A new
confirmatory study would require a prospectively screened new family
population, a new opponent, or both.

The owner has only the pinned Supalosa bot as an independent opponent. Adding a
second credible agent is therefore a separate acquisition and compatibility
project, not a missing rerun. Instrumented trajectory games could clarify
actions and timing, but any such run would be a new post-confirmatory
exploratory study. It is useful future work, not required to report the current
result honestly.

The remaining weaknesses are structural rather than fixable with more seeds:

- one independently authored opponent and one Iraq-versus-Iraq matchup;
- a supported Temperate-only family population;
- a high tick-cap-draw rate and score endpoint that treats every tick-cap draw
  as 0.5 regardless of material advantage;
- no preserved within-game action or state trajectory;
- no standard configurator comparison such as SMAC or irace;
- modest algorithmic novelty: successive halving, common random numbers, and
  deterministic selection are established tools; and
- third-party game assets whose redistribution remains license-dependent even
  though all author-owned code, metadata, and aggregates may be released.

More games against the same opponent cannot remove these limitations.

## Go/no-go decision

**Go** for a scoped lower-tier game-AI/evolutionary-computation workshop or
special-session paper whose contributions are:

1. a reproducible Chrono Divide scripted-agent evaluation harness with exact
   provenance, deterministic common seeds, reciprocal starts, and family-level
   uncertainty;
2. a training-only configuration pipeline that selects one generic StrongBot
   policy; and
3. held-out evidence that the selected policy substantially improves the
   frozen generic StrongBot reference across diverse supported map families,
   plus candid post-confirmatory mechanism diagnostics.

The reference disables built-in map profiles and exact-map tactics. It is not
the fork's map-profile-enabled deployed constructor default; no result in this
study estimates champion performance relative to that deployed policy.

**No-go** for a paper centered on a new general-purpose learning algorithm, a
new game environment authored by this project, a broad game-AI paradigm shift,
or a claim that StrongBot reliably beats Supalosa. Those formulations exceed
the evidence.

Paper writing should now proceed from the frozen results. No positive claim may
be strengthened by an unregistered follow-up simulation on the opened family
population.
