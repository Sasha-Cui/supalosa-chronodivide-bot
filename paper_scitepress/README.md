# SCITEPRESS submission-candidate manuscript

This directory builds the anonymous SCITEPRESS-format candidate for the final
Chrono Divide StrongBot study. It reuses the authoritative sections, generated
result assets, game frames, and bibliography under \`../paper/\`; it neither
forks the empirical record nor authorizes new outcome-bearing analysis.

Build and run manuscript checks with:

\`\`\`bash
make -C paper_scitepress check
\`\`\`

For the frozen review-candidate check, load Poppler 25.x and run:

\`\`\`bash
make -C paper_scitepress submission-check
\`\`\`

The deep check enforces the current 12-page A4 and exact Poppler-extracted
non-whitespace-character identities, empty author/title PDF metadata, no
encryption, forms, JavaScript, or page rotation, seven embedded fonts with
Unicode maps, the 70--200-word abstract rule, and PDF-to-portal
title/abstract/keyword agreement. It also binds the portal metadata to source
hashes and verifies that every generated TeX asset matches the committed
evidence-derived copy.

The build uses a fixed \`SOURCE_DATE_EPOCH\` as a reproducibility constant. It
is not a source revision or a claim about when the experiments ran. With the
pinned TeX Live 2024 toolchain, clean builds are byte-identical.

\`make check\` writes \`build/submission_metadata.json\`, containing the exact
plain-text title, expanded abstract, keywords, area, and ordered topic list for
the submission form. Regenerate it from reviewed source rather than copying
LaTeX or improvising a stronger portal claim.

## Claim boundary

The manuscript establishes reliable superiority over pinned Supalosa on two
maps: 633/24/63 on balanced Heck Freezes Over and 134/14/32 for the replicated
Peak reciprocal macro policy. It reports scoped mechanism replications and a
negative RA2Web Advanced transfer. It does not introduce Chrono Divide, claim a
new general optimizer, or claim universal game-agent dominance.

## Official template provenance

The four unmodified files in \`vendor/\` came from the official conference
LaTeX archive at
<https://www.scitepress.org/documents/SCITEPRESS_Conference_Latex.zip>,
downloaded on 2026-08-11. The archive SHA-256 was
\`ec6cfaa11962e08d5c6a402124f21c3bca3591397521406ab6d1889398a3807a\`.
\`VENDOR_SHA256SUMS\` records the individual file hashes.

The review PDF uses \`Anonymous Author(s)\` and contains no affiliation, email,
acknowledgment, private path, scheduler allocation, or author-owned repository
URL. Its identity-neutral Generative AI Disclosure accurately records Codex use
without naming the author. Confirm the venue-preferred disclosure field and
artifact-upload route with the secretariat before final upload.
