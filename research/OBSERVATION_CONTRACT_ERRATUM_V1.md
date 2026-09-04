# Observation-contract erratum V1

Date: 2026-09-04

Status: non-retroactive correction; frozen historical records remain unchanged

## Correction

Several frozen records used “public state” to mean state reachable through the
publicly callable `GameApi`. That phrase was ambiguous and, where it implied
fog-visible information, incorrect. Public API accessibility is not the same
as public or human-observable game information.

In particular:

- `research/METHOD_V3_PROSPECTIVE_PROGRAM.md` describes an independently
  loaded baseline but does not disclose unequal feature use;
- the frozen V3/V8 records call opponent credits or detector inputs “public”;
  opponent credits, power, and radar state are hidden economic state; and
- the deterministic frame result and paper call its output “public-state
  rendering,” although the passive evaluator reads `getAllUnits()` and both
  players' economic state.

Those records are preserved because they document what was frozen and run.
Future protocols, results, figures, and the paper must use the corrected terms
below.

## Authoritative source audit

The exact external Supalosa checkout is
`/nfs/roberts/project/pi_jss233/zc362/chrono_divide/supalosa-chronodivide-bot`
at commit `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`. Its compiled bot JavaScript
contains:

- zero `getAllUnits()` calls;
- 34 `getVisibleUnits()` calls;
- four `getUnitsInArea()` calls; and
- no direct opponent-credit read pattern.

`getUnitsInArea()` is not documented as visibility-filtered. Pinned Supalosa
uses it for sector threat and local occupancy. Supalosa therefore must not be
described as strictly fog-respecting.

The workspace `node_modules/@supalosa/chronodivide-bot` package is not that
baseline. It resolves to the candidate fork's file dependency; its compiled
tree is byte-identical to the candidate package and contains 11
`getAllUnits()` calls. Using that alias to characterize the external baseline
is a provenance error. The dedicated research test
`research/tests/observation-contract-provenance-v1.test.mjs` resolves and
checks both roots explicitly.

StrongBot's primary enemy-state helper enumerates `getAllUnits()` and filters
after enumeration. V3 additionally reads opponent credits at update 1,200;
its selected threshold is 7,798. These are full-state features. They are not
train/test leakage when the benchmark explicitly permits the unrestricted
API, but they are unequal information use relative to pinned Supalosa and are
not fog-of-war or human-observability parity.

## Correct terminology

- **API-full-state benchmark:** the native Chrono Divide bot API is available
  to both agents, including calls capable of exposing hidden state. Algorithms
  may choose different fields.
- **Fog-visible state:** only self/allied state, currently visible hostile or
  neutral state, declared match metadata, and explicitly defined immutable
  last-seen observations.
- **Omniscient evaluator schematic:** an author-generated analytical diagram
  created from passive full-state instrumentation. It is not a native game
  screenshot or a bot-visible-state rendering.

Never use “public credits,” “public-state detector,” “equal feature use,” or
“fog-respecting” for the historical V3/full-state condition.

## Required sensitivity

The final study must report the native API-full-state result and a separate
symmetric observation-firewall result. The firewall must be applied to both
agents and cover:

1. `getAllUnits()` and `getUnitsInArea()` enumeration;
2. `getUnitData()` and `getGameObjectData()` hidden-object refresh;
3. opponent credits, power, and radar fields;
4. superweapon state and globally delivered events;
5. direct target-object actions on nonvisible hostile IDs; and
6. immutable last-seen snapshots, disappearance, neutral ownership,
   alliances, and slot symmetry.

An enumeration-only shim is not a strict fog-of-war evaluation. The firewall
must pass an outcome-blind all-topology purity gate before competitive use.
Both competitive results must be reported even if the sensitivity is
unfavorable.

## Figure correction

Existing deterministic frames remain useful as audit diagrams. Relabel them
as omniscient evaluator schematics and keep them separate from authentic
client-rendered Chrono Divide screenshots. Any manuscript screenshot must
bind the replay, client, asset, map, opponent, policy, seed, job, tick,
viewport, raw image, and annotation-transform hashes.
