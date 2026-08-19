# Temperate trained profiles: literal all-country protocol V1

Status: **prospectively frozen before V1 literal gameplay**

The HFO literal study is pending restoration of the user-owned Snow theater MIX.
This independent study evaluates two deployed StrongBot map profiles supported by
the existing Temperate runtime and selected from historical pre-audit evidence:

- `cd_2_tikal.map`, SHA-256 `c4bf8d58d93957aaf7ee1708a956e67bd89e9021b32c240c7bba5cc953ac8ca6`;
- `cd_2_peak_of_perfection.map`, SHA-256 `440715dc154ac10b4b922159824140d40c48990311c6838345b66958f3b3a442`.

Historical short-game grids contained 100% Iraq candidate wins for multiple
opponent countries on these maps. Those outcomes select the fixed two-map scope
but cannot support the literal or all-country claim.

Candidate, opponent, settings, quit suppression, and literal endpoint match the
HFO protocol: current default `StrongBot`/`StrongStrategy`, exact external
Supalosa, mirrored country, `shortGame=false`, 10,000 credits, no superweapons,
90,000 ticks, and a win only after physical destruction of every enemy building.

First run an outcome-blind deterministic gate for both maps, every country, and
both slots. Then run ten fresh seeds per map-country cell with reciprocal slots:

$$2	imes9	imes10	imes2=360	ext{ literal games}.$$

Use technical seed base `4,230,090,000` and pilot seed base `4,230,100,000`.
There are no retries or start/outcome filters.

Advance only if the pooled one-sided 95% lower literal-win bound exceeds 0.5;
wins exceed losses on each map, in both factions, in both slots, and in at least
seven countries; each map has both physical starts represented; and the complete
technical gate passes. A pass authorizes a larger fresh confirmation and
multi-opponent evaluation, not a general-map claim.
