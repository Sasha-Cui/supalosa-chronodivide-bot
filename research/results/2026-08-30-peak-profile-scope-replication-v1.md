# Peak of Perfection profile-scope V1 replication result

Status: **complete; passed all frozen replication gates**

## Claim boundary

The prospectively selected `strategy_both` policy reliably beats pinned
Supalosa on Peak of Perfection across all nine countries, both reciprocal
starts, and both participant slots. The claim is map-specific. It does not
establish general-map robustness or transfer to RA2Web Advanced.

The policy changes one mechanism relative to deployed StrongBot: the existing
immutable Peak macro strategy profile is applied at both reciprocal starts
instead of only `(37,73)`. Bot/tactic scope remains deployed
`weak_only`.

## Frozen identities and execution

- Zero-update selector: job `23736451`; 433 initialized games produced
  exactly 36 development and 180 replication cases with exact
  country/start/slot balance. Selection SHA-256:
  `53a40a5af6edf754515d3506ef55b516a5ad10394ee92bd263d6c266b3e249a7`.
- Development array/finalizer: `23751978`/`23751979`; all 216 games
  completed. Frozen Stage-0 aggregate SHA-256:
  `ca9d9b5ba1de0c00909a6e6c59768a9fa3686b45e8cc70183572723b1ed9229d`.
- Stage-0 result and champion decision were preserved at commit `8c73a32`
  before replication.
- Replication array: `24232910`; exactly 360/360 tasks completed `0:0`
  under `pi_jss233`, one unique scheduler job ID per task index 0--359.
- Fail-closed replication finalizer: `24232911`, completed `0:0` only
  after the full array.
- Replication aggregate SHA-256:
  `f970f197ee106408ae0842bd466b073f540cc623b8b96a41d5e838061a1b0285`.
- Replication source commit:
  `8c73a32a18e04500dc7c52a83264460c01a13f66`.
- Cell/finalizer program SHA-256:
  `5341b9c2ac08d6d04fb69d5d5bc29e0ae7b30af0cca4b81e2b71eecd91bd2b1e`.
- Protocol SHA-256:
  `610caca135a049d582ed09d0f1cab477c2a5f5b5b7cab20c83f152e8363403ba`.
- Asset-manifest SHA-256:
  `d942117f24363818977d573dbc87006a9b320c6861bddf939d5fc80db2217e67`.
- Pinned Supalosa commit:
  `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.
- Map: `cd_2_peak_of_perfection.map`, SHA-256
  `440715dc154ac10b4b922159824140d40c48990311c6838345b66958f3b3a442`.

All 360 immutable cell markers and checksums, empty stderr logs, scheduler
records, source/program/protocol/runtime/map/baseline/selection/previous-stage
identities, and aggregate rows independently reconciled. No retry,
replacement, exclusion, partial-outcome access, or forwarded resignation
occurred.

## Confirmatory result

| Policy | W/D/L | Win rate | One-sided 95% Wilson lower |
|---|---:|---:|---:|
| Deployed control | 92/16/72 | 51.11% | 45.01% |
| `strategy_both` | 134/14/32 | 74.44% | 68.76% |

On the 180 identical cases, `strategy_both` improved 50, tied 121, and
worsened nine. Its paired score difference was +0.2278 with sample standard
deviation 0.4939 and frozen one-sided 95% lower bound +0.1669
(`t=1.65341`, `df=179`).

The equal-weight mean across the 18 country-by-start cells was 74.44%, with
sample standard deviation 0.2727 and frozen one-sided 95% lower bound 63.26%
(`t=1.73961`, `df=17`).

## Prespecified strata

| Stratum | W/D/L | Win rate |
|---|---:|---:|
| Start `(37,73)` | 55/9/26 | 61.11% |
| Start `(118,73)` | 79/5/6 | 87.78% |
| Allied | 57/13/30 | 57.00% |
| Soviet | 77/1/2 | 96.25% |
| Candidate slot 0 | 63/8/19 | 70.00% |
| Candidate slot 1 | 71/6/13 | 78.89% |

Every required stratum had wins exceed losses. All 90 pairs at the
already-profiled `(37,73)` start were exactly identical in trajectory,
winner, literal status, updates, terminal building counts, terminal unit
inventories, and resignation audit. Thus the confirmed improvement remains
isolated to reciprocal application of the macro profile.

## Country coverage

| Country | W/D/L | Win rate |
|---|---:|---:|
| Americans | 13/4/3 | 65% |
| Alliance | 11/3/6 | 55% |
| French | 12/1/7 | 60% |
| Germans | 10/3/7 | 50% |
| British | 11/2/7 | 55% |
| Russians | 19/1/0 | 95% |
| Confederation | 20/0/0 | 100% |
| Africans | 20/0/0 | 100% |
| Arabs | 18/0/2 | 90% |

All nine countries had wins exceed losses, surpassing the frozen requirement
that all be noninferior and at least seven be strictly positive. The weaker
Allied aggregate still remained positive at 57W/13D/30L; the result is not
driven solely by the four Soviet-side countries.

## Frozen-gate audit

The unchanged champion passed every replication condition:

1. 134 wins exceeded 32 losses, and the one-sided 95% Wilson lower bound
   exceeded 0.5;
2. paired mean and its one-sided 95% lower bound exceeded zero;
3. both starts, both sides, and both slots had wins exceed losses;
4. every country had wins exceed losses;
5. the equal-weight 18-cell lower bound exceeded 0.5; and
6. all 90 intended-invariant start pairs were exactly identical.

The finalizer status is `PASS_PEAK_PROFILE_SCOPE_STAGE_1`. Literal outcomes
include building-elimination wins/losses and draws from the frozen tick cap or
symmetric nonliteral engine termination; all are retained.

## Interpretation

The earlier Peak pilot was approximately even because only one physical start
received the map-specific macro profile. The factorial development screen
separated macro-profile scope from tactical-profile scope, and the independent
replication confirms the diagnosis: applying the same macro profile
reciprocally raises the win rate from 51.11% to 74.44% on fresh balanced cases.

This is a second positive map result against Supalosa, complementary to the
720-game HFO confirmation of deployed StrongBot at 633W/24D/63L. It supports a
paper contribution about deterministic, auditable map-profile development and
the importance of reciprocal spatial coverage. It does not rescue the negative
RA2Web Advanced transfer result.
