# Mission-Native Closeout: Amendment 9

Date: 2026-08-14

Status: completed outcome-free V8 gate and prospective V9 freeze

## Completed V8 evidence

The readiness-gated V8 compatibility run completed as Slurm job `22214992`
under account `pi_jss233`.

- source commit: `b543ef67033f30605b6c1ec15ede915c332645fb`
- artifact: `research-evidence/mission-native-closeout/outcome-blind-compatibility-v8/22214992/compatibility-v8.json`
- artifact SHA-256: `b91e39c7ccddc26bd49cc39aa272499c0048498372ae62b4da199f12ac823d50`
- scheduler state: `FAILED`, exit code `1:0`, elapsed `00:06:35`
- artifact status: `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V8`
- coverage: 9 countries, 2 reciprocal slots, 4 deterministic games per cell,
  72 games
- disabled-policy equivalence: 18/18 cells
- enabled repeat determinism: 18/18 cells
- resignation attempts: none
- outcome inspected: no

The scheduler failure is the gate's intentional fail-closed exit after writing
the complete artifact.

## Outcome-free findings

V8 activated in nine of eighteen country-slot cells. Every activated cell
issued commands and physically damaged a building. Across those cells:

- aggregate physical building damage was 732;
- phase-pure blocker allocations numbered 223;
- phase-pure building allocations numbered 142;
- mixed allocations numbered zero;
- persistent-blocker heartbeat intervals numbered 67; and
- readiness-blocked evaluations numbered 48.

The other nine cells never activated and therefore issued no closeout command.
They were Americans in both slots, Germans in both slots, British slot 0,
Africans in both slots, Confederation slot 1, and Russians slot 1. Five
successful Allied cells activated at tick 2,940 after an initial readiness
block. Four successful Soviet cells activated immediately at tick 2,700. No
target order preceded activation.

V8 establishes a useful precision/recall distinction. When its direct
building-race certificate fired, execution caused physical damage in every
cell. Passive preservation of Supalosa control, however, did not reliably
assemble a certificate-bearing force: half of the cells remained blocked
through tick 5,400. V8 is therefore rejected as a complete closeout policy,
and the gate does not authorize an outcome-bearing screen.

## Frozen V9 mechanism: dual-track reinforcement reserve

V9 preserves the V8 objective-relative activation certificate and the entire
V7 post-activation controller. It adds one preparatory mechanism for cells that
are not yet ready.

1. On the first readiness block, snapshot the combatants already present as the
   active vanguard. Do not disband their Supalosa missions or replace their
   orders.
2. Create a lower-priority readiness-reserve mission. It may claim only eligible
   combatants that appear after the vanguard snapshot and that are not already
   locked to another mission. Existing frontline units remain under Supalosa.
3. Hold claimed reinforcements at the player's rules-provided start location
   with ordinary move orders. The reserve issues no attack order and requests
   no country-specific unit type.
4. Continue normal Supalosa production, defense, scouting, and vanguard combat
   while the reserve grows. Re-evaluate the unchanged V8 target and completion-
   race certificate on every strategy update using all currently available
   compatible attackers.
5. Once the certificate passes, disband the reserve, preempt the predecessor's
   attack missions, and transfer all eligible attackers to the unchanged V8
   closeout mission. The closeout mission has higher priority than the reserve,
   so the handoff is deterministic on the disband update.
6. If the certificate never passes, V9 never issues a closeout attack. It does
   not convert elapsed time, country, slot, coordinate, unit count, or target
   name into a hidden activation threshold.

This mechanism separates continuous pressure from reinforcement preservation:
the vanguard keeps attacking while newly produced units are protected from
piecemeal attrition. The launch decision remains tied to destroying a building,
not to defeating the entire enemy army. A single attacker still launches
immediately against an exposed final building even if 100 enemy tanks are off
route.

## V9 outcome-free gate

Pure tests must establish that the reserve excludes the frozen vanguard,
claims later eligible units, retains claimed units, and yields them to the
higher-priority closeout handoff. The live gate uses fresh seeds and all nine
countries with reciprocal slots. It retains exact disabled equivalence,
repeat determinism, no resignation, command intervention, no pre-activation
closeout order, both phase-pure branches, and physical building damage in all
18 cells. It additionally requires reserve creation, positive reserve growth,
and a reserve-release event before activation in at least one cell.

If any cell fails, no outcome is inspected. If the gate passes, the first
outcome-bearing open-development screen compares exact Supalosa self-play, V8,
and V9 on fresh development seeds so the reinforcement-reserve mechanism is
causally isolated.
