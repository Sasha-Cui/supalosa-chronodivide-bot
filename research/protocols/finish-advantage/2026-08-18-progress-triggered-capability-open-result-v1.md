# Progress-triggered capability reserve: open-screen result V1

Status: **complete, technically clean, no advancing candidate; development-only**

The all-country gate used array/controller `22643324`/`22643325` and artifact
SHA-256 `5466ebe4d33cf8804d8f23241c35532ca81b0260afe7996d3c7982cf8b720f80`.
The competitive campaign SHA-256 was
`0b6865c4a2591b0b3ab14a7d431dd80ab1d6e03af0465ddf5091428e1bf5cfd4`,
source `a14254c3e9305a9d4c269b7a4e9bcf5a110691b4`, array/controller
`22644469`/`22644470`, and 1,080/1,080 games completed without retry or
technical failure. The final artifact SHA-256 is
`8c586f25530662958e7a62bc2b14c77db711957bd98f02aa4e8b7594996893df`.

Exact Supalosa was 36W/106D/38L and V5 40W/102D/38L. The no-capability delayed
arm was 39W/103D/38L. Early air-2 was 35W/108D/37L; conservative air-2 and
air-4 were both 36W/107D/37L. No capability arm improved either comparator or
the water-separated family.

The mechanism was exposed but pathological. Early air-2 recorded 162,645
capability requests and 7,591 explicit releases; conservative air-2 recorded
116,353 requests and 2,803 releases; conservative air-4 recorded 119,357
requests and 5,656 releases. The unit mission releases an assigned air unit, but
the mission controller retains and decays the prior high-priority type request.
The same unit can therefore be reacquired and released repeatedly before the
request disappears. This churn delays ordinary mission ownership and invalidates
the intended clean handoff interpretation.

The next version removes explicit release. The capability mission has zero donor
priority, remains unlocked, and stops requesting once the public total reaches
the target. Ordinary attack missions can then take the staged unit through the
existing unlocked-donor rule. This result does not support a capability benefit,
confirmation, or a paper claim.
