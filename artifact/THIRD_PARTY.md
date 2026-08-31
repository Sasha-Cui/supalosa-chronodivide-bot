# Third-party and release boundary

Verified on **2026-08-30**.

## Excluded from the anonymous artifact

- Supalosa's `supalosa-chronodivide-bot` source and the derived StrongBot bot
  tree. The upstream repository contains no license file and its package
  metadata declares `UNLICENSED`; the combined bot must not be relicensed or
  redistributed as open source without permission from the upstream author.
- Chrono Divide source, binaries, and game API packages, which remain under
  their respective upstream terms.
- RA2Web bot bundles and client files.
- Red Alert 2 maps, MIX archives, theater files, and other commercial assets.
- Private scheduler records, raw completion bundles, logs, map bytes, and
  unblinding records.

## Included

The artifact contains the exact anonymous SCITEPRESS manuscript sources, the
official unmodified SCITEPRESS style files, author-written evidence reduction
and paper-asset code, tests, a self-contained package verifier, six generated
TeX assets, 15 deterministic author-rendered state frames, and one sanitized
aggregate JSON record needed to regenerate every reported number and plot.
Sanitization redacts source revision fields while preserving exact job IDs,
design counts, estimates, uncertainty bounds, runtime/opponent hashes, result
commitments, and screenshot hashes.

The included material is supplied for peer review. A public release of the
combined bot requires a separate permission and licensing decision from the
upstream Supalosa author. The game frames are derived visual records of
third-party game assets and should be redistributed beyond peer review only
after confirming the applicable permissions. No permission is implied for
omitted third-party content.
