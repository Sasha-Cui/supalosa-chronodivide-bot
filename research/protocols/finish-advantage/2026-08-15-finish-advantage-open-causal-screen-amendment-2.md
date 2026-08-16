# Finish-advantage complete open causal-screen protocol, amendment 2

Status: **prospectively frozen pairing and reproducibility correction before campaign generation or competitive launch**

Recorded: 2026-08-15 (America/New_York)

This amendment supersedes the open causal-screen protocol's unspecified seed interval, its statement that each family-country-slot cell receives a separate seed, and its printed df=9 critical constant. It changes no arm, family, country, slot, outcome, estimand, eligibility gate, or candidate-ranking rule.

## Reciprocal seed blocks

There are 90 family-country engine-seed blocks. For canonical family ordinal \(f\in[0,9]\) and country ordinal \(k\in[0,8]\), define

\[
b(f,k)=4{,}227{,}000{,}000+9f+k.
\]

Every arm and both reciprocal candidate slots in that family-country block use exactly seed \(b(f,k)\). Thus slot 0 and slot 1 are reciprocal starts under the same engine seed rather than different stochastic instances. The interval is `4,227,000,000` through `4,227,000,089`, within uint32 and disjoint from prior committed campaigns.

## Horizon

The exact maximum is 24,000 ticks per game, matching the V5 open and confirmatory horizon. A draw is reconstructed only at this frozen horizon.

## Family-cluster critical value

The exact one-sided 80% Student-t critical value with nine degrees of freedom is the existing project commitment:

`0.8834038596855205`

This replaces `0.883403859685775` in the original protocol. The difference is numerical precision only; using the existing committed constant prevents two nominal implementations of the same family-clustered gate.

