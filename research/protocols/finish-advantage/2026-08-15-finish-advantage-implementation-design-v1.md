# Finish-advantage implementation design, version 1

Status: **prospective, outcome-blind implementation record**

Recorded: 2026-08-15 UTC, before V5 confirmatory unblinding

## Purpose and claim boundary

This record translates the precommitted finish-advantage hypothesis into a
source-level design without reading any sealed V5 outcome. It is informed only
by source inspection, permanently open development artifacts, and public game
rules. It neither changes the active checkout nor claims that the policy wins.

The literal terminal objective is destruction of every enemy-owned building.
Enemy forces are instrumental: fight them when they can prevent that terminal
strike, threaten survival before it completes, or restore the opponent's
ability to fight or build. Do not make force elimination an independent goal.

## Decision hierarchy

At each eligible AI update, apply the following precedence:

1. If exactly one reachable enemy building remains, invoke the unchanged V5
   terminal controller. Commit the compatible strike force to the building;
   clear only route-relevant forces that make the direct strike non-survivable.
   A large off-route army is irrelevant if it cannot stop the strike before the
   building falls.
2. If more than one building remains and the public irreversible-opponent
   certificate holds, release the combat reserve and focus the compatible
   force on one reachable building at a time.
3. Otherwise, retain enough anti-building combatants under exact Supalosa
   control to cover the observed mobile enemy force plus a frozen margin. Only
   a nonempty numerical surplus may form a building detachment.
4. If the public safety analysis predicts that the protected base can fall
   before the proposed building mission completes, abstain from the overlay.
   Supalosa retains every order in that update.
5. If no compatible, reachable target exists or physical progress exceeds its
   deadline, abstain and let Supalosa scout, produce, defend, and reposition.

## Composite architecture

Do not broaden the frozen schema-v5 policy in place. Construct the candidate as
two independently stateful strategy wrappers around the pinned external
Supalosa `DefaultStrategy`:

```text
unchanged V5 final-building overlay
    -> finish-advantage multi-building overlay
        -> exact external Supalosa DefaultStrategy
```

Every update calls the inner strategy first. The multi-building overlay is
strictly inactive at enemy-building count one. The outer V5 overlay retains its
own memory, target, progress, and deadline state and issues the last order in
the update. This preserves the V5 final-building code and makes V5 a separately
ablatable component rather than silently changing its semantics.

The multi-building overlay must use a new exact-schema policy type and must not
be accepted by the frozen V5 validators or campaign code. Proposed fixed
fields are:

- `schemaVersion` and `mechanism` identifying finish-advantage;
- `enabled` and `multiBuildingMode`, with arms `irreversible_only` and
  `surplus_cover`;
- `informationInterface = public_complete_state`;
- `ordinaryBaseReserve`, `surplusMargin`, and the unchanged V5 mechanics and
  progress thresholds needed by the objective adapter;
- exact unseen-building order mode fixed to
  `attack_move_then_visible_attack`; and
- no endpoint, winner, resignation-attempt, or evaluator field.

## Public-state certificate

Use `publicEnemyUnits` and match the opponent's live recoverability state from
ordinary game objects. Let:

- `B` be enemy-owned buildings;
- `C` be enemy-owned units with `rules.isSelectableCombatant` (including any
  armed building carrying that rule);
- `F` be enemy-owned buildings with `rules.factory != FactoryType.None`; and
- `M` be enemy-owned units with `rules.deploysInto` whose rules name belongs to
  `game.getGeneralRules().baseUnit`.

The irreversible certificate is exactly

```text
|B| > 1 and |C| = 0 and |F| = 0 and |M| = 0.
```

This is reconstructed independently. The policy must never read or infer from
the instrumented `quitGame` call. Any member reappearing in `C`, `F`, or `M`
revokes the certificate before issuing a multi-building order.

## Surplus-force partition

For `N` own eligible mobile anti-building combatants, `E` public enemy mobile
selectable combatants, base reserve `r`, and frozen margin `m`, compute

```text
cover = min(N, max(r, E + m))
strike_size = N - cover.
```

Select cover units deterministically by minimum distance to the own starting
location, then object ID. They retain their live Supalosa orders. The remaining
units are eligible for the objective overlay; target-specific calibration and
reachability may reduce the issued strike further but may never borrow a cover
unit. If `strike_size` is zero, the overlay is action-free.

The irreversible certificate sets `cover = 0`. The final-building state does
not use this partition: it belongs exclusively to V5, whose terminal reserve is
already zero.

For the initial observer and open screen, `E` deliberately counts every
non-building mobile selectable enemy unit, even when its weapon class is not a
current ground threat. This is a conservative cover demand. Any later
threat-weighted replacement requires a separate prospective ablation.

## Target and threat handling

Rank only targets with at least one finite compatible mission. Use complete
mission cost first, then stable strategic removal value, distance, and object
ID. Retain a committed target while physical building damage continues.

Visible targets receive direct attack orders. Exact but currently unseen
targets receive attack-move to public coordinates and transfer to direct attack
after visibility, exactly as in V5. Forces are cleared only when the calibrated
route analysis predicts that they intercept lethally before building
completion. Static defenses and mobile units outside the route remain under
Supalosa unless they create the certified interception or base-survival
constraint.

For a surplus mission, fail closed before issuing any overlay order when:

- the safety certificate is incomplete;
- the earliest predicted base destruction is no later than proposed building
  completion plus the frozen safety margin;
- no target-specific compatible attacker remains after cover partitioning; or
- no finite direct or blocker-then-building completion route exists.

An irreversible-opponent mission has no enemy selectable combatant by
construction, but it retains reachability, compatibility, and liveness checks.

## Observer-only audit

Implement the state audit as a dedicated episode observer, not as an enabled
objective policy. It records public state after game updates and issues no
actions. A same-seed observed-versus-unobserved exact-Supalosa gate must match:

- literal outcome status and terminal tick;
- every disposition-history entry;
- suppressed-quit audit counts;
- terminal building counts; and
- a deterministic hash of ordinary action traces when available.

The audit may report only state exposure for the prospectively frozen margins
`{0, 2, 4, 8}`. Margin selection follows the precommitted exposure rule and
cannot use winner, score, terminal building advantage, or map anecdotes.

## Required unit and live tests

Before any competitive outcome is opened, prove:

1. disabled composite trace-equivalence with exact external Supalosa;
2. deterministic repeat traces for all nine countries and both slots;
3. identical V5 final-building decisions and order modes in the composite;
4. one reachable building versus 100 off-route tanks commits the strike;
5. on-route lethal interception clears only the necessary blocker;
6. three passive buildings and no `C`, `F`, or `M` activate full-force focus;
7. each of `C`, `F`, and `M` independently blocks the irreversible certificate;
8. certificate revocation is action-free unless surplus cover separately
   certifies a strike;
9. exact cover arithmetic and stable partitioning for every frozen margin;
10. cover units retain their Supalosa actions and are absent from issued target
    orders;
11. base-danger and incomplete-safety states issue no overlay order;
12. exact unseen targets use coordinate approach then visible direct attack;
13. physical progress resets the liveness deadline and target destruction
    advances deterministically to the next reachable building; and
14. telemetry schemas reject endpoint, outcome, score, and evaluator-only
    fields.

## Experimental decomposition

The first complete open causal screen uses paired games for:

- exact external Supalosa;
- frozen V5;
- V5 plus irreversible-opponent conversion; and
- V5 plus irreversible conversion plus at most two outcome-blindly selected
  surplus margins.

This identifies whether gains come from the low-risk certificate or the
broader allocation rule. Advancement requires a positive clustered effect
against both Supalosa and V5, more literal wins, fewer draws, no paired V5
win-to-draw or win-to-loss regression, both-faction strength, broad country and
family support, and a positive leave-one-family-out minimum. A new family
population, not any family consumed by V5, is required for the final sealed
claim.

## Implementation boundary discovered by source review

The existing `selectContinuousObjectiveMission` intentionally does not defend
the home base for a nonterminal multi-building mission. It was suitable for the
frozen terminal race but is unsafe as an unconditional broad controller. The
new multi-building layer therefore must combine cover partitioning with an
explicit action-free base-danger gate. Reusing the old low-building activation
unchanged would repeat the failure mode already observed in broad controllers.

This design remains unproven. It is a prospective implementation constraint,
not a result.
