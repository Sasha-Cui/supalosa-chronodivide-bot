# Official-map reserve acquisition protocol V1

Status: **prospectively frozen before enumerating or downloading the expansion
population and before any policy outcome on an expansion map**

Recorded: 2026-08-15 UTC

## Purpose

The currently unburned reserve has only 18 provisionally independent map
families and is heavily weighted toward snow theaters. This protocol permits
one outcome-blind expansion from official, publicly served Chrono Divide map
metadata without selecting maps according to policy performance.

## Authoritative source snapshot

Use only resources served by the Chrono Divide project itself:

- the current public game client at `https://game.chronodivide.com/`;
- public client assets or map-list endpoints referenced by that client;
- public map bytes at `https://gameres.chronodivide.com/`; and
- the official Chrono Divide patch notes or mod SDK when needed to interpret
  the map list and compatibility constraints.

Record retrieval time, effective URL, HTTP status, content length, ETag and
Last-Modified when present, client version, and SHA-256 of every source list or
manifest. Preserve the raw source-list bytes. A guessed filename that is not
enumerated by an official client asset or endpoint is not part of the source
population.

## Population rule

The source population is the complete set of multiplayer map records in the
frozen official list. Apply the following deterministic eligibility rules to
every record:

1. The map is publicly retrievable from an official Chrono Divide resource.
2. The parsed map declares at least two valid multiplayer starting locations.
3. Its theater and required assets are supported by the frozen simulator.
4. It does not require an unsupported single-player trigger, custom ruleset,
   mod, or nonstandard game mode for ordinary two-player play.
5. It passes the existing parser/load gate, exact two-bot construction gate,
   and a policy-outcome-free live-fidelity smoke test.
6. It is not byte-identical, packed-terrain-identical, geometrically equivalent,
   or an adjudicated naming/mode alias of any existing catalog family.
7. It is absent from every policy-outcome campaign, development outcome set,
   sealed family, and binding no-reuse/capacity-dry-run prohibition.

Apply exclusions to the full population; never stop after reaching a desired
sample size. Preserve every inclusion and exclusion with a machine-readable
reason. Filename, display-name, player-count, or game-mode variants of the same
underlying terrain form one family.

## Representative and commitment rule

For each eligible family, select the representative with the
lexicographically smallest tuple of normalized official path, source SHA-256,
and parsed mode identifier. Sort families by their identity digest. Retain the
complete eligible population rather than a performance-selected subset.

Before any candidate or baseline policy is run competitively on these maps,
freeze:

- a private manifest containing exact identities, source URLs, hashes, parsed
  metadata, family links, and exclusion audit;
- a public commitment containing counts, theater and start-count composition,
  source-manifest hashes, eligibility-code hash, family-identity commitment,
  and limitations; and
- a fixed compatibility manifest specifying both bots, engine, settings, and
  success criteria.

The population becomes outcome-used at the first competitive game. After that
point no family may be removed because it is slow, difficult, unfavorable, or
inconvenient. Technical repair applies prospectively to the complete affected
design unit.

## Data and release boundary

Public availability does not imply permission to redistribute third-party map
bytes. Preserve map bytes privately for exact execution, but plan to release
only code, hashes, parsed metadata, official source URLs, exclusion reasons,
and reproducible download instructions unless explicit redistribution rights
are verified. Record author or license metadata when the official source
provides it.

## Outcome firewall

Acquisition, parsing, identity clustering, compatibility, and fidelity checks
may record technical success, timings, deterministic hashes, and scrubbed
termination diagnostics. They may not record or inspect wins, losses, draws,
scores, surviving armies, remaining buildings by player, or policy-specific
actions. No candidate policy threshold or target rule may be changed from map
content encountered during this audit.

If the official source has no reproducible complete list, the expansion fails
closed and the 18-family reserve remains the only provisional reserve. A
hand-picked list from search results, ladder popularity, or convenient known
filenames is not an admissible replacement.
