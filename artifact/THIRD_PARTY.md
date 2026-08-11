# Third-party and release boundary

Verified on **2026-08-11**.

## Excluded from the anonymous artifact

- Supalosa's `supalosa-chronodivide-bot` source and the derived StrongBot bot
  tree. The upstream GitHub repository contains no license file and its package
  metadata declares `UNLICENSED`; the combined bot must not be relicensed or
  redistributed as open source without permission from the upstream author.
- Chrono Divide source, binaries, and game API packages, which remain under
  their respective upstream terms.
- Red Alert 2 maps, MIX archives, theater files, and other commercial game
  assets.
- Private scheduler records, raw completion bundles, logs, map bytes, and
  unblinding records.

## Included

The artifact contains the anonymous LNCS/SCAG and exact SCITEPRESS/ICAART
manuscript sources, the official unmodified SCITEPRESS template files,
author-written paper asset generator and tests, a self-contained package
manifest verifier, generated TeX fragments, and eight sanitized aggregate JSON
records needed to regenerate every reported table and figure. Sanitization
redacts the literal scheduler account and project source commit fields while
preserving job IDs, design counts, estimates, intervals, result commitments,
family IDs, and all values used by the manuscripts.

The included material is supplied for peer review. A public open-source release
of the bot requires a separate permission and licensing decision from the
upstream Supalosa author. No permission is implied for omitted third-party
content.
