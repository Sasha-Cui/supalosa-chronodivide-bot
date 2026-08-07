# Prospective coordinate-free optimizer protocol

Status: **frozen before the first stage-zero optimizer launch**.

This document defines the training algorithm and budget. It is a protocol, not
a paper result. The only gameplay calibration observed before this version was
frozen was the two-game default-policy smoke in Slurm job `21655228`; both
reciprocal games favored the clean Supalosa baseline. That smoke selected no
candidate, family, parameter, stage rule, or endpoint below.

## Fixed setting

- Source population: the 22 private training families committed by
  `family_role_commitments_v1.json`.
- Opponent: independently loaded clean Supalosa commit `165b77a` and its
  committed compiled runtime.
- Matchup: Arabs versus Arabs, 10,000 starting credits, superweapons off,
  short-game defeat, 18,000-tick cap.
- Policy interface: `ResearchPolicyConfig` only. Default map profiles, exact-map
  tactics, coordinate routes, placement anchors, map signatures, and
  orientation gates are disabled by construction.
- Randomness: explicit uint32 engine seeds and separate identity-keyed bot RNG
  streams. Every family-policy-seed block contains physical candidate slots 0
  and 1 with the same engine seed.
- Retry rule: no retry or rejected-start loop. Every attempted engine launch is
  counted. A technical failure stops reduction of that stage.

## Candidate population

Each of five optimizer runs creates 32 candidates independently and
deterministically from its run index:

1. Candidate 0 is the frozen generic default policy.
2. Candidates 1--8 anchor each non-default attack composition.
3. Candidates 9--17 anchor each non-default strategic plan.
4. Every non-default candidate receives 6--14 additional mutations selected by
   a SHA-256 rank over the declared coordinate-free search-space fields.
5. Duplicate canonical policy hashes fail plan generation.

The generator does not read gameplay outcomes. Candidate generation is replayed
by unit tests and serialized in each private campaign manifest.

## Nested family schedules and launched budget

For each run, families are ranked by a fixed SHA-256 rule over run index and
family ID. The schedule first takes one family from every available start-count
stratum and then fills by the same rank. The 6-family schedule is a prefix of
the 12-family schedule, which is a prefix of the complete 22-family schedule.
Each stage uses one new reciprocal engine-seed block per family.

| Stage | Policies | Families | Slots | Launched games |
| --- | ---: | ---: | ---: | ---: |
| 0 | 32 | 6 | 2 | 384 |
| 1 | 12 | 12 | 2 | 288 |
| 2 | 6 | 22 | 2 | 264 |
| **Per optimizer run** |  |  |  | **936** |
| **Five runs** |  |  |  | **4,680** |

Stage 0 retains 12 policies. Stage 1 retains 6. Stage 2 produces the six-policy
finalist set used by both downstream methods. Global and conditioned methods
therefore share every search launch; conditioned selection receives no extra
simulator budget.

## Frozen training utility

The evaluation endpoint remains the unshaped score

$$
Y =
\begin{cases}
1 & \text{candidate win},\\
0.5 & \text{draw},\\
0 & \text{baseline win}.
\end{cases}
$$

Successive-halving reduction uses a bounded training-only tie term. For each of
credits, units, buildings, combatants, harvesters, factories, refineries, and
construction yards, compute

$$
a_k = \frac{x_k-y_k}{|x_k|+|y_k|+c_k},
$$

where (c_k=1000) for credits and (c_k=1) otherwise. Let
(A=\frac{1}{8}\sum_k a_k\), so (A\in[-1,1]), and define

$$
U = Y + 0.04A.
$$

The coefficient ensures that no possible terminal state reverses the per-game
ordering loss (<) draw (<) win. Policies rank by equal-family mean (U),
then equal-family mean (Y), worst-family mean (U), and ascending policy
SHA-256. Evaluation and confirmatory claims use (Y), never (U). A later
outcome-only training ablation is required to assess dependence on the tie term.

## Stage integrity

The reducer fails unless every campaign shard has:

- exact plan and source/runtime/baseline/map commitments;
- authoritative Slurm account `pi_jss233`;
- exactly the requested launch count;
- one terminal result for every counted launch and no technical failure;
- one candidate-slot 0 and one candidate-slot 1 result per policy-family block;
- no duplicate or undeclared policy, family, episode, or survivor; and
- a survivor set that is a canonical hash-identical subset of its parent.

Private campaign, result, ranking, and survivor artifacts remain outside Git.
Only job-level provenance and aggregate methodological facts may enter the
public registry before the planned development unblinding.
