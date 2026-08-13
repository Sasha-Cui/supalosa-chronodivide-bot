# Terminal-objective fresh-development protocol, version 1

Status: **conditionally frozen before terminal-objective open-development outcome access**

Frozen: 2026-08-13 UTC

## Purpose and authorization boundary

This protocol specifies the single fresh-development evaluation that may follow
terminal-objective open-development array `22119584` and fail-closed controller
`22119585`. It authorizes no game unless the controller completes successfully
and its frozen analysis status is
`ADVANCE_TERMINAL_OBJECTIVE_TO_CONFIRMATORY_DESIGN` with every declared check
true. If that condition fails, this protocol is retired unused; no fresh family
is opened and policy redevelopment remains confined to open families.

Fresh development is a permissive selection/futility stage, not paper evidence.
It cannot establish that the candidate reliably beats Supalosa.

## Fixed inputs

- Candidate: policy arm `full_sufficient_strike`, policy SHA-256
  `438f059f4723242947fefa4e79ef28f22c35a1717ccd361accf8472329db5e95`.
- Candidate implementation parent: clean `main` commit
  `8dc89f55f9d914aec03d6cf45dd7b475a7b702c4`.
- Exact Supalosa control: policy arm `selected_prior`, policy SHA-256
  `927d424c170f231eee42a83536f51c377553e16f06a1c06dc8eef6918b0cd5b6`.
- Open-development campaign SHA-256:
  `bc15d6e83df8d3cdaa03eac92e6dea1ec7477727e54c25ef8ba2e9bc9630509e`.
- Outcome-free external-baseline identity gate SHA-256:
  `60e88d45dd363c2573f912d5329f558116928619ead8f28e2ea585b3e1e3b4f6`.
- Outcome-free all-country live-bridge smoke gate SHA-256:
  `cc4163c0bff2af394a48115b03f74fc1ad0c6050121e83d810eab5cfd7fcb4cf`.
- Exact terminal decision-core SHA-256:
  `3ed2f2907f201a9184d931a20d02ac5bb0e473d1db56ece7b739560f3da7ec05`.
- Exact mechanics-adapter SHA-256:
  `a39cdb70571de40f72a3aae251eb1e8610c94b76ca7125790f9e0ee488ad52fc`.
- Literal building-elimination endpoint: version 5 and its source commitment
  already bound by the campaign.
- Public fresh-role commitment SHA-256:
  `ab778395def5e69730c7772b0af5e9f767c96d1ea8699ef0e56e644521fc61a8`.
- Private ten-family development-role artifact SHA-256:
  `3460b82487b9a5e0f5bce7ba68d75babfb08a1d43a2e51f11eebcbba95079c98`.
- Private 16-family confirmatory-role artifact SHA-256, inspected for commitment
  and count only:
  `d99afdae4c3600967f12955f62e622041d9e4800105dd9675f7d8b628a88c803`.
- Private three-family ordered-substitute artifact SHA-256:
  `cd31262a3d270a842ab4cddf9ac6821013d9b0bb4c4f56842b6ae19990cb44be`.

No policy parameter, decision rule, map inclusion rule, analysis rule, or
success threshold may change after open-development outcomes are available.

## Schedule

Use all ten previously frozen development families, all nine same-country
mirrors, four new engine-seed blocks, and both reciprocal candidate slots. The
candidate is the only evaluated policy because its opponent is the independently
loaded exact Supalosa bot. The fixed engine-seed base is `4,050,000,000`. The
row-major index is

`seed_block_index = ((family_ordinal * 9) + country_ordinal) * 4 + seed_ordinal`.

The requested seed is produced by the repository's frozen paired-seed primitive.
The schedule is therefore

`10 families x 9 countries x 4 seed blocks x 2 reciprocal slots = 720 games`

in 360 indivisible two-game shards. Each game uses `shortGame=false`, literal
endpoint v5, symmetric resignation suppression, and a 24,000-tick cap. Every
simulation must use Slurm account `pi_jss233`; no GPU is required.

There is no outcome-bearing retry. A task proven to have stopped before its
first `launch_counted` record may be resubmitted only as part of a prospectively
documented complete technical recovery. A failure after any counted launch
invalidates the full campaign. Successful shards cannot be retained in a
selective rerun.

## Technical gate and information boundary

The fail-closed gate must validate all 360 unique scheduler tasks, all 720
planned and completed launches, exact source and runtime trees, external
baseline identity, family/map hashes, seeds, country, reciprocal slots, policy
hash, endpoint ledgers, physical final-building destruction for every credited
win, and account `pi_jss233`. It must reject source drift, duplicates, missing
games, endpoint violations, and any use of evaluator-only complete state in the
policy or policy telemetry. It emits no outcomes.

The checkout remains clean and pinned from generation through technical gating.
Development family identities may be read only by the generator and gate; they
must not enter policy code, scalar choices, map profiles, routes, or target
priorities. Confirmatory identities remain sealed.

## Estimands and frozen uncertainty

The primary endpoint is literal candidate win probability. Draw-adjusted score
is descriptive only. Average the two reciprocal slots within each
family-country-seed block, then average seed blocks and country cells within
each family. The overall estimate gives each of the ten families equal weight.

For a family-level vector of estimates, use the Student-t standard-error lower
bound with nine degrees of freedom. The one-sided 80% critical value is
`0.8834038596855205`. Apply the same family-cluster construction separately to
literal win probability and draw probability; for the draw upper bound add the
critical-value term. Zero variance is permitted only when the corresponding
family estimates are exactly identical; otherwise non-finite or non-positive
variance fails closed.

Allied and Soviet pooled estimates are descriptive point estimates over their
five and four country strata respectively. Individual-country wins and losses
are raw literal outcome counts over 80 games per country.

## Advancement gate

Generate a sealed-confirmatory campaign only if every technical condition passes
and all four conditions below hold in the single scheduled development
unblinding:

1. the one-sided 80% family-clustered lower bound for literal win probability is
   strictly greater than 0.50;
2. Allied and Soviet pooled literal win probabilities are each strictly greater
   than 0.50;
3. literal wins exceed literal losses in every one of the nine countries; and
4. the one-sided 80% family-clustered upper bound for draw probability is
   strictly below 0.40.

No score result, decisive-game win rate, family sign count, terminal material,
isolated country, subgroup, alternative variance estimator, or post hoc seed can
rescue a failed gate. Failure permanently opens these ten families and sends
policy development back to the pre-existing open population with a new method
version and new prospective seeds.

## Conditional confirmatory handoff

Only a passing fresh-development artifact may authorize implementation and
generation of the frozen Method-v3 confirmation: the same fixed candidate on
all 16 still-sealed families, all nine country mirrors, four fresh seed blocks,
both reciprocal slots, and 1,152 games, with the four success gates in
`METHOD_V3_PROSPECTIVE_PROGRAM.md`. Confirmatory outcome access occurs once,
only after its own complete technical gate. The policy cannot change between
fresh development and confirmation.
