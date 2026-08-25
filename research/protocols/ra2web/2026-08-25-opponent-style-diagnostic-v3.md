# HFO outcome-blind opponent-style diagnostic V3

Status: **prospectively frozen before V3 selection or technical traces**

## Motivation and decision boundary

The balanced Advanced cross-play and V2 factorial show that the deployed
policy is strongly opponent specific and that disabling map profiles or exact
tick tactics cannot repair it. A robust policy therefore requires either a
single minimax specialist or an observation-conditioned mixture.

V3 tests only whether Supalosa-like and RA2Web-Advanced-like behavior can be
identified early from state available through the public game API. It is a
technical diagnostic: no W/D/L, score, terminal building count, literal
endpoint orientation, policy ranking, or competitive selection is permitted.

Passing V3 authorizes training a separately frozen Advanced specialist and an
adaptive mixture. It does not authorize any strength claim or deployment.

## Fixed opponents and first player

Use default deployed StrongBot as the fixed first player against:

- exact external Supalosa commit
  `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`; and
- exact RA2Web Advanced bundle SHA-256
  `81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143`,
  freeze-manifest SHA-256
  `a405c0fc6d1d6541f965582c9b53be0bfd01c0c68f4d0f340e1a5ae37671aa5d`.

The same country, physical starts, participant slot, and engine seed are paired
between opponents.

## Outcome-blind fresh cases

Use every country, physical HFO start, and first-player slot. For country
ordinal `c`, start ordinal `s`, slot `q`, and offset `o`, enumerate

$$
4{,}263{,}000{,}000 + 100{,}000c + 20{,}000s + 10{,}000q + o.
$$

Select the first exact-start case per country/start/slot cell with zero
updates. Require 72 unique cases: eight per country, 18 per start, and 36 per
slot. Run both opponents on every case: 144 technical traces. All earlier seed
families are barred.

## Fixed trace horizon and state

Use the exact HFO Snow runtime, 10,000 credits, `shortGame=false`, no
superweapons, and symmetric resignation suppression. Run exactly 3,600 updates
and record snapshots at ticks 300, 600, 900, 1,200, 1,800, 2,400, 3,000, and
3,600. Fail the technical cell if the engine finishes or a resignation is
forwarded before the horizon.

At each tick, construct features solely from state available to the first
player through its supplied public `GameApi`:

- opponent credits;
- opponent object count and aggregate hit points by `rules.name`;
- opponent building and non-building counts by `rules.name`;
- total opponent buildings, non-buildings, and aggregate hit points;
- minimum, median, and mean squared tile distance of opponent non-buildings
  from the first player's start; and
- counts of opponent non-buildings within squared radii corresponding to 24,
  48, 72, and 96 tiles from the first player's start.

Sort feature keys lexicographically and serialize finite numeric values only.
Object IDs, opponent name strings, bot class, bundle metadata, build ID,
action calls, production queues, internal fields, source path, country, start,
slot, seed, and scheduler metadata are prohibited classifier inputs. Country,
start, slot, seed, and true opponent label may appear only as evaluation
metadata outside the feature vector.

## Determinism and artifact rules

Each trace records the feature vector at every fixed tick, source/runtime
commitments, and the technical opponent label (`supalosa` or `advanced`). It
must not record any competitive outcome field. Hash the exact feature sequence.

Require all 144 traces under `pi_jss233`, complete 72-case pairing, exact
opponent identities, no early finish, no forwarded resignation, and no
forbidden classifier feature. There are no retries, replacements, or selective
exclusions.

## Frozen classifier search

For each candidate snapshot tick independently, search deterministic
axis-aligned binary decision trees of maximum depth three. Candidate split
thresholds are midpoints between distinct training values. Require at least
five training samples per leaf. Optimize balanced accuracy, then ordinary
accuracy, then fewer leaves, shallower depth, lexicographically earlier feature
key, lower threshold, and deterministic preorder serialization.

All threshold generation, missing-feature handling, feature selection, and
tree fitting occur inside each training fold. Test labels cannot influence a
fold's tree.

Evaluate three fixed grouped cross-validation schemes:

1. leave one of nine countries out;
2. leave one of four physical starts out; and
3. leave one of two participant slots out.

Report accuracy, balanced accuracy, per-class recall, confusion matrix, and
one-sided 95% Wilson lower bound for ordinary accuracy for each scheme and
tick. Also report exact paired-feature hash equality or divergence between the
two opponent traces for every case.

## Technical pass rule and selected detector

Select the earliest snapshot tick that satisfies all of:

1. ordinary and balanced accuracy are at least 0.95 in every grouped scheme;
2. both class recalls are at least 0.95 in every grouped scheme;
3. the one-sided 95% Wilson lower bound for ordinary accuracy exceeds 0.90 in
   every grouped scheme; and
4. no prohibited feature or metadata enters any fitted tree.

If more than one full-data tree at that tick ties under the frozen criteria,
use the deterministic complexity and lexicographic tie breaks above. Freeze
the selected tick, ordered feature schema, final full-data tree, trace hashes,
and cross-validation report before any adaptive competitive game.

## After V3

On pass, keep the confirmed Supalosa expert unchanged. Prospectively train an
Advanced specialist with a worst-country/start objective, then evaluate the
frozen observation-conditioned mixture on disjoint cases against both
opponents. The detector decision must use only its frozen public-state tree.

On failure, do not inspect competitive subsets or handcraft an identity test.
Proceed instead to a single-policy minimax multi-opponent optimizer, preserving
the negative generalization result as a paper finding.
