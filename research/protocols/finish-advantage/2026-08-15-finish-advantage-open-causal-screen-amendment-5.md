# Finish-Advantage Open Causal-Screen Amendment 5

Date: 2026-08-15

Status: **prospectively frozen before any finish-advantage competitive outcome and while the unrelated repaired V5 confirmation remains blinded**

## Reason for the amendment

The version-18 implementation correctly requires positive paired effects,
strictly more literal wins, and strictly fewer draws than both exact Supalosa
and unchanged V5. Those relative requirements are necessary but not sufficient
for the author's practical objective. A candidate could satisfy them while
drawing most games and winning fewer than half. Such a policy does not yet
"reliably beat Supalosa" under the literal game endpoint.

This amendment is derived from the stated win rule and development objective,
not from any active or future outcome. It adds absolute literal-win and draw
frequency gates before the first finish-advantage competitive launch.

## Absolute development estimands

For candidate arm \(a\), family \(f\), country \(k\), and reciprocal slot
\(s\), define

\[
W^a_{fks}=\mathbf 1\{\text{all enemy buildings are physically destroyed}\}
\]

and

\[
D^a_{fks}=\mathbf 1\{\text{the literal endpoint is a draw}\}.
\]

For each family, average each indicator over the exact 18 country-slot cells.
Give the ten families equal outer weight. Let \(\widehat p_W^a\) and
\(\widehat p_D^a\) be the corresponding family-macro means, and let
\(SE_W^a\) and \(SE_D^a\) be the ordinary sample standard deviations of the
ten family means divided by \(\sqrt{10}\).

Using the already frozen one-sided 80% Student-\(t\) critical value with nine
degrees of freedom, \(t_{0.80,9}=0.8834038596855205\), define

\[
L_W^a=\widehat p_W^a-t_{0.80,9}SE_W^a
\]

and

\[
U_D^a=\widehat p_D^a+t_{0.80,9}SE_D^a.
\]

Zero family variance is valid only when all ten family means are exactly
identical. Non-finite inputs fail closed.

## Additional conjunctive eligibility gates

An intervention arm is ineligible unless all existing version-18 comparative,
breadth, regression, and mechanism gates pass and all of the following also
hold:

1. \(L_W^a>0.50\). The lower confidence bound, not merely the point estimate,
   must establish that literal wins occur in a majority of games.
2. \(U_D^a<0.25\). The upper confidence bound must exclude a draw rate of one
   quarter or more.
3. The point estimate of nonterminal draws—tick-cap draws plus clean engine
   nonliteral-termination draws—is below 0.10.
4. Literal win, total draw, and nonterminal-draw rates are reported for every
   country, family, faction, and reciprocal slot. These subgroup values cannot
   rescue a failed aggregate gate.

The nonterminal-draw point threshold is a development liveness gate, not a
confirmatory interval. Ten development families may be insufficient for a
stable clustered upper interval at 0.10; the fresh-family confirmation below
will require the interval.

## Selection and failure rule

Absolute gates are applied before the frozen lexicographic ranking. If no arm
passes, the authorized aggregate records `NO_ADVANCING_CANDIDATE`. The screen
must not advance the least-bad arm, relax these thresholds, add a favorable
arm, remove an unfavorable family, or selectively rerun games. A subsequent
policy version must be prospectively specified and evaluated on a new complete
open-development campaign.

## Executable consequences

Before launch, the analysis and finalizer must:

- compute family-level literal-win and draw rates and the frozen bounds above;
- preserve the exact endpoint reason needed to separate simultaneous draws,
  tick-cap draws, and engine nonliteral terminations;
- include the new quantities and gate failures in the immutable aggregate;
- test a synthetic candidate that improves both comparators but still draws a
  majority of games and prove that it cannot advance; and
- test equality at 0.50 wins and 0.25 draws as failures because the inequalities
  are strict.

This amendment changes no active V5 job and authorizes no paper claim.
