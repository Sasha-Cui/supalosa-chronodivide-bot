# Deterministic game-frame replay V1 result

Status: **complete; exact replay, renderer noninterference, and visual QA passed**

## Execution and immutable identities

- Replay array: `24248519`; tasks 0--2 completed `0:0` under
  `pi_jss233` with unique scheduler jobs `24248521`, `24248522`, and
  `24248519`.
- Fail-closed finalizer: `24248520`, completed `0:0` after all three
  replay tasks.
- Replay source:
  `c647e7100cc4332ad609bdadf148b53af0a0b53e`.
- Replay program SHA-256:
  `a2d0994434fd191f16bae10cdd61e1cd6686b8736993baa3435e4581ab19be2c`.
- Passive renderer SHA-256:
  `6d42c9a4db8d6d5d875522fe1db434b3ada98db213a3ece22406e0636b818a04`.
- Frozen selection SHA-256:
  `ddb7a4c02ff6f39d68c5f09bdda0416eb32c9cfd9b8231661e5cad805e99d4f8`.
- Frame protocol SHA-256:
  `12137be6cbe8ce120072c657c0408ab8245986dcb5e44bbebd47f13575f2295d`.
- HFO schema amendment SHA-256:
  `2b45ef808c631ced4a75dd38353075474d8826972a6e59df2d33a37902bd0d91`.
- Asset-manifest SHA-256:
  `d942117f24363818977d573dbc87006a9b320c6861bddf939d5fc80db2217e67`.
- Pinned Supalosa commit:
  `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.
- Final manifest SHA-256:
  `5233530adb5d1a1fffd6c6929635d7b0ff2ed0d38c2e91366c1700b0069d2c08`.

The finalizer records `PASS_DETERMINISTIC_GAME_FRAME_REPLAY`: nine complete
replays and 15 immutable PNGs. The retained categories are Peak reciprocal
macro scope, HFO force clearance, HFO final-building elimination, and the HFO
tick-cap limitation. The optional Advanced panel remains omitted under the
prospective schema amendment.

## Independent integrity audit

An independent post-finalizer reducer rechecked:

- exact three-task scheduler coverage and `pi_jss233` accounting;
- all cell completion markers, JSON hashes, and empty stderr logs;
- source, program, renderer, protocol, amendment, selection, runtime, map,
  opponent, and original-job identities;
- every PNG signature, byte count, dimension, file hash, and one-to-one
  manifest mapping;
- original Peak trajectory hashes;
- HFO exact immutable endpoint fields;
- renderer-disabled versus renderer-enabled trajectory, endpoint,
  resignation, action-call, and production-call equality; and
- exact registered frame updates and category coverage.

The audit passed with zero discrepancy. Renderer instrumentation changed no
trajectory or endpoint. The 90,000-update HFO limitation replay generated
1,332,283 audited API calls in each independent pass with identical SHA-256.

## Peak reciprocal macro sequence

Frozen pair: Arabs, start `(118,73)`, slot 0, seed `4282061012`.

| Policy | Original job | Original trajectory | Literal endpoint |
|---|---:|---|---|
| Deployed `weak_only/weak_only` | `24233204` | `fdbe39a979cccfaf606709da319921b0b7d72aed8fb303a22b5bbec270eff532` | baseline win at 9,431 |
| Confirmed `both/weak_only` | `24233628` | `d097e8395d16a186c4fb641f4f4ae41dbd392e0d5c7b74f2229d1b5501af9898` | candidate win at 9,940 |

The public states are identical at update 600 and first diverge at the
prospectively defined 60-update checkpoint 900. Frames are fixed at updates
600, 900, and 1,500 for both policies. This supports a factual paired
illustration of how reciprocal macro-profile activation changes the trajectory;
the complete 180-case replication, not this image, supports the strength claim.

## HFO force-clearance sequence

Frozen case: Germans, start `(88,34)`, slot 1, seed `4260350026`,
original job `23429071`.

The public count trace contains the registered transition at update 18,900:
opponent selectable combatants fall from positive to zero while one opponent
building remains. Frames are fixed at updates 18,600, 18,900, and 19,500.
The literal candidate win follows at 19,667. Renderer-disabled and
renderer-enabled trajectories share SHA-256
`7e3d28539f661107381c3fc698acfa484e9f90422aff64f2e730f84ad35b9004`.

This is observed sequence evidence: blocking forces disappear, the building
remains, and the building is subsequently eliminated. It does not by itself
prove a counterfactual causal mechanism; the separately frozen retarget
ablations support the policy-level mechanism claim.

## HFO final-building sequence

The same immutable case supplies frames at updates 19,020, 19,320, and the
literal endpoint 19,667. All opponent buildings are destroyed at the endpoint,
while two enemy infantry and one engineer remain alive. The game nevertheless
ends in a candidate win because the frozen endpoint is literal all-building
elimination.

This directly illustrates the paper's objective semantics and the desired
force-versus-building behavior: surviving armed personnel do not need to be
destroyed after the final building is eliminated. The caption must state the
observed fact rather than infer an unrecorded target decision.

## HFO liveness limitation

Frozen case: Germans, start `(88,157)`, slot 0, seed `4260360028`,
original job `23429256`.

Frames are fixed at updates 72,000, 81,000, and 90,000. The case remains a
tick-cap draw with 11 candidate buildings, three opponent buildings, no
candidate mobile unit in the terminal inventory, and a surviving opponent
combatant. Its renderer-disabled and enabled trajectories share SHA-256
`db729c6f667cd2967a0261fd30012a445a3c4434231e687c85bdb26045675bf4`.

This is an honest failure example. It must not be presented as evidence for the
winning mechanism or replaced by a more attractive draw.

## PNG manifest

| Category/policy | Update | PNG SHA-256 |
|---|---:|---|
| Peak deployed | 600 | `d0d50ca1280bdbd7ee3f9acd75d5ccc3232af9f1101fabd2e9c198d6fec03937` |
| Peak deployed | 900 | `d5371ae055d86bcff927c7f57debe09a5fc80ae825620f305cf043ce0f108561` |
| Peak deployed | 1,500 | `59dcf23f7e1f5b71bd54f8b316f7469a140740f300542da1b9f153a8274d235c` |
| Peak confirmed | 600 | `04a8786ddc855647c5a6942ab41131909735c177c64fe3755f466fd1bab3192f` |
| Peak confirmed | 900 | `3df87f8e751c12b4fc089d66e37e202917982283130b0fe1592920bc851ccc8e` |
| Peak confirmed | 1,500 | `53a2c6a6440e9559728df6da4c552cb0608c15d0d1e8fc0412b016eaf3f94367` |
| HFO force clearance | 18,600 | `efb5f908c0c2b6799e315574220cc7aab0df8927bb1dd1f7b25a35547af5f181` |
| HFO force clearance | 18,900 | `c8c4268e53c4a56d4f6b981720f831fd9bb316eb1750118b8cb00b4211395c6b` |
| HFO force clearance | 19,500 | `6380940b9bddc426ee2ecd9bc150dd9d16e678ad8cf243ec58f60ac29cc9c566` |
| HFO final building | 19,020 | `1852649a28d26f407517dfe4a8bfea2d39ba0dee5e531ffb30b15d87672c672f` |
| HFO final building | 19,320 | `46043a3cbab08d4f40cf21aa75eeabcff0bc7df9d010066c23151bbab6126ed2` |
| HFO final building | 19,667 | `b7a4c8d2a40ff3a514433df83900255556739daa3c81aec556dde6ab5f4248ec` |
| HFO tick cap | 72,000 | `37c14f5a9013864b3da69b5affd125552f9d7a2540e8f445df56495eaf7d8e9e` |
| HFO tick cap | 81,000 | `8eaf280c6eb0c68f8857087f7e696330e1cfc45a87bd41c53c69524f8936b36a` |
| HFO tick cap | 90,000 | `36f412ed99b62a4872a626e434b3b87f22ed8be135451e74ac31d9336053b312` |


## Visual QA

Every original PNG was inspected. Metadata panels, map geometry, objects,
category titles, colors, and hashes are legible with explicit foreground and
background colors. No label is clipped into the metadata panel. Dense bases
produce overlapping black annotation labels in some full-map frames; these
overlaps are retained because cases and renders cannot be replaced after
viewing.

For the paper, deterministic crops or composites may enlarge registered regions
without changing pixels or annotations. The complete full-map PNGs remain the
authoritative sources and must accompany any crop manifest.

## Paper consequence

The paper now has non-cherry-picked visual evidence for:

1. identical pre-intervention Peak state followed by reciprocal-profile
   divergence;
2. force clearance followed by building elimination;
3. victory by destroying the final building despite surviving enemy personnel;
   and
4. a genuine long-horizon liveness failure.

These figures complement, but never replace, the replicated quantitative
results and mechanism ablations.
