# Deterministic game-frame selection V1 result

Status: **complete; cases frozen before confirmed replay or frame rendering**

## Inputs and execution

- Primary protocol commit: `de14cff`; SHA-256
  `12137be6cbe8ce120072c657c0408ab8245986dcb5e44bbebd47f13575f2295d`.
- HFO schema amendment commit: `d86f235`; SHA-256
  `2b45ef808c631ced4a75dd38353075474d8826972a6e59df2d33a37902bd0d91`.
- Selector implementation/fix: `4b6b794`/`5620bab`.
- Selector source:
  `5620bab34d3a674251e31e202c2c0958bb7f954f`.
- Selector program SHA-256:
  `edb6416383825efbdee223c57e5acf3a0809fcc9ca7e6d318b843104cda7ddab`.
- HFO aggregate SHA-256:
  `a734acf077540793e309834f0bda7bcd4a34fde9f95d5457921303bb8d743cc8`.
- Peak aggregate SHA-256:
  `f970f197ee106408ae0842bd466b073f540cc623b8b96a41d5e838061a1b0285`.
- Selection artifact SHA-256:
  `ddb7a4c02ff6f39d68c5f09bdda0416eb32c9cfd9b8231661e5cad805e99d4f8`.

The selector initialized no game and executed no renderer. Its first invocation
did not start because the direct Node binary lacked its module library path. A
second invocation failed closed before artifact creation because the HFO kind
check omitted the exact `finalizer` suffix. Commit `5620bab` corrected only
that schema literal; tests passed and the unchanged selector then produced one
immutable artifact. Neither failed technical attempt selected, replayed, or
rendered a case.

The Git diff from confirmed HFO source
`f8d5a9961a6e1dd2746cd5c03b6b0793ba73ba02` to selector source changes only
`strongStrategy.ts` and `strongBot.ts` inside the bot core, through
Peak-gated scope support. The exact core diff SHA-256 is
`7c31a4aa705bad6bd5b6c763866d3f6557be5f706f796c7715c7e1e465d83fb0`.

## Frozen Peak reciprocal case

- Selection SHA-256:
  `027c9ee244322cbb9a43640648e78733c5439d88a0034610aab7b3d8c3241aba`.
- Selection input:
  `peak-reciprocal|Arabs|118,73|0|4282061012|24233204|24233628`.
- Country/start/slot: Arabs, `(118,73)`, slot 0.
- Requested seed: `4282061012`.
- Deployed control: task 133, job `24233204`, trajectory
  `fdbe39a979cccfaf606709da319921b0b7d72aed8fb303a22b5bbec270eff532`,
  9,431 updates, baseline win.
- Confirmed `strategy_both`: task 313, job `24233628`, trajectory
  `d097e8395d16a186c4fb641f4f4ae41dbd392e0d5c7b74f2229d1b5501af9898`,
  9,940 updates, candidate win.

Outcome was not an eligibility or hash field. The case is the lexicographically
smallest registered digest across all 90 reciprocal-start replication pairs.

## Frozen HFO final-building case

- Selection SHA-256:
  `00a241c6d4558696778f629e7cdf0a3ee3dee7e5db79c1a148ffc5e4db3f17de`.
- Selection input:
  `hfo-final-building|Germans|88,34|1|4260350026|23429071`.
- Task/job: 296 / `23429071`.
- Country/start/slot: Germans, `(88,34)`, slot 1.
- Requested seed: `4260350026`.
- Literal result: candidate win at update 19,667, with 13 candidate buildings
  and zero opponent buildings.

The terminal inventory retains two opponent infantry and one engineer while
all opponent buildings are gone. If exact replay passes, this case can
factually illustrate the user-specified win condition and final-building
elimination despite surviving enemy forces. The force-clearance category is
bound to this same case; it will be omitted if the registered zero-combatant
transition does not occur.

## Frozen HFO tick-cap case

- Selection SHA-256:
  `23b692cab216ff28bd0974dc82a1deb753363e8369349b3c6c0ed00ec10abee7`.
- Selection input:
  `hfo-tick-cap|Germans|88,157|0|4260360028|23429256`.
- Task/job: 306 / `23429256`.
- Country/start/slot: Germans, `(88,157)`, slot 0.
- Requested seed: `4260360028`.
- Registered endpoint: 90,000-update draw with 11 candidate and three opponent
  buildings.

This is the lexicographically smallest digest across the four frozen tick-cap
draws. It is an honest liveness limitation, not a positive mechanism example.

## Omitted category

The optional RA2Web Advanced panel is omitted under protocol amendment 1
because its older schema lacks trajectory hashes and exact bundle replay is a
separate requirement. No substitute case is permitted.

## Next gate

No selected frame may enter the paper until explicit-policy replay reproduces
all immutable endpoints, Peak trajectory hashes, and renderer-disabled/enabled
noninterference. A failed case is omitted without retry or replacement.
