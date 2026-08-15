# Mission-native closeout open-development protocol, version 2

Status: **frozen before outcome-bearing execution**

## Question and claim boundary

Does the fixed V37 mission-native building-elimination controller improve the
literal competitive result of exact pinned Supalosa, and does it improve on the
technically valid V34 controller without physical-progress fallback recovery?

This is permanently open development. It may select, diagnose, or reject V37,
but its outcomes cannot support the paper's final performance claim. No sealed
confirmatory family may be opened from this protocol.

A win requires opponent-attributed physical destruction of every enemy
building under literal endpoint version 5. Resignation, sale, capture, engine
victory flags, favorable state at the tick cap, and nonliteral termination are
not wins. Both participants' `quitGame` actions are symmetrically suppressed and
audited; no attempted resignation may be forwarded.

## Technical evidence and fixed software

Generation requires clean pushed `main`, clean pinned external Supalosa commit
`165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`, and these exact outcome-free
artifacts:

- V37-R2 literal-endpoint interface aggregate, controller `22284109`, SHA-256
  `ef9ca94b22fcdb1f7a3bb787413a06f197d8805c32177d93f96a0b94d884067b`;
- V37-C1 all-country compatibility aggregate, controller `22287905`, SHA-256
  `e6b65b4ce05f5d592eb7c885dadcfa49b476e265c2fe315f89a030a3d8ead091`.

Generation and analysis reject source, runtime, package-lock, game-API, map,
policy, endpoint, scheduler, or baseline drift.

## Causal arms

Every family-country block has the following arms in this order and both
reciprocal candidate slots:

1. `external_supalosa_control`: exact external Supalosa against an independent
   exact external Supalosa instance;
2. `mission_native_v34_no_deadline`: the valid V34 liveness ablation, mission
   policy ID
   `e7f740d2f041e4bc6aaa7ea5c77ea6fea4f7f92682288f31ec3033da26d85a48`;
3. `mission_native_v37_recovered_deadline`: fixed V37, mission policy ID
   `7b8e476f1cf50ee7dcda06178756fcfa5afa0757e24f36852f0c8be16c8baa24`.

V34 isolates the progress-deadline/recovery mechanism and cannot rescue a
failed V37 primary result. No country, family, slot, seed, target, or
outcome-specific exception is allowed.

## Open population

Use the same ten permanently open map families, never any sealed family:

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

Use all nine countries, both reciprocal slots, one new paired seed block per
family-country cell, fresh seed base `4_205_000_000`, and a maximum of 24,000
ticks. The population is

$$
10\text{ families}\times9\text{ countries}\times3\text{ arms}
\times2\text{ slots}=540\text{ games}.
$$

There are 90 independent six-game shards. Every attempted creation counts.
There are no filters, retries, reserves, substitutions, or selective reruns.
All simulation uses only Slurm account `pi_jss233`.

## Whole-population gate and one unblinding

No outcome may be inspected until all 90 shards terminate and one dependent
controller reconciles exactly 90 artifacts, exact scheduler job IDs, and 540
launches. It requires literal endpoint validity, both slots, every family and
country, exact arms and policies, symmetric quit suppression, no technical or
information-boundary error, valid V34/V37 telemetry, and complete source,
runtime, baseline, map, and seed provenance.

A failed shard invalidates the full campaign. A software repair requires a new
protocol version and fresh seeds. The controller performs exactly one scheduled
open-development analysis and writes its gate decision and diagnostics in the
same invocation.

## Primary estimand and positive signal

For literal score $S\in\{0,0.5,1\}$, define

$$
D_f=\frac{1}{18}\sum_{c=1}^{9}\sum_{s=0}^{1}
\left(S_{\mathrm{V37},fcs}-S_{\mathrm{external},fcs}\right),
\qquad
\Delta=\frac{1}{10}\sum_{f=1}^{10}D_f.
$$

The one-sided family-clustered 80% lower bound is

$$
\Delta-0.8834038596855205\,
\frac{\operatorname{sd}(D_1,\ldots,D_{10})}{\sqrt{10}}.
$$

V37 advances only if all conditions hold:

1. the technical gate passes all 540 launches;
2. the primary lower bound is strictly above zero;
3. V37 literal wins exceed literal losses overall, in pooled Allied countries,
   and in pooled Soviet countries;
4. V37 wins exceed losses in at least seven of nine countries;
5. equally family-weighted V37 literal-win probability exceeds both exact
   Supalosa and V34;
6. equally family-weighted V37 draw probability is below both exact Supalosa
   and V34; and
7. every leave-one-family-out V37-minus-external score effect is positive.

This selects positive competitive behavior and draw conversion, never the least
poor method. Failure returns the policy to open development on a new version.

## Prespecified diagnostics

The one controller also reports arm-, family-, country-, faction-, slot-, and
terminal-status counts; time-to-literal-win distributions; terminal building
counts; suppressed quit attempts; building and blocker progress; target and
allocation events; fallback categories; and leave-one-family-out effects.
These explain a failed or passed gate but cannot redefine the primary estimand,
select a subgroup rescue, or become held-out paper evidence.

A pass freezes V37 for a separately powered fresh confirmation. A failure is
not a paper result; development continues until a genuinely positive policy is
found or the project receives a candid no-go decision.
