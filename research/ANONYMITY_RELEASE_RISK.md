# Anonymity and release risk

Verified: **2026-08-11**

## Double-blind exposure

The named public repository `Sasha-Cui/supalosa-chronodivide-bot` now contains
the anonymous manuscript source, unique result values, and aggregate artifacts.
The generated review archive removes direct identifiers and Git metadata, but a
reviewer could still search distinctive prose, hashes, or numeric combinations
and find the public repository. File-level redaction alone cannot eliminate
that linkage.

Do not rewrite or delete the evidence history. Before submission, obtain a
written ruling from the program chair or make the named repository non-public
for the review period. Repository visibility is an external action and must be
performed or explicitly authorized by the owner.

For ICAART, the public rules do not resolve this code-repository case. The
primary-source boundary and exact secretariat question are recorded in
[`ICAART_POLICY_RECONCILIATION.md`](ICAART_POLICY_RECONCILIATION.md).

## Upstream license

The upstream [Supalosa bot repository](https://github.com/Supalosa/supalosa-chronodivide-bot)
has no license file in its current root, and both inherited package manifests
declare `UNLICENSED`. The StrongBot tree is derived from that code. The project
owner can license independently authored research scripts, documentation, and
aggregate records, but cannot unilaterally grant an open-source license to the
combined upstream-derived bot.

The anonymous review artifact therefore excludes all bot packages and includes
only the paper, author-written paper tooling/tests, and sanitized aggregate
evidence. Public bot release remains blocked until Supalosa grants permission or
specifies acceptable terms. Chrono Divide and Red Alert 2 content remain under
their separate third-party terms regardless of that permission.
