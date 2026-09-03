# Unchanged-policy confirmation: neither map qualifies

All 288 cells in array `24634133` and finalizer `24634134` completed 0:0
under pi_jss233. The complete aggregate and completion/checksum files were
verified before analysis. Source:
`355770ce1dd6d5236d50776546de0a0d7cbff5ed`.

Aggregate SHA-256:
`59b7b217b6d6bf38759d16bb12cda8a275d3c3b37ca159aa9ed3455c8712d393`.
Program:
`f038bccfcacf4c293a2bc9408c730dd88a5e0acb8841dd1618a6438985924fdc`.
Protocol:
`0769b11e732f9c4908341fbee201ea5aa0f77cedc491c7fd3eb9b20f6ed60b5b`.
Confirmation plan:
`6358eb8716b424ad750467a648ff65ed1094f173316c43edaa1476984e3fd544`.

| Map | W / D / L | Win rate | Pooled 95% lower | Country/start 95% lower | Positive cells |
|---|---:|---:|---:|---:|---:|
| HFO L v L | 99 / 3 / 42 | 68.75% | 62.10% | 58.02% | 11 / 18 |
| HFO R v R | 89 / 33 / 22 | 61.81% | 54.99% | 47.26% | 12 / 18 |

Neither map passed. L v L failed slot/start positivity, pooled and clustered
bounds, the 17/18 positive-cell requirement and all-cell noninferiority
(16/18 noninferior). R v R passed pooled-record/faction/slot/start positivity,
but failed both bounds, positive-cell coverage and all-cell noninferiority
(17/18 noninferior). Neither satisfied the separate dominance criteria.

Median literal-win updates were 21,110 and 22,280. L v L had two cap draws
and one nonliteral engine termination; R v R had 30 cap draws and three
nonliteral terminations. All remain draws under the frozen endpoint.

Raw complete evidence, including every stratum and case:
`research-evidence/multimap-v2/unchanged-confirmation-v1/finalizer/confirmation.json`.
The finalizer enforced exact case identities, zero overlap with the screen,
identical captured runtime with the screen, literal certificates, all 18
country/start cells and zero forwarded resignations. No game was retried,
dropped or retrospectively relabeled.

Reproduction: run `node research/scripts/audit-multimap-confirmation-v1.mjs`.
The read-only evidence audit rechecks all 288 cell checksums and 289 Slurm
accounting records (zero restarts), then regenerates [map statistics](2026-09-03-multimap-confirmation-audit/maps.csv),
[every stratum](2026-09-03-multimap-confirmation-audit/strata.csv),
[all gates](2026-09-03-multimap-confirmation-audit/gates.csv),
[288 exact case/job/hash bindings](2026-09-03-multimap-confirmation-audit/cells.csv),
[scheduler records](2026-09-03-multimap-confirmation-audit/scheduler.csv), and
[validation](2026-09-03-multimap-confirmation-audit/validation.json).
The country/start bound is the frozen t approximation (1.73961, df=17), not
an exact finite-sample guarantee.

## Measurement risk discovered separately

A post-screen source audit found that the current endpoint can count destroyed
leaveRubble world objects as if they were live owned buildings. This can delay
or misorder first-elimination verdicts. The frequency and scope in actual
matches have not yet been established by live controlled fixtures.

This note preserves the confirmation result AS RUN. It does not use the
suspected correction to rescue failed gates. Before any revised endpoint is
used, validate it prospectively and preserve both the legacy measurements and
fresh complete evaluation. Do not reuse these confirmation outcomes for tuning
or relax the original thresholds. The overall paper goal remains unfinished.
