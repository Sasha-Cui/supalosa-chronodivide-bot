# Deterministic annotated game-frame protocol V1

Status: **prospectively frozen after competitive empirical completion and before
viewing or rendering any candidate paper frame**

## Purpose and evidentiary boundary

Game images explain measured behavior; they do not select policies, cases, or
claims. Every frame must be reproduced from an immutable completed aggregate by
a deterministic rule fixed here. No visually attractive, favorable, or easier
game may replace the selected case after rendering.

The existing `VisualisedBot` cannot directly provide paper evidence because
it subclasses `SupalosaBot`. Replacing a confirmed StrongBot policy with that
class would change the evaluated agent. Its drawing logic may be refactored
into a passive renderer, but the confirmed candidate, opponent, seed, map,
country, start, slot, and literal endpoint must remain exact.

## Eligible completed campaigns

Only these frozen campaigns may supply the primary paper frames:

1. HFO deployed confirmation: array `23425662`, finalizer `23425663`,
   source `f8d5a9961a6e1dd2746cd5c03b6b0793ba73ba02`, aggregate SHA-256
   `a734acf077540793e309834f0bda7bcd4a34fde9f95d5457921303bb8d743cc8`.
2. Peak profile-scope replication: array `24232910`, finalizer
   `24232911`, source `8c73a32a18e04500dc7c52a83264460c01a13f66`,
   previous-stage SHA-256
   `ca9d9b5ba1de0c00909a6e6c59768a9fa3686b45e8cc70183572723b1ed9229d`,
   aggregate SHA-256
   `f970f197ee106408ae0842bd466b073f540cc623b8b96a41d5e838061a1b0285`.
3. HFO RA2Web Advanced paired cross-play, only for a limitation panel:
   array `23456957`, finalizer `23456958`, aggregate SHA-256
   `a287271ba7f223eac669556c8ab895819a55a3c05b06a4c370a21eccb685761d`.

Development screens, rejected arms, old pilots, and unsealed populations may
not supply primary figures. A category is omitted if its exact replay fails or
its registered event is absent.

## Passive renderer

Implement `GameStateFrameRenderer` as a standalone observer. It receives a
read-only `GameApi`, participant identities, immutable metadata, and optional
telemetry after an engine update. It must not subclass a bot, instantiate an
agent, call an action or production method, change callbacks or randomness,
mutate game objects, or expose state unavailable to the policy being described.

Render at eight pixels per tile with an opaque metadata panel. Use explicit
high-contrast colors:

- terrain: off-white land, medium-gray road/cliff/rock, and blue water;
- candidate units/buildings: lime with a near-black outline;
- opponent units/buildings: red with a near-black outline;
- neutral objects: gray;
- ore and gems: yellow and cyan at 50% opacity;
- registered route or motion history: cyan, at least three pixels wide;
- candidate force: yellow ring;
- remaining opponent building: magenta box;
- opponent combatant: orange box; and
- annotation panels: near-black background with white text.

Every PNG displays map, update and game time, explicit policy, country, start,
slot, opponent commit/version, requested seed, original scheduler job ID,
literal status when known, and abbreviated source, map, trajectory, replay, and
frame hashes. No text-bearing element may inherit foreground or background
color.

## Exact replay and noninterference

Replay the selected case through the existing deterministic seeded harness and
literal building-elimination instrumentation. Instantiate the exact confirmed
policy explicitly rather than relying on a later default. The passive renderer
may sample after every 60 updates and at registered event updates.

A replay is accepted only if all immutable endpoint fields match the original
cell:

1. winner, literal status, terminal update, building counts, and unit
   inventories;
2. normalized trajectory SHA-256;
3. requested seed, country, start, slot, map hash, and opponent identity; and
4. resignation-attempt and forwarded-resignation audits.

For the Peak paired figure, both deployed `weak_only/weak_only` and confirmed
`both/weak_only` replays must match their respective immutable cells. Calling
the renderer at the configured interval must also leave the replay trajectory
and endpoint unchanged compared with an otherwise identical renderer-disabled
run.

A mismatch invalidates the category. It never authorizes another seed, retry,
or case.

## Frozen category 1: reciprocal Peak macro profile

Population: all 90 confirmed Peak replication cases with candidate start
`(118,73)`. Outcome is not an eligibility field.

For every eligible case compute SHA-256 of
`peak-reciprocal|country|start|slot|seed|deployedJob|confirmedJob` and select
the lexicographically smallest digest. Replay both policies. Define the event
update as the first 60-update public trajectory snapshot at which the two
normalized public states differ.

Render a paired three-time sequence at the greatest snapshots not exceeding
event minus 300, event, and event plus 600 updates. If no divergence exists,
omit the category. Annotations may identify starts, bases, production,
candidate forces, and observed position differences. The caption may state
that reciprocal macro-profile application changes the trajectory and is
supported by the frozen ablation; it may not assign unrecorded tactical intent.

## Frozen category 2: literal final-building elimination

Population: all 633 HFO confirmed candidate wins. Requiring a win is intrinsic
to depicting literal elimination. Compute SHA-256 of
`hfo-final-building|country|start|slot|seed|job` and select the
lexicographically smallest digest.

Let the event be the literal terminal update. Render the greatest recorded
snapshots not exceeding terminal minus 600, terminal minus 300, and terminal.
Annotate remaining opponent buildings, candidate combatants, opponent
combatants, and observed building-count changes. If an opponent armed force
survives while the final building is eliminated, state that observed fact; do
not claim the policy intentionally bypassed that force unless action telemetry
names the target.

## Frozen category 3: HFO force-clearance transition

Use the same case selected for category 2; no alternative case may be searched.
During replay, define the event as the first update at which opponent
combatants fall from positive to zero while at least one opponent building
remains and literal candidate victory follows within 2,400 updates.

Render event minus 300, event, and event plus 600, or the literal endpoint if
earlier. If the registered event is absent, omit this category. The caption may
describe the observed clearance followed by building attack, but not a causal
choice unsupported by telemetry.

## Frozen category 4: honest HFO liveness limitation

Population: the four HFO confirmation draws that reached the 90,000-update
cap. Compute SHA-256 of
`hfo-tick-cap|country|start|slot|seed|job` and select the lexicographically
smallest digest.

Render updates 72,000, 81,000, and 90,000. Annotate surviving buildings,
combatants, and physical building-count or hit-point progress. This panel is a
limitation, not evidence for the winning mechanism. If exact replay fails, omit
it without replacement.

## Optional limitation panel: cross-opponent transfer

If page space permits, use all 360 balanced cross-play cases without an outcome
filter. Select the lexicographically smallest SHA-256 of
`advanced-transfer|country|start|slot|seed|strongJob|supalosaJob`.
Render paired terminal-context frames for StrongBot and pinned Supalosa against
the same frozen Advanced opponent. The caption reports only the registered
aggregate boundary and observed state; it does not infer general opponent
strength from one image.

## Annotation and manifest rules

All annotations are generated from public object IDs, rules, coordinates,
owners, hit points, building/combatant classifications, observed motion
history, and registered policy telemetry. Never draw a target, route, protected
force, or intent that is not represented in the manifest.

Write one immutable JSON row per frame with:

- category and selection SHA-256;
- campaign, aggregate, cell, source, runtime, map, and opponent hashes;
- policy/configuration, country, start, slot, seed, job, update, and endpoint;
- replay trajectory and renderer-disabled equivalence hashes;
- annotation object IDs and semantic labels;
- renderer commit and PNG SHA-256; and
- a factual caption.

Generate a contact sheet and paper panels only from this manifest. The artifact
release includes renderer, selection/replay code, manifest, annotations, and
derived PNGs when map imagery is legally releasable. Proprietary runtime
content remains excluded.
