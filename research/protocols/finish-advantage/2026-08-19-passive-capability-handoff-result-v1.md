# Passive capability handoff: open-screen result V1

Status: **complete, technically clean, no advancing candidate; development-only**

Compatibility array/controller `22650977`/`22650978` passed with staged units,
zero explicit releases, and artifact SHA-256
`aa0881cfa31d6dc696230d9aa24ad99596bd48a608dbb4926f76954ba819af06`.
The competitive campaign SHA-256 was
`d290dd365d06b0b3d78a2e49ec1164d7468c33ad8a5bfb36c91b2999d6e72bd4`,
source `f3ff92df6c6f71cfbc009f6ab2a2b5e012045ba2`, array/controller
`22652137`/`22652138`, and all 1,080 games completed without retry or technical
failure. Final artifact SHA-256:
`4fcbd13ffab7e692c5b820dc7c9dab91cb46b3d0184c595b76c4b75d688527eb`.

Exact Supalosa was 32W/116D/32L and V5 36W/112D/32L. No-capability delayed
distance was 39W/108D/33L. Early passive air-2 was 36W/111D/33L.
Conservative passive air-2 and air-4 were both 37W/113D/30L. They improved
paired score over exact Supalosa with positive one-sided 80% lower bounds in
both factions, but did not improve literal wins or draw rate over V5 and failed
the frozen absolute-win rule. `mp25mw` remained unchanged.

Passive staging fixed the churn defect but did not make generic late capability
production an effective building-elimination policy. The generic exact-core
overlay program is retired. Further work moves to the already trained deployed
HFO policy, whose historical short-game results are orders of magnitude
stronger and now require literal-endpoint/all-country validation.
