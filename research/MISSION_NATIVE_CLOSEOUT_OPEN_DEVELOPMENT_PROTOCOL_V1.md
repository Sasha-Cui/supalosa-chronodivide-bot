# Mission-native closeout open-development protocol, version 1

Status: **frozen before outcome-bearing execution**

## Research question and claim boundary

Does the fixed V35 mission-native building-elimination controller improve the
literal competitive result of the exact pinned external Supalosa bot, and does
its physical-progress deadline improve on the otherwise identical V34
controller without that deadline?

This is permanently open development. It may select or reject V35, but none of
its outcomes may support the paper's final performance claim. The sealed test
families remain unopened. The older `DIAGNOSTIC_PROTOCOL.md` is not reused: its
conditioned-versus-global optimizer estimand and run identities do not describe
the mission-native V34/V35 intervention.

The endpoint is opponent-attributed physical destruction of every enemy
building under literal endpoint version 5. Resignation, sale, capture, engine
victory flags, favorable state at the tick cap, and nonliteral engine
termination are not wins.

## Frozen technical preconditions

The campaign may be generated only from clean pushed `main` after all of the
following exact outcome-blind evidence is present:

- V34-R1 all-country gate, job `22262232`, artifact SHA-256
  `db1b6cd682f8aff4f51297e68e8bedd90ce3cba9e17971347a8b5bcd900991f6`;
- V35-R1 recovery probe, job `22264739`, artifact SHA-256
  `55fac9bc4d6190cbf1f00e078d6f377eeb2a33e1a4408da6154215e529f5504e`;
- complete V35-R1 population, job `22265722`, artifact SHA-256
  `dc120885b30cf4d82b90cfcbe58fff6ec42c2f247112e53eeaf3c9b7d5409f85`;
  and
- V35-R2 checksum-pinned revalidation, job `22267338`, artifact SHA-256
  `777a0c61375ac6170da610e4a9e7c2763c6efa3c529382b35d501128bc3e2704`.

The pinned external baseline remains clean commit
`165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`. Generation must reject any
source, runtime, package-lock, game-API, map, policy, endpoint, scheduler, or
baseline drift.

## Frozen causal arms

Every family-country-seed block contains the following arms in this order and
both reciprocal candidate slots:

1. `external_supalosa_control`: exact external Supalosa versus an independent
   exact external Supalosa instance;
2. `mission_native_v34_no_deadline`: enabled V34 policy identifier
   `e7f740d2f041e4bc6aaa7ea5c77ea6fea4f7f92682288f31ec3033da26d85a48`;
   and
3. `mission_native_v35_progress_deadline`: enabled V35 policy identifier
   `c0e0b96567b4c6b56a4e76defebabe4e4b593c7c8f7257a5943ab27c6c8972f1`.

V34 is the liveness ablation, not a competing post hoc candidate. V35 is fixed
exactly as technically validated. No country, map, slot, seed, target, or
outcome-specific exception may enter any arm.

## Open-development population

Use the same ten permanently open families from the completed continuous-
offense campaign, with exact map bytes:

| Family | Map | SHA-256 |
|---|---|---|
| `mf_hills` | `cd_chrono_hills.map` | `d674520bba62402d1679b5e97d391f238d9dbdd410ff22303ebf5549f26d8d3b` |
| `mf_reconcile` | `cd_2_reconcile.map` | `248a459912518fa46aad82387c232e51ca5e287fabe0c1d913ba4d26ed78373a` |
| `mf_mp25mw` | `cd_chrono_mp25mw.map` | `4b90f4eb66bdc19721b9033a268cbafd1b839ea93ed0ad35d6728485e8a177bf` |
| `mf_dustbowl` | `cd_chrono_dustbowl.map` | `e1d66f99af69a0b41165991ebb522de8be0c834db899f1bbc6d5773646640ef4` |
| `mf_mp23t4` | `cd_chrono_mp23t4.map` | `6e053a3df5a9d3b54410ade694e0d61065109bdb44cde44e746181f5c678c722` |
| `mf_nearorefar` | `cd_chrono_6_near_ore_far.map` | `0d608a5c1a48752280751477bf18803caea47edca3af90b975b700a419bbccaf` |
| `mf_offensedefense` | `cd_chrono_offensedefense.map` | `94043927a79a30df9394ac6d6195e0d2926863fdad9c412556d0cc7af409f11a` |
| `mf_mp01t4` | `cd_chrono_mp01t4.map` | `89a428f214d5ca2a5f650b94e2847fc493d51805aac04f869f1fcc76e4db3381` |
| `mf_mp17mw` | `cd_chrono_mp17mw.map` | `e55a460f8d519ae2685d93cd7891b23c2268d20100afaae10c82e9d011e8a25e` |
| `mf_ore2` | `cd_chrono_ore2_startfixed.map` | `af9749ef2f9d085d5406b00fd518cafb29d8e7d58a3f76218280c0e0735cb761` |

Use all nine countries—Americans, Alliance, French, Germans, British, Libyans,
Iraqis, Cubans, and Russians—and both reciprocal slots. Use one new paired seed
block per family-country shard, seed base `4270000000`, and a maximum of 24,000
ticks. No earlier episode or seed is reused.

The fixed population is:

$$
10\text{ families}\times9\text{ countries}\times3\text{ arms}
\times2\text{ slots}=540\text{ launched games}.
$$

There are 90 independent family-country shards, six games per shard. Every
attempt counts. There are no start filters, outcome filters, retries, reserve
launches, substitutions, or selective reruns. Simulation uses only Slurm
account `pi_jss233`.

## Technical gate and scheduled unblinding

Do not analyze an outcome until all 90 shards terminate and one technical gate
reconciles exactly 90 plans, manifests, ledgers, summaries, scheduler job IDs,
and 540 counted launches. It must require 540 valid episode completions, all
countries, all families, both slots, all three arms, exact policy and runtime
hashes, symmetric resignation suppression, literal-endpoint validity, and zero
technical, information-boundary, seed, map, source, baseline, or method
imbalance errors.

V34 and V35 telemetry must match their declared policy identifiers and contain
valid intervention events somewhere in every country and reciprocal slot.
Every V35 fallback must satisfy the R2 deadline, predecessor-ownership,
suspension, and replan contract. The control emits no mission-native telemetry.

Only one dependent controller may perform the complete-population analysis. A
technical failure invalidates the entire campaign and requires a new protocol
version and fresh seeds. Partial summaries are forbidden.

## Frozen estimand and positive development signal

For literal score $S\in\{0,0.5,1\}$, define the reciprocal-start paired family
contrast

$$
D_f=\frac{1}{18}\sum_{c=1}^{9}\sum_{s=0}^{1}
\left(S_{\mathrm{V35},fcs}-S_{\mathrm{external},fcs}\right).
$$

The primary development estimand is

$$
\Delta=\frac{1}{10}\sum_{f=1}^{10}D_f.
$$

Use the one-sided family-clustered 80% lower bound

$$
\Delta-0.8834038596855205\,
\frac{\operatorname{sd}(D_1,\ldots,D_{10})}{\sqrt{10}}.
$$

V35 advances only if every condition holds:

1. the technical gate passes all 540 launches;
2. the primary lower bound is strictly above zero;
3. V35 literal wins exceed literal losses overall, within the pooled Allied
   countries, and within the pooled Soviet countries;
4. V35 wins exceed losses in at least seven of nine countries;
5. the equally family-weighted literal-win-probability effect is positive over
   both exact Supalosa and V34;
6. the equally family-weighted draw-probability effect is negative relative to
   both exact Supalosa and V34; and
7. every leave-one-family-out estimate of the primary paired score effect is
   positive.

This rule intentionally demands positive competitive behavior and draw
conversion rather than selecting the least poor arm. V34 results isolate the
deadline mechanism but cannot rescue a failed V35 primary signal. Subgroups,
win time, building trajectories, fallback counts, force composition, and target
decisions are diagnostics only.

## After the screen

A pass freezes V35 unchanged for a fresh, separately powered confirmatory
protocol on unopened families and seeds. A failure returns the policy to open
development using only the complete aggregate diagnostics. The same campaign
cannot be repeated until positive, and no development outcome may be presented
as held-out paper evidence.
