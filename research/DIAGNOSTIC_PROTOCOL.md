# Pre-confirmatory diagnostic protocol

Status: **frozen diagnostic v1, outcome-blind through the phase-3 technical gate**.

This protocol limits the first gameplay diagnostic to 1,000 launched component-
game attempts under Slurm account `pi_jss233`. Every game creation, failed
creation, timeout, retry, and accepted game counts against the cap. The protocol
does not authorize access to any provisional or sealed test family.

## Preconditions

Before submission:

1. The full-map fidelity gate passes for the exact diagnostic map hashes.
2. Ten primary and two ordered substitute families are selected from
   development-only families using catalog metadata and a committed hash rule.
3. The sealed-test selection procedure is committed, but no test-family identity
   is revealed or launched.
4. Five independent conditioned/global optimizer-run pairs have already been
   produced using training families only, frozen seeds, and equal launched search
   budgets. Search games are accounted separately and are not hidden inside this
   1,000-evaluation-launch cap.
5. Method labels, seed blocks, reciprocal starts, warnings, retry rules, source,
   runtime, baseline, map hashes, and the analysis script are frozen.

## Launch allocation

| Phase | Purpose | Formula | Launched attempts | Outcome access |
|---|---|---:|---:|---|
| 1 | Seed, trace, and manifest QC | 4 families x 2 run identities x 1 seed block x 2 fresh-process repeats x 2 starts x 2 methods | 64 | Excluded from effect estimation |
| 2 | Compatibility and runtime screen | 12 families x 1 run x 2 new seed blocks x 2 starts x 2 methods | 96 | Labels/outcomes remain blinded |
| 3 | Development signal and variance | 10 families x 5 runs x 4 new seed blocks x 2 starts x 2 methods | 800 | One scheduled unblinding |
| Reserve | Exact complete-block retries only | At most 10 four-game blocks | 40 | No new outcome-bearing blocks |
| **Total hard cap** |  |  | **1,000** |  |

Unused reserve remains unused. It cannot be converted into extra seeds, families,
methods, or favorable follow-up runs. A substitute family may replace a primary
family only for a phase-2 technical incompatibility identified while outcomes
and method labels remain blinded. More than two incompatible primary families
stops the diagnostic.

## Estimand

For score \(Y \in \{0, 0.5, 1\}\), define the start-level paired contrast

$$
d_{f r b s}
=Y_{\mathrm{conditioned},f r b s}
-Y_{\mathrm{global},f r b s}.
$$

Average reciprocal starts within engine-seed block \(b\):

$$
D_{f r b}=\frac{d_{f r b 0}+d_{f r b 1}}{2}.
$$

The family estimate and equally family-weighted development estimate are

$$
\delta_f=\frac{1}{RB}\sum_{r=1}^{R}\sum_{b=1}^{B}D_{f r b},
\qquad
\Delta_{\mathrm{dev}}=\frac{1}{10}\sum_{f=1}^{10}\delta_f.
$$

The phase-3 dataset is analyzed once with the frozen two-way map-family and
optimizer-run clustered procedure. Absolute score, individual starts, family
signs, structural strata, error categories, and timing are diagnostics only;
none may replace or redefine the primary development estimand.

For the intercept-only block-level analysis, let \(e_{frb}=D_{frb}-
\Delta_{\mathrm{dev}}\), \(N=200\), \(G_f=10\), \(G_r=5\), and \(G_{fr}=50\).
The finite-cluster sandwich variance is frozen as

$$
\widehat V =
\frac{G_f}{G_f-1}\frac{\sum_f(\sum_{rb}e_{frb})^2}{N^2}
+\frac{G_r}{G_r-1}\frac{\sum_r(\sum_{fb}e_{frb})^2}{N^2}
-\frac{G_{fr}}{G_{fr}-1}\frac{\sum_{fr}(\sum_b e_{frb})^2}{N^2}.
$$

A non-finite or non-positive \(\widehat V\) fails closed. Otherwise, the
one-sided 80% lower bound is

$$
\Delta_{\mathrm{dev}}-
0.9409645772351825\sqrt{\widehat V},
$$

where the critical value is the 0.80 quantile of Student's \(t\) distribution
with \(\min(G_f,G_r)-1=4\) degrees of freedom. The committed unblinding program
must validate the exact 800-launch technical-gate artifact, refuses a second or
overwriting run, and writes the signal decision and prespecified diagnostics in
one invocation. No alternative variance estimator can replace this signal gate.

## Technical stop and retry rules

Stop before unblinding if any of the following occurs:

- requested seed, participant seed, manifest, or method-label mismatch;
- failure of repeated same-seed normalized trace identity;
- unclassified or prespecified-fatal parser warning;
- outcome-dependent start rejection or a non-enumerated reciprocal pair;
- failure or timeout above 1% overall, or a material method imbalance;
- more than ten four-game blocks require replay;
- more than two primary diagnostic families are technically incompatible;
- missing source, map, baseline, runtime, allocation, or analysis hash; or
- launched-attempt totals do not reconcile.

A failed component invalidates its entire four-game block. The identical block
may be retried once using the reserve. A software or protocol repair discards
the affected phase and requires a new version and fresh seeds; selective reruns
are forbidden.

## Development signal gate

After exactly one scheduled unblinding, proceed only if every technical gate
passes and the one-sided 80% lower confidence bound for the single
family-macro \(\Delta_{\mathrm{dev}}\) is above zero under the prespecified
two-way clustered analysis. This is a permissive development/futility screen, not confirmatory
significance and not a paper claim.

Do not also require a post hoc point estimate, Supalosa score threshold, majority
of family signs, subgroup result, or best-run result. A failed gate means
redevelop with a new method version and fresh development families, not repeat
validation until positive.

## Variance and power recalibration

Use phase 3 only to estimate:

- map-family variance;
- optimizer-run variance;
- family-by-run variance;
- residual block variance after reciprocal-start averaging;
- start-specific contrast variance and covariance;
- conditioned/global paired covariance;
- non-positive sandwich-variance frequency; and
- technical failure, timeout, warning, and method-imbalance rates.

Never use the observed development mean to change the confirmatory effect
alternative. Keep \(\delta_\star = 0.05\) and two-sided \(\alpha = 0.05\). For each
variance component use a predeclared conservative upper bound, initially a
one-sided 90% bound, and do not reduce the current sample size merely because a
development variance estimate is smaller. Re-run the prospective simulation and
require the Monte Carlo 95% lower bound on unconditional power to be at least
0.80 and the invalid-analysis rate below 5%.

If family variance inflates, add eligible families; if optimizer-run variance
inflates, add independent runs; if block variance inflates, add seed blocks.
If the authorized budget cannot restore the gate, the confirmatory study is a
no-go or the detectable-effect claim must be revised before any test launch.

## Anti-overfitting commitments

There is one method pair, endpoint, signal gate, and scheduled unblinding.
Diagnostic families never migrate to the sealed test. Development outcomes are
never pooled with the sealed estimate. There is no outcome peeking by family,
run, seed, start, or subgroup; no subgroup rescue; and no method tuning on these
ten families after unblinding.
