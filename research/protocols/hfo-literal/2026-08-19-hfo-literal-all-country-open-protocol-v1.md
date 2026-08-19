# Trained HFO policy: literal all-country open protocol V1

Status: **prospectively frozen before V1 literal-endpoint gameplay**

## Motivation and claim boundary

The deployed StrongBot includes a heavily trained Heck Freezes Over policy.
Historical fixed-policy refreshes report 253W/2L/1D over 256 matches and
2,006W/33L/9D over 2,048 matches, but those runs used `shortGame=true`, Iraq
mirrors, and older benchmark accounting. They do not prove physical destruction
of every building, all-country support, or current-source superiority.

V1 asks whether current deployed StrongBot reliably beats exact pinned Supalosa
on Heck Freezes Over under the literal all-buildings endpoint, across all nine
countries and reciprocal participant slots. This is open development and cannot
be a held-out paper claim.

## Candidate and endpoint

The candidate is current local `StrongBot` with default `StrongStrategy()` and
default `StrongBotOptions`, thereby enabling the deployed HFO map profile and
its trained tactics. Automatic profiles are not disabled. The opponent is exact
external Supalosa commit `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f` in the
same mirrored country.

Use `shortGame=false`, suppress and audit both participants' `quitGame` actions,
and declare a win only after opponent-attributed physical destruction of all
enemy buildings. Maximum horizon is 90,000 ticks, matching the strongest
historical proof horizon. Superweapons remain disabled and starting credits are
10,000.

## Outcome-blind gate

Before competition, run current deployed StrongBot twice with matched seeds for
all countries and both slots on `cd_chrono_4_heck_freezes_over_le.map`. Require
runtime identity, deterministic normalized public traces, valid country/start
state, no forwarded resignation, and no forbidden outcome field. The gate must
show all four HFO start locations across the complete population or use a fresh
outcome-blind seed-enumeration amendment before competition.

## Open pilot

After a gate pass, run ten fresh engine seeds per country with reciprocal slots:

$$9	imes10	imes2=180	ext{ literal games}.$$

Use seed base `4,230,000,000`; every attempt counts and there are no retries or
start/outcome filters. Report start-location coverage, W/D/L, literal-win
probability, Wilson and family/country clustered uncertainty, win time, terminal
building counts, and suppressed resignations.

Proceed to a larger fresh confirmation design only if candidate wins exceed
losses in pooled results, Allied countries, and Soviet countries; at least seven
countries have wins exceeding losses; both slot win rates exceed 0.5; the
one-sided 95% lower confidence bound for overall literal win probability exceeds
0.5; and all four HFO starts are represented. Otherwise preserve the result and
repair/generalize before any paper claim.

## Beyond Iraq and beyond one map

A passing V1 freezes the trained HFO candidate for an all-country larger
confirmation and a separately trained second-map study. The final paper cannot
claim a general Chrono Divide agent from HFO alone. At least one additional map
family and RA2Web/Supalosa multi-opponent evaluation remain required.
