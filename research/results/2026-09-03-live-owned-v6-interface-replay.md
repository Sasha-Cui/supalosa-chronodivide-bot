# Version-6 interface replay: complete pass

The separate live-owned v6 evaluator passed all 36 targeted tests together
with the unchanged v5 evaluator and validated snapshot tests. The TypeScript
build passed. The passive dual-observer manager has explicit tests that
preserve the first v6 result even if the legacy observer later reports the
opposite result, and that cap only unfinished observers.

The v6 class was then replayed over ALL 40 retained combatant-owned case
streams: 79,728 update decisions matched the previously audited live-snapshot
adjudications exactly. Public events were deliberately delivered twice during
replay to test symmetric-observer deduplication. All 16 physical cases were
recognized; all 24 negative controls received no physical credit. This replay
created zero game instances.

## Reproduction and identities

Run node research/scripts/replay-live-owned-endpoint-v6.mjs after the driver
TypeScript build. See [case-level replay audit](2026-09-03-v6-interface-replay/cases.csv)
and [validation](2026-09-03-v6-interface-replay/validation.json).

- Source evidence aggregate:
  0f8525c2874c8fc99c04ba121687e03c76a1a3a86675b80d95b4af75c79034ba.
- V6 semantic specification:
  3bdd0713023800a36a1f38b9726c3d2f3d83b20323dd8ca0c3af6139603eda23.
- V6 compiled module:
  1ec063616a89ed6da779df1b55a34dbdc0ee5103c5b93f8f8dfc4afe940dcfca.
- Passive dual manager compiled module:
  40f07603b25c436f35fa4f68df0322bd81f9f130bd9a29a5d629865d6525d476.
- Unchanged legacy compiled module:
  51abc0ae861322841d03971b26c709cbea5f9a4ceed4b1b827aec205adfda578.
- Unchanged validated live-owned snapshot:
  9e6abc6d3ae2833c8c48377dc10e4349c1e788c8b87f8c4b32b77a6ada2ce6f7.

## Scope

The stored technical streams do not contain native defeated-side flags.
Their replay therefore checks physical decisions with a nonterminal engine
state; native-end/cap behavior is checked separately by synthetic truth tables.
It does not invent native flags or claim to have replayed native completion
from missing data.

No existing competitive runner was switched, no agent policy changed, and no
historical outcome was rescored. The fresh dual-endpoint protocol still
requires seed reservation, the zero-update selector, implementation of the
competitive driver, and noninterference canaries before the 2700-game stage.
