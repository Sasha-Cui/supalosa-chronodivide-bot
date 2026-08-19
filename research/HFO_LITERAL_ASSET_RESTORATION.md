# HFO literal study: private Snow asset restoration

Status: **required external input; do not commit proprietary game data**

The trained HFO policy is the only current repository policy with replicated
near-dominance: current-default isolation reported 2,006W/33L/9D in 2,048
historical short-game matches. Its frozen literal all-country gate failed before
simulator creation because `isosnow.mix` was purged from the scratch-resident
full-RA2 asset bundle.

Official Chrono Divide documentation states that original RA2 MIX archives come
from the user's Red Alert 2 installation/storage. They are not part of the open
source engine and must not enter Git, the paper artifact, or a public release.

## Required action

Restore the user-owned `isosnow.mix` from an original Red Alert 2 installation
or Chrono Divide Storage export to a private project path, preferably:

`/nfs/roberts/project/pi_jss233/zc362/chrono_divide/private-assets/ra2/isosnow.mix`

The Yale Open OnDemand file manager can upload it under the existing project
root. Do not place it in a tracked repository path.

After restoration, the research harness will:

1. record size and SHA-256 in private evidence;
2. construct a nonreleaseable runtime directory containing the existing loose
   headless data, HFO map, and a private link/copy to `isosnow.mix`;
3. run an outcome-blind map-load and all-country deterministic gate on fresh
   evidence roots;
4. run the frozen 180-game literal HFO pilot only after that gate passes; and
5. exclude every proprietary byte from release archives.

Failed jobs `22714292`/`22714293` are preserved as zero-game technical failures.
No HFO literal outcome has been accessed.
