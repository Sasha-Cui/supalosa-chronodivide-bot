# Finish-Advantage Confirmatory Design Amendment 1

Date: 2026-08-15

Status: **prospective requirement written before any finish-advantage competitive outcome and while the repaired V5 confirmation remains blinded**

## Stronger definition of reliable superiority

The existing confirmatory requirements establish a positive paired literal-win
effect over exact Supalosa, a positive paired literal-win effect over V5, and a
positive absolute score margin. The author additionally requires the released
policy to win a majority of games and to make nonterminal draws uncommon. The
following requirements are conjunctive additions; they do not replace or
weaken any existing requirement.

For each fresh family, first average over every prospectively frozen country,
reciprocal slot, and seed block. Give families equal outer weight. Using the
same frozen family-clustered one-sided 95% procedure as the other primary
estimands, the final candidate must satisfy:

1. **Absolute majority literal wins:** the one-sided 95% lower confidence bound
   for the candidate's literal-win probability is strictly above 0.50.
2. **Low total draw frequency:** the one-sided 95% upper confidence bound for
   the candidate's total draw probability is strictly below 0.25.
3. **Low nonterminal-draw frequency:** the one-sided 95% upper confidence bound
   for the probability of a tick-cap draw or clean engine nonliteral-
   termination draw is strictly below 0.10.

A simultaneous physical-elimination draw remains a draw in requirement 2 but
is not a nonterminal draw in requirement 3. Technical failures never count as
draws and invalidate the complete-block analysis under the existing rule.

## Interpretation

Passing only the paired improvement tests would support the statement that the
new policy improves on Supalosa. Passing the additional absolute gates is
required for the stronger paper statement that the released StrongBot
reliably wins against Supalosa and that persistent closeout makes stalemate
uncommon. If any one gate fails, the project returns to open policy development
and no positive paper is written from that confirmation.

## Power and executable protocol

The fresh-family population and number of seed blocks must be chosen
outcome-blindly so that all existing primary tests plus these three absolute
tests are estimable. Prospective power simulation must include the joint
probability of passing every conjunctive gate and retain the existing minimum
unconditional-power requirement. The executable analyzer must report point
estimates, family effects, standard errors, critical constants, bounds, exact
endpoint-reason counts, and leave-one-family-out sensitivity for these added
estimands.

No current result is reinterpreted by this amendment. It constrains only future
finish-advantage selection, confirmation, and paper claims.
