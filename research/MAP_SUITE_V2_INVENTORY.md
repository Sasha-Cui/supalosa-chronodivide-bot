# Multi-map suite V2 inventory

Status: **frozen identity inventory; no V2 game outcomes generated or inspected**

Date frozen: 2026-08-31

This inventory responds to the requirement that StrongBot be evaluated beyond
one Heck Freezes Over revision and beyond Peak of Perfection. It records the
exact runtime bytes before any V2 screen or adaptation. Every listed compatible
file has already passed the repository's one-update Chrono Divide load smoke;
that is a technical fact, not evidence of policy strength.

## Heck Freezes Over family

The built-in original map has no embedded `[Basic].Name`; the current Chrono
Divide resource-name table maps `mp32s8.map` to `DESC:MP32S8`, Heck Freezes
Over. The remaining rows are named revisions. Consequently, informal labels
such as “Gold Corners” must be mapped to exact filenames and hashes in every
result; no result may use an unqualified `HFO` label when it is not the original
eight-start file or the exact LE file used by the existing confirmation.

| Study label | Embedded map name | Starts | Compatible filename | SHA-256 |
|---|---|---:|---|---|
| HFO original | built-in `DESC:MP32S8` | 8 | `cd_chrono_mp32s8.map` | `907e5ab677a03c50f375da1bec4871880240de2fab790a38dac85674d0f65bf1` |
| HFO LE | `[4] Heck Freezes Over LE` | 4 | `cd_chrono_4_heck_freezes_over_le.map` | `e4dfc736a6355e0e68d4681e4d67419516e6bb94549e2d42880c9414e95e2e8d` |
| HFO Golden | `[6] Heck Freezes Over Golden` | 6 | `cd_chrono_heckgolden.mpr` | `845359bfe0ea2ad3bb9dda90e0c00a7b97946fda132e87f717c22025923bd296` |
| HFO Corners | `Heck Freezes Over Corners` | 4 | `cd_chrono_heckcorners.map` | `3aa63da555db30d0d97d9319057650c440ebf57f655c8c001705e312768e628a` |
| HFO Corners B | `Heck Freezes Over Corners` | 4 | `cd_chrono_heckcorners_b.map` | `fb4ffb59de9f0ba114bd7f37a943f1ce9a4496e3ecb3e9382e72392039833a73` |
| HFO Corners B Golden | `Heck Freezes Over (no gems)` | 4 | `cd_chrono_heckcorners_b_golden.map` | `52cdb880326a3d39db5c8a9939830947496f7c009a8cbe3d02ce973563180f50` |
| HFO B v B | `Heck Freezes Over B v B` | 2 | `cd_chrono_heckbvb.map` | `5a7554fb64a16bd345cb42bf3bcbccd376fa92ad1c0356058f0427e9f0910f04` |
| HFO L v L | `Heck Freezes Over L v L` | 2 | `cd_chrono_hecklvl.map` | `aa0b71473092d701834920275f8d42aeeb2614d4ad1244d6fb3741e8f62f7efc` |
| HFO R v R | `Heck Freezes Over R v R` | 2 | `cd_chrono_heckrvr.map` | `8f17a78d2de245716b33c78b848dff13ae3db5b7ebb08d2efa4da165ac995488` |
| HFO T v T | `Heck Freezes Over T v T` | 2 | `cd_chrono_hecktvt.map` | `084d215b1ccb2a30cfb467e5f009d51b77e91c6a441ed24b4a6aef24d68c0c74` |

The first six rows are the primary HFO revision suite. The four fixed-pair rows
are secondary geometry controls. They do not create ten independent-map
replications: all ten are reported as one related HFO family.

## Distinct-map suite

| Study label | Embedded or resource name | Starts | Compatible filename | SHA-256 |
|---|---|---:|---|---|
| Peak of Perfection | `[2] Peak of Perfection` | 2 | `cd_2_peak_of_perfection.map` | `440715dc154ac10b4b922159824140d40c48990311c6838345b66958f3b3a442` |
| Tour of Egypt | `Tour of Egypt` | 6 | `cd_chrono_tourofegypt.map` | `2e660f22cf5ef994ca7453d14b9f68349063f9086b7c7c038f58e2067706236e` |
| South Pacific original | built-in `DESC:MP01DU` | 4 | `cd_chrono_mp01t4.map` | `89a428f214d5ca2a5f650b94e2847fc493d51805aac04f869f1fcc76e4db3381` |
| South Pacific two-start revision | `[2] South Pacific` | 2 | `cd_2_south_pacific.map` | `5d8122dc9234cc6fbcb68ec428cbea28b31496617253274ee15296a7c2807e2e` |
| Pacific Heights | Chrono Divide resource `pacific.map` | 4 | `cd_chrono_pacific.map` | `8ba46066a7e034c37b2367bd07df94be8d6252757d4396ea68d21bc226fa8898` |

`newhghts.map` is New Heights, not Pacific Heights, and is deliberately not
substituted for the requested map. The built-in four-start South Pacific is the
primary requested map; its named two-start revision is a secondary revision
control. South Pacific and Pacific Heights may expose land/naval capability
gaps; they remain in scope even if a technical or competitive gate fails.

## Interpretation contract

1. The existing 720-game result applies only to the exact HFO LE row. It cannot
   be copied to any other revision, including the original eight-start map.
2. Peak is an existing positive second-map result and remains an independent
   replication. It is not rerun merely to inflate sample size.
3. A frozen-policy result obtained before map-specific adaptation is labeled
   zero-shot transfer. A result after using development cases from that map is
   labeled map-profiled performance.
4. No map is removed because it is difficult, naval, large, or unfavorable.
5. Development and final-confirmation seed populations are disjoint and frozen
   before the first competitive endpoint on a map.
6. Every result reports exact bytes, ordered start pair, participant slot,
   country, literal endpoint, and scheduler job ID.
7. HFO-family aggregation and distinct-map aggregation are both reported;
   HFO revisions may not dominate an “all maps” average by row count.

## Inputs

The paths and descriptors above are derived from
`research/artifacts/map_family_catalog.json`,
`research/artifacts/map_inventory.json`, and direct `sha256sum` verification on
2026-08-31. Built-in names are additionally cross-checked against the current
Chrono Divide compiled resource-name table (`mp32s8 -> DESC:MP32S8` and
`mp01t4/mp01du -> DESC:MP01DU`). Runtime identity remains governed by the
private RA2 asset manifest; copyrighted runtime bytes are not added to the
review artifact.
