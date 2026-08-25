# HFO RA2Web-Advanced baseline-core overlay screen V4

Status: **prospectively frozen before V4 selection or competitive outcomes**

## Motivation and fixed architecture

V2 showed that the failed Advanced transfer is not repaired by disabling HFO
profiles or exact tick tactics around the global StrongStrategy. V3 showed that
the frozen opponents are perfectly distinguishable at tick 1,200 from public
state, so a separate Advanced expert is technically feasible.

V4 trains the first Advanced expert without modifying the confirmed Supalosa
expert. The expert uses exact Supalosa `DefaultStrategy` as its global
production, expansion, scouting, defense, and attack core. StrongStrategy is
constructed with:

- `preserveBaselineCore=true`;
- `defaultMapProfiles=false`;
- both HFO west profile switches false; and
- building elimination disabled.

StrongBot is constructed with `preserveBaselineCore=true`, startup map profiles
disabled, and exact-map tick routing enabled. Generic force attack, harass,
emergency defense, harvester harass, route attack, and west retarget are
explicitly disabled. Thus the screen tests only HFO overlay groups on a common
baseline core.

## Frozen arms

1. `external_supalosa`: exact pinned external Supalosa calibration control.
2. `overlay_full`: baseline core plus default configurable HFO guards and
   assault/closeout mechanisms.
3. `overlay_guards_only`: retain bottom and west home guards; disable all
   configurable HFO assault, sweep, closeout, demolition, pincer, and bottom
   retarget mechanisms.
4. `overlay_assaults_only`: retain configurable HFO assault and closeout
   mechanisms; disable bottom and west home guards.
5. `overlay_minimal`: disable both configurable overlay groups while retaining
   only the common exact-map hooks that have no public option.

The four overlay arms form a 2×2 guard-by-assault factorial. The assault-off
configuration sets `enabled=false` for `hfoCloseout`, `hfoWestSweep`,
`hfoEastSweep`, `hfoBottomSweep`, `hfoBottomPincer`, `hfoBottomCloseout`,
`hfoBottomDemolition`, and `hfoBottomRetarget`. The guard-off configuration
sets both home guards disabled. No threshold is tuned.

## Opponent and fresh population

Use only frozen RA2Web Advanced bundle SHA-256
`81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143`
under freeze-manifest SHA-256
`a405c0fc6d1d6541f965582c9b53be0bfd01c0c68f4d0f340e1a5ae37671aa5d`.

Use every country, HFO physical start, and first-player slot. For country
ordinal `c`, start ordinal `s`, slot `q`, and offset `o`, enumerate

$$
4{,}264{,}000{,}000 + 100{,}000c + 20{,}000s + 10{,}000q + o.
$$

Select the first exact-start case per country/start/slot cell with zero
updates. Require 72 unique cases, eight per country, 18 per start, and 36 per
slot. All earlier seeds are barred.

## Gameplay

Run all five arms once per case: 360 games. Use the exact Snow HFO runtime,
same-country opponents, literal all-building elimination, 90,000 ticks, 10,000
credits, `shortGame=false`, superweapons disabled, and symmetric resignation
suppression.

No retry, replacement, selective rerun, exclusion, or early outcome access is
allowed. At most 64 CPU tasks may run concurrently under `pi_jss233`.

## Frozen analysis

Report W/D/L, win probability, one-sided 95% Wilson lower bound, terminal time
and status, faction/start/country/slot strata, and W=1/D=0.5/L=0 paired score
differences from `external_supalosa`.

Use a one-sided 90% paired-t lower bound with `df=71` and `t=1.29376`. Report
descriptive guard main effect, configurable-assault main effect, and
guard-by-assault interaction from the four overlay arms.

## Advancement and ranking

An overlay advances only if all of the following hold:

1. overall wins exceed losses;
2. the one-sided 95% Wilson lower bound for win probability exceeds 0.5;
3. losses are fewer than external Supalosa losses on the same cases;
4. the paired score lower bound versus external Supalosa exceeds zero;
5. Allied and Soviet records both have wins exceed losses;
6. every start has wins at least losses and at least three starts have wins
   exceed losses;
7. every country has wins at least losses and at least seven countries have
   wins exceed losses; and
8. both participant slots have wins exceed losses.

Rank eligible arms by larger minimum country/start win rate, then higher pooled
win rate, fewer losses, larger paired mean, and declaration order.
`external_supalosa` cannot advance.

## After V4

On pass, replicate the unchanged winner on at least five fresh cases per
country/start/slot cell against Advanced with one-sided 95% paired and absolute
uncertainty. Then implement the tick-1,200 detector handoff and evaluate the
complete adaptive mixture—including the shared first 1,200 ticks and switching
cost—on disjoint cases against both opponents. The specialist may not replace
the confirmed Supalosa expert directly.

On no pass, preserve the factorial and proceed to a parameterized minimax or
Advanced-specific optimizer over the same baseline-core architecture. Do not
select favorable countries, starts, slots, or post-hoc mechanism combinations.
