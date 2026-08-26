# HFO RA2Web-Advanced early-production technical V6 result

Status: **complete; technical gate failed only on vehicle-focus actuation**

## Identities and complete coverage

- Zero-update selector: job `23683567`, 76 initialized games, 18 selected
  west-versus-east cases, two per country and nine per participant slot.
- Selection SHA-256:
  `4f742b88e3137f8ac30188437c4a9025725334fa7ead2757bca4eb729c8e7340`.
- Preserved no-op compatibility smoke: job `23685949`, exactly 9,600 updates,
  nine snapshots, no early finish, no prohibited field, and zero no-op overlay
  action.
- Technical array: `23686026`, 108/108 tasks completed `0:0` under
  `pi_jss233`; no retry, replacement, exclusion, or partial-trace inspection
  occurred.
- Fail-closed finalizer: `23686027`, completed `0:0` after the full array.
- Aggregate SHA-256:
  `cc1f930b71a34214b8aa82f5e9b500fc1f9b2de8886b3084f98e2516235a1e4b`.
- Source commit:
  `c26153dd99e9bd8a0972619cc8ff16d73001abb1`.
- Program SHA-256:
  `952629527cda3b5f68920c166ff2b7c85310c7a28e142048c251892a80aadad5`.
- Protocol SHA-256:
  `7e8158f4661aced6d537877bb98d4f9d8ab2b993f2c4199c091817a825082812`.
- Asset-manifest SHA-256:
  `d942117f24363818977d573dbc87006a9b320c6861bddf939d5fc80db2217e67`.
- External Supalosa commit:
  `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.
- RA2Web client commit/release:
  `218fb800614295119e25040986b175fee4c3670f`,
  `0.84.1-r1d35349-dd6a17b9c`.
- RA2Web Advanced bundle/freeze-manifest SHA-256:
  `81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143`,
  `a405c0fc6d1d6541f965582c9b53be0bfd01c0c68f4d0f340e1a5ae37671aa5d`.

All 108 scheduler IDs and cell checksums passed. Every trace reached update
9,600 with exactly nine fixed snapshots and no early finish. Country/slot
coverage was exact for all six arms. The recursive audit found no W/D/L,
score, defeated side, endpoint orientation, terminal building count, or other
prohibited competitive field.

## Frozen gate results

| Arm | Available cases | Production-mutation cases | Attack cases | Trace-difference cases | Intended-count difference | Technically active |
|---|---:|---:|---:|---:|---:|---|
| No-op | 0 | 0 | 0 | 0 | 0 | Yes |
| Infantry rush | 18 | 18 | 18 | 18 | +2.000 | Yes |
| Tank rush | 18 | 18 | 18 | 18 | -1.944 | Yes |
| Dual rush | 18 | 18 | 18 | 18 | +6.722 | Yes |
| Tank production only | 18 | 18 | 0 | 18 | +0.333 | Yes |
| Vehicle focus | 18 | **6** | 18 | 18 | -2.333 | **No** |

Every arm had zero prohibited-queue action and zero window violation. The
no-op arm had zero overlay action in 18/18 cases. The production-only arm had
zero overlay attack in 18/18 cases. All attack-enabled arms issued an on-time
attack in 18/18 cases.

The gate's composition-direction requirement passed independently of the failed
vehicle arm:

- infantry rush intended-unit difference was `+2.000` overall, `+0.500`
  Allied, `+3.875` Soviet, `+2.778` slot 0, and `+1.222` slot 1;
- dual rush was `+6.722` overall, `+3.000` Allied, `+11.375` Soviet,
  `+7.333` slot 0, and `+6.111` slot 1.

Tank rush and vehicle focus had negative update-9,600 tank differences despite
executing attack orders. The production-only tank arm was mildly positive
overall but exactly zero in the Soviet stratum. Fixed-horizon composition is a
mechanism diagnostic only; none of these numbers measures W/D/L or strength.

## Failure diagnosis

The sole frozen failure was vehicle-focus production actuation: it replaced a
different active vehicle item in only 6/18 cases, below the required 12/18.
The intended tank was available in all 18 cases, and its attack interface fired
in all 18, so neither unit availability nor combat ordering caused the failure.
The replacement condition was too narrow: at its 600-update checks, the vehicle
queue was often idle, ready, or already held the intended tank rather than
actively producing a different item.

This diagnosis is derived entirely from prespecified technical telemetry. It
does not use or imply a competitive outcome.

## Consequence and prospective repair

The complete V6 gate is formally failed, so no competitive V6 campaign may
launch. Five arms, including infantry and dual production, are technically
validated, but the protocol required every arm to pass.

Repair only the failed vehicle interface on fresh outcome-free cases. A new
prospective amendment should retain the country-aware tank name and bounded
replacement rule while adding a queue-idle path; it must leave structures,
armory, infantry, aircraft, and ships untouched and revalidate mutation count,
timing, action hashes, and side/slot composition without W/D/L. The other five
arms must not be selectively rerun. Only after that repair passes may a separate
competitive protocol be frozen.
