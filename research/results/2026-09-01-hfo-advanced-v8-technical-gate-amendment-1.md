# HFO RA2Web Advanced V8 technical gate amendment 1 result

Status: **complete; outcome-blind technical gate passed**

## Execution identity

- Master selection job `24291942`, selection SHA-256
  `9730745e171ecc73531369ddfd8308700eec44a7586491852713806fb097f713`.
- Amended fallback probe `24375621_0`, cell SHA-256
  `9039525409e3e8c92e005ebf8a480e81d1189943202b0f5f8407b9e14ef0b26c`.
- Amended recover probe `24375622_36`, cell SHA-256
  `42978829a3f7c71cadf1c863607bc37c8e24122e3e2e86221761c71c821d4b09`.
- Full repaired array `24379572`, all 234/234 tasks completed `0:0` under
  `pi_jss233` with 234 distinct scheduler job IDs.
- Fail-closed finalizer `24379573`, completed `0:0` only after the full array.
- Aggregate SHA-256:
  `370f13b877004f3a4397fe9bbd4dd72867d66062fa6223736a028065435fd0da`.
- Source commit:
  `7643899253545cfac027cda4e539d872104d63cf`.
- Program SHA-256:
  `a65660764476eae3b34c94f37db3ae0664cfbce4c450b849186ad1bbbdcfd443`.
- Amendment protocol SHA-256:
  `109f61743a058ef12fe63c8a6705a571ad3d30b0b177b0b53cdbe046c5886a77`.
- Asset-manifest SHA-256:
  `d942117f24363818977d573dbc87006a9b320c6861bddf939d5fc80db2217e67`.
- Pinned Supalosa commit:
  `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.
- RA2Web client commit/release:
  `218fb800614295119e25040986b175fee4c3670f` /
  `0.84.1-r1d35349-dd6a17b9c`.
- Advanced bundle/freeze-manifest SHA-256:
  `81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143` /
  `a405c0fc6d1d6541f965582c9b53be0bfd01c0c68f4d0f340e1a5ae37671aa5d`.

No V1 completed cell was reused. No task was retried, replaced, or excluded.

## Gate results

- Fixed horizon: every cell reached exactly 9,600 updates without exposing an
  endpoint orientation.
- Candidate/opponent views: synchronized snapshots and canonical hashes passed
  in every cell.
- Determinism: all 13 prespecified task-0 arm repeats reproduced candidate,
  opponent, forwarded-action, ownership, and controller hashes exactly.
- Opponent detector: every Advanced fixture activated at update 1,200; every
  Supalosa fixture selected the inactive branch.
- Supalosa preservation: all 108 wrapped fixture/case traces and forwarded
  action hashes were exact to the 18 plain StrongBot controls.
- Exclusive ownership: no baseline call to an owned Infantry/Vehicles queue or
  non-harvester combatant was forwarded after Advanced activation.
- Fixture actuation: each of fallback, defense, recover, mixed, raid, and
  closeout activated in all 18 cases: 10 Allied, eight Soviet, nine per slot.
- Scope and purity: no W/D/L, score, defeated side, terminal building count,
  engine-finish flag, endpoint orientation, or ranking appeared.
- Scheduler: all 235 array/finalizer records completed `0:0` under
  `pi_jss233`.

## Decision

The V8 technical interface is eligible for the prospectively frozen competitive
search. This result is not evidence that any V8 policy is strong. Generation 0
must use the 96 immutable policies and fresh preselected cases, inspect no
partial outcomes, and retain survivors only through the frozen reducer.
