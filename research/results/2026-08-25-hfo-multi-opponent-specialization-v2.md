# HFO multi-opponent specialization factorial V2 result

Status: **complete; no coherent ablation is robust to both opponents**

## Identities and complete coverage

- Outcome-blind selector: job `23469638`, 342 initialized games, 72 selected
  cases, selection SHA-256
  `f2dceb2d87cf5f1c0773a5aa084671aab53dd3c737102761b4f2ab51341740b4`.
- The selection contains exactly eight cases per country, 18 per physical
  start, 36 per participant slot, and one case per each of 72
  country/start/slot cells.
- Gameplay array: `23566946`, 720/720 tasks completed `0:0` under
  `pi_jss233`; no retry, replacement, or exclusion occurred.
- Finalizer: `23566947`, completed `0:0`.
- Aggregate SHA-256:
  `a014b3ccdfbdace99e6ad2c2c6dd179075e603339151d6a0a8fe00efb52a931b`.
- Source commit:
  `764dc8de4e08bf83636f6d098c7ec5d4675dc9f8`.
- Program SHA-256:
  `4e2015cf1fcffadfe93c1a5110729704292abf12adc57471d167e328a7b90b11`.
- Protocol SHA-256:
  `aaadee66f6fe2a7bbd4d92d5914e7afafacfef212eccca5ed45b6cd47bff0a8f`.
- External Supalosa commit:
  `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.
- RA2Web Advanced bundle SHA-256:
  `81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143`.
- RA2Web freeze-manifest SHA-256:
  `a405c0fc6d1d6541f965582c9b53be0bfd01c0c68f4d0f340e1a5ae37671aa5d`.

## Frozen policy results

| Policy | Supalosa W/D/L | Supalosa win | Supalosa lower | Advanced W/D/L | Advanced win | Advanced lower | Eligible |
|---|---:|---:|---:|---:|---:|---:|---|
| Deployed | 60/5/7 | 83.33% | 74.93% | 12/4/56 | 16.67% | 10.68% | No |
| Profiles off | 50/13/9 | 69.44% | 59.95% | 13/6/53 | 18.06% | 11.80% | No |
| Exact tactics off | 48/7/17 | 66.67% | 57.07% | 12/4/56 | 16.67% | 10.68% | No |
| Both specialization layers off | 55/3/14 | 76.39% | 67.29% | 11/4/57 | 15.28% | 9.57% | No |

The frozen robust ranking was `profiles_off`, `deployed`,
`exact_tactics_off`, `specialization_off`. No policy passed because none had
wins exceed losses or a Wilson lower bound above 0.5 against Advanced; faction
and start safety also failed for every policy.

`profiles_off` produced the only positive Advanced point contrast versus
deployed: paired mean `+0.02778`, with 5 improved, 65 tied, and 2 worsened
cases. Its one-sided 90% paired lower bound was `-0.00051`, narrowly below the
frozen positive threshold. It simultaneously reduced Supalosa performance:
paired mean `-0.08333`, lower bound `-0.11719`, with 0 improved and 10 worsened
cases. Thus it is not an eligible robustness repair.

Disabling exact tactics reduced Supalosa paired score by `-0.15278` with lower
bound `-0.22360` and did not improve Advanced in aggregate. Disabling both
layers reduced Supalosa score by `-0.08333` and Advanced by `-0.01389`.

## Factorial effects

Effects use W=1, D=0.5, L=0 score and average over the other factor.

| Opponent | Profiles-on main effect | Exact-tactics-on main effect | Interaction |
|---|---:|---:|---:|
| Supalosa | +0.00694 | +0.07639 | +0.15278 |
| RA2Web Advanced | -0.00694 | +0.02083 | -0.04167 |

Exact tick tactics are beneficial against Supalosa and modestly beneficial
against Advanced. Automatic profiles have near-zero average main effects; their
interaction with exact tactics is strongly positive against Supalosa and small
negative against Advanced. Removing either existing specialization layer does
not explain or repair the large external-opponent regression.

## Safety structure

The deployed arm reproduced its expected development direction against
Supalosa: Allied 30/3/7, Soviet 30/2/0, and positive records at all four starts.
Against Advanced it was Allied 0/0/40 and Soviet 12/4/16, with losses exceeding
wins at every start.

Profiles-off changed only the west strata materially: against Supalosa west
moved from 16/0/2 to 6/8/4; against Advanced west moved from 1/2/15 to 2/4/12.
East, top, and bottom were identical to deployed for both opponents. This
confirms that profile selection is correctly start-bounded and that removing
it cannot solve the general Advanced failure.

Exact-tactics-off and specialization-off improved Advanced east to 9/1/8 but
collapsed bottom to 1/3/14 and retained 0/0/18 at top. Their gains and losses
therefore cancel rather than form a robust policy.

The external Supalosa calibration arm scored 26/14/32 in symmetric Supalosa
self-play and 37/7/28 against Advanced. This independently confirms that
Advanced is beatable on this sample while exposing substantial fixed-slot and
start asymmetry; it was calibration-only and could not advance.

## Conclusion and next step

The complete factorial rules out the simplest repair: opponent overfitting is
not caused by automatic map profiles or exact-map tick tactics in isolation.
Exact tactics are net useful for both opponents, and profiles are narrowly
bounded. The remaining difference from external Supalosa is principally the
global StrongStrategy/base policy and its interaction with observed opponent
behavior.

The next prospective stage should be outcome-blind opponent-style
identification followed by an observation-conditioned mixture, or a minimax
multi-opponent policy search. A detector may use only in-game state available
to the policy, not bundle identity. It must be trained and evaluated on
disjoint technical traces before any competitive adaptive-policy outcome and
must preserve the already confirmed Supalosa advantage.

This negative factorial is part of the paper's analytical contribution: a
policy can generalize across seeds, countries, starts, and slots against its
training opponent while failing across opponents, and common map
specialization ablations may not diagnose the failure.
