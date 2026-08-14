# Mission-Native Closeout: Amendment 8

Date: 2026-08-14

Status: completed outcome-free V7 gate and prospective V8 freeze

## Completed V7 evidence

The reinforcement-suppression V7 gate completed as Slurm job `22213973`
under account `pi_jss233`.

- source commit: `b2561a7751a4ebd2ab9a30485016f0b7ee055a7e`
- artifact: `research-evidence/mission-native-closeout/outcome-blind-compatibility-v7/22213973/compatibility-v7.json`
- artifact SHA-256: `48d6f8f4cfd827d320470e57f201bd0707661f47244aa1507b60d793cb253ab6`
- scheduler state: `FAILED`, exit code `1:0`, elapsed `00:08:05`
- artifact status: `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V7`
- coverage: 9 countries, 2 reciprocal slots, 4 deterministic games per cell,
  72 games
- disabled-policy equivalence: 18/18 cells
- enabled repeat determinism: 18/18 cells
- enabled command intervention: 18/18 cells
- global validation errors: none
- outcome inspected: no

The scheduler failure is the gate's intentional fail-closed exit after writing
the complete artifact.

## Outcome-free findings

- cells with physical building damage: 7/18;
- aggregate physical building damage: 426;
- phase-pure blocker allocations: 599;
- phase-pure building allocations: 102;
- persistent-blocker heartbeat intervals: 115;
- blocker-to-building transitions: 5;
- reinforcement targets exercised: `GAPILE`, `GAWEAP`, `NAHAND`, and `NAWEAP`;
  and
- one zero-damage cell reached the external no-army/no-production resignation
  condition.

The structural target interface executed, but aggregate damage and cell
coverage were both lower than V6. Reinforcement-source priority is therefore
rejected as a sufficient repair.

All eleven zero-damage cells began closeout ownership in a blocker-clear phase
with either one Soviet infantry or five Allied infantry. None ever issued a
building-phase decision. All five damaging Allied cells began with ten infantry,
cleared blockers under V7, reached twelve attackers, and transitioned to the
barracks at tick 2,988. The two damaging Soviet cells began with seventeen
infantry and entered a building phase immediately. This pattern survives the
V7 target intervention: premature ownership by a small force, rather than
target class alone, is the remaining common mechanism.

The V7 gate does not authorize an outcome-bearing screen.

## Frozen V8 mechanism: readiness-gated mission takeover

V8 preserves V7's reinforcement-source target ranking and all V6 engagement
mechanisms. It changes only the condition under which the closeout overlay
preempts Supalosa and takes ownership of combatants.

At or after the existing minimum tick, while the enemy-building-count gate is
satisfied:

1. Rank one feasible target with the same structural priority, capability, and
   reachability rules that the mission will use after activation.
2. Evaluate the existing public-state completion-race certificate with the
   currently available compatible force and route threats.
3. If any attacker is already in the target firing perimeter, no certified
   route threat exists, or estimated building completion is no slower than
   estimated force survival, activate the closeout mission and preempt the
   predecessor's attack missions exactly as before.
4. If route interception is predicted to win, do not create the closeout
   mission and do not preempt Supalosa. Supalosa continues ordinary production,
   scouting, defense, and active force combat. Re-evaluate readiness on the next
   strategy update.
5. If no compatible reachable target is available, likewise preserve Supalosa
   ownership rather than creating a non-executable closeout mission.
6. Once the closeout mission activates, it remains latched and uses the frozen
   V7 phase-pure persistent-clearance controller. V8 does not add oscillatory
   release and reacquisition of the whole mission.

This gate is objective-relative, not a fixed army-size threshold. One attacker
may activate against an exposed final building when the strike is feasible. An
army of any size that is off the strike route cannot block activation. Conversely,
a large but badly positioned force is not assumed ready merely because its unit
count exceeds a tuned constant.

## V8 outcome-free gate

Pure tests must cover immediate activation against a final building with 100
off-route enemy tanks, blocked activation when the same force lethally
intercepts the route, and immediate activation for an attacker already in
firing range. The live gate uses fresh seeds and retains exact disabled
equivalence, repeat determinism, all nine countries, reciprocal slots, no
resignation attempts, enabled command intervention, both phase-pure branches,
and physical building damage in all 18 cells. It additionally requires at least
one readiness-blocked event before activation and verifies that no closeout
orders precede the activation event.

If any cell fails, no outcome is inspected. If all cells pass, the first
outcome-bearing open-development screen compares exact Supalosa self-play, V7,
and V8 so that takeover readiness is causally isolated. No fixed country, slot,
coordinate, target name, or outcome-dependent exception is permitted.
