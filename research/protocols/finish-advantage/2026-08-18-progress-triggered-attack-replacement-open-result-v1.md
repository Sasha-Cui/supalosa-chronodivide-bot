# Progress-triggered attack-factory replacement: open-screen result V1

Status: **complete, technically clean, no advancing candidate; development-only**

## Immutable execution

- compatibility array/controller: `22633670` / `22633671`;
- compatibility artifact SHA-256: `5473f62f80d8008b41e5e6e5caf9acadcbdd44ac7a107e0c94d50a0715e91cf1`;
- campaign SHA-256: `747ac670df670b959d89c6fb7e65abc178ff30fc66523e8f516c6223d7ad54e3`;
- source commit: `ca2362edc1be3a8dc261cc2b241f8ff871904219`;
- outcome array/controller: `22634883` / `22634884`;
- games: 1,080/1,080, all 90 tasks complete, no retries or technical failures;
- final artifact SHA-256: `1589982b1751202f36be2b49954b6b1cade5fe4c0397b80147517681390e2898`.

## Result

Exact Supalosa was 32W/117D/31L; unchanged V5 was 38W/111D/31L.
Both early-distance and conservative-distance produced 40W/109D/31L. Early
forces-first was 39W/110D/31L; conservative buildings-first was 38W/110D/32L.

Early-distance had paired score effect +0.0222 versus exact Supalosa with
one-sided family-clustered 80% lower bound +0.0114, and positive effects in both
factions. It improved V5 by +0.00556, converting eight V5 draws to wins while
regressing six V5 wins to draws and no V5 win to a loss. Its lower bound versus
V5 was -0.00158. Conservative-distance had the same aggregate record, a V5
effect of +0.00556, and no win-to-loss regression, but its Soviet V5 effect was
slightly negative.

No arm advanced because the absolute literal-win lower bound did not exceed both
comparator point win rates. That rule is not weakened after seeing the result.

## Mechanistic conclusion

Delaying the distance replacement preserves losses and produces a small real
positive effect over exact Supalosa, unlike static replacement. The gain is too
small and concentrated in reachable families to justify confirmation. The
water-separated `mp25mw` family remains unchanged for every arm. The next
mechanism adds only a late side-appropriate air capability reserve at the same
stagnation trigger, allowing future ordinary attacks and V5 to use units capable
of reaching inaccessible buildings. It does not seize existing units or alter
early play.
