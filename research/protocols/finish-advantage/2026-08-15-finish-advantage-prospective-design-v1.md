# Finish-advantage prospective design, version 1

Status: **prospective hypothesis record written before V5 confirmatory unblinding**

Recorded: 2026-08-15 UTC

## Claim boundary

This document fixes the next development hypotheses before any outcome from the
56-family V5 confirmatory population is read. It does not alter V5, authorize
access to partial confirmatory outcomes, or claim that any new policy wins.
All evidence motivating this design comes from permanently open families,
source inspection, and the literal game rule that a win requires physical
destruction of every enemy-owned building.

## Prior open evidence

Three independent 180-game exact-Supalosa control blocks are available on the
same ten permanently open map families, all nine countries, and reciprocal
slots. Their seed bases and result roots are:

- progress-certified V2, seed base `4,230,000,000`;
- mission-native V37, seed base `4,205,000,000`; and
- visibility-aware V5, seed base `4,215,000,000`.

In each complete block, exactly ten drawn games recorded at least one
*suppressed opponent* resignation attempt. Supalosa attempts resignation only
when public state contains no selectable combatant, no production building,
and no deployable base unit. Across all three blocks, these 30 draws span both
physical slots, 4--5 families per block, 6--9 countries per block, terminal
enemy-building counts from 1 through 12, and 18 tick-cap plus 12 nonliteral
termination draws. None also recorded the candidate in the same helpless
state; candidate terminal building counts ranged from 5 through 37.

The signal is diagnostic only. The policy must reconstruct the state from the
public game interface and must never observe resignation attempts, endpoint
state, winner fields, or evaluator-only destruction attribution.

The completed open V5 population leaves 102 draws. Five end at one enemy
building, 24 at two through five, 33 at six through nine, and 32 at ten or
more; eight end with zero buildings without the literal endpoint. V5 therefore
remains a narrow final-building kernel even if its sealed confirmation passes.

## Fixed intervention 1: irreversible-opponent conversion certificate

Preserve exact Supalosa and the frozen V5 final-building policy. At an AI
update, certify an irreversible opponent only when public complete state shows:

1. at least one enemy-owned building remains;
2. zero enemy-owned units whose rules are selectable combatants;
3. zero enemy-owned buildings with a non-`None` factory type; and
4. zero enemy-owned deployable base units named by the game rules.

The certificate is computed independently of Supalosa's resignation call. It
is revoked immediately if any counterplay asset reappears.

When the certificate holds and more than one enemy building remains:

- release the ordinary combat reserve because the opponent cannot fight or
  rebuild;
- retain Supalosa's economy, production, mission ownership, and ordinary update;
- choose one compatible reachable building target at a time by finite mission
  cost, then stable strategic value, distance, and object ID;
- concentrate the available compatible detachment on that target;
- approach an exact unseen building by attack-move to its coordinates and
  switch to direct attack after visibility, as in V5;
- retain the target while physical damage is occurring, switch immediately
  after destruction, and treat a bounded no-damage interval as a liveness
  failure; and
- if no compatible reachable attacker exists, issue no futile target order and
  leave Supalosa production active while reporting the missing capability.

Exactly one remaining enemy building continues to use V5's terminal race even
when enemy forces exist. Thus one reachable building versus 100 off-route tanks
remains a building strike; the irreversible certificate is an additional
multi-building state, not a restriction of the terminal rule.

## Fixed intervention 2: surplus-force building pressure

The broader candidate hypothesis retains enough candidate anti-ground
combatants under Supalosa control to cover the complete observed enemy mobile
force, and redirects only the numerical surplus to one building mission.

For `N` eligible anti-building combatants, `E` observed enemy mobile selectable
combatants, and margin `m`, the provisional cover is

`min(N, max(ordinary_base_reserve, E + m))`.

The remaining `N - cover` units form the building detachment. Units outside
the detachment keep Supalosa's orders. The irreversible certificate sets cover
to zero; the exact final-building terminal race retains V5's zero terminal
reserve and interception rule. Static defensive buildings are route threats,
not mobile cover demand.

The only candidate margins are `{0, 2, 4, 8}`. A complete observer-only state
audit may remove margins for inadequate intervention exposure, but may not add
new margins or rank them using competitive outcomes. At least one conservative
margin must remain as a causal arm if any surplus-force screen proceeds.

## Outcome-blind state audit

Before a surplus-force outcome screen, run one exact-Supalosa mirror population
on the ten permanently open families, all nine countries, reciprocal slots,
fresh seeds, and the 24,000-tick cap. The observer must issue no actions and a
trace-equivalence gate must establish exact behavior with and without it.

At fixed intervals and state transitions, record only public-state quantities:

- own and enemy building, factory, deployable-base-unit, mobile-combatant,
  static-defense, and compatible anti-building counts;
- candidate cover and strike sizes for every fixed margin;
- final-building and irreversible-certificate entry/exit;
- compatible target count, target visibility, reachability, estimated
  completion time, route-relevant forces, and current action-state counts;
- physical building-progress timing available through the ordinary policy
  interface; and
- no-progress durations.

Before any audit outcome is opened, select at most two surplus margins by this
fixed exposure order: retain margins that expose a nonempty building detachment
in both factions, both slots, at least eight countries, and at least five map
families; among retained margins choose the largest margin, then the smallest
margin whose median exposed detachment has at least two units. Ties use the
larger margin. If fewer than two satisfy the rule, use all that satisfy; if none
satisfy, do not run the surplus-force outcome screen. Competitive outcome,
country score, map score, and anecdotal game identity cannot enter selection.

## Required technical tests before outcomes

The implementation must prove:

1. disabled policy action-trace equivalence with exact external Supalosa;
2. deterministic repeat traces;
3. V5 final-building behavior is unchanged;
4. one building versus 100 off-route tanks attacks the building;
5. an on-route lethal force blocks or is cleared before the terminal strike;
6. three passive buildings with no combatant/factory/base unit activate the
   irreversible certificate and receive focused attacks;
7. any combatant, factory, or deployable base unit independently blocks that
   certificate;
8. certificate revocation returns multi-building control to Supalosa;
9. surplus cover arithmetic and unit partitioning for every frozen margin;
10. non-detachment units retain live Supalosa orders; and
11. telemetry contains no endpoint, winner, score, or evaluator-only fields.

All nine countries and reciprocal slots must pass the live compatibility gate
before competitive development.

## Development and confirmation rule

The first open causal comparison uses exact Supalosa, frozen V5, the fixed
irreversible-certificate policy, and at most two outcome-blindly selected
surplus-cover policies. It uses complete fresh-seed games on the permanently
open families and one fail-closed aggregate. No selective reruns are allowed.

A candidate can advance only if it has a positive family-clustered lower score
effect versus exact Supalosa, a positive incremental effect versus V5, more
literal wins and fewer draws than both, wins exceeding losses overall and in
both factions, broad country support, positive leave-one-family-out effects,
and no paired V5 win-to-draw or win-to-loss regression. Exact thresholds and
power are frozen in the executable campaign protocol before launch.

Any final superiority claim requires new outcome-blind map families. All 16
families in the older Method-v6 private confirmatory reserve are included in
the current 56-family V5 population and become ineligible for a later V6 claim
after V5 unblinding. They must not be relabeled or reused as fresh V6 evidence.

## Interpretation

The central hypothesis is safe advantage conversion, not unconditional
aggression. Forces are retained or cleared only to protect the path to zero
enemy buildings; surplus or terminal forces attack buildings. Stalemate while
a certified action exists is a controller-liveness failure. These hypotheses
remain unproven until complete open development and a new sealed confirmation.
