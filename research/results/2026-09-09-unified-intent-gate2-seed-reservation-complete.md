# Unified intent Gate 2 seed reservation: complete result

Date: 2026-09-09

## Disposition

The complete replacement audit and independent compact certificate passed.
Gate 2 seed base 3,350,000,000 is now frozen. No selector or game has used the
range yet.

The selected unsigned interval is
[3,350,000,000, 3,351,000,000). Its signed-int32 equivalent is
[-944,967,296, -943,967,296).

## Failed first attempt

Audit 25323885 timed out at 06:00:11 before writing an audit JSON, checksum, or
marker. It initialized no game. The exact failure and prospective repair are
preserved at commit 3998dbc. The failed seed-audit-v1 root is not reused.

## Complete audit

| Field | Value |
|---|---|
| job | 25480245 |
| state | COMPLETED 0:0 |
| account/partition | pi_jss233/day |
| CPU/restarts | 1/0 |
| elapsed | 22,675 seconds |
| source | bc7c61ea443880484b18f35ec52a43c2cb6dcd69 |
| program SHA-256 | fc4e4f017463b871876c43dc4b63f19644097c788182bd57caf3857c8706e061 |
| audit bytes | 585,357,862 |
| audit SHA-256 | 6e83a8d51597236dbf1fe80d22262b40bfc737dc6234c68a94853af5ddfaf52a |

The immutable marker and sidecar match the full audit. The complete scan
recorded:

- 1,818,439 files;
- 16,158,239,032 on-disk bytes;
- 7,172 gzip files;
- 58,215,611,851 decompressed gzip bytes;
- 1,306 collision records;
- zero declared-range collision;
- zero read error; and
- all 20 ordered candidate assessments.

The first candidates at 3,330,000,000 and 3,340,000,000 each had 55 collision
records. The next candidate, 3,350,000,000, had zero and was therefore the
first passing interval. Later passing candidates were not selected.

## Independent compact certificate

Amendment A3 froze streaming certification of the complete 585-MB audit.
Amendment A4 corrected only the pre-execution assumption that deterministic
parent-before-child traversal would be globally lexical; exact path uniqueness
was instead proved using a full-path SQLite primary key.

| Field | Value |
|---|---|
| job | 25670843 |
| state | COMPLETED 0:0 |
| account/partition | pi_jss233/day |
| CPU/restarts | 1/0 |
| elapsed | 29 seconds |
| source | a28ba5c84bb17b69e4ebea9ef3a4229aa805fb72 |
| program SHA-256 | 269b1ea798ab7acd65e6fde94ebbe9b292c8fee317a6da9ecb33351ed37ac038 |
| A3 SHA-256 | 3bce3993f0988ab34dc081025bda591de94442171923b9179a53302a9c2e48a2 |
| A4 SHA-256 | acfc632b2e9325c4afc6a7956fc4fa82913cad96d0cfaa0d2a072c4244474a93 |
| certificate bytes | 4,399 |
| certificate SHA-256 | f7f7086d32630b1eede7a300a382a9348d60f610c1768c300cb3818f738307fd |

The certificate:

- rehashed the complete audit and matched its marker/sidecar;
- reconciled all 1,818,439 file records and every byte/gzip total;
- proved exact full-path uniqueness;
- revalidated all 20 assessments and first-clean selection;
- revalidated audit scheduler identity;
- re-stat-ed and rehashed the deterministic 2,048-file sample; and
- produced sample SHA-256
  48dc1d32bfa49dd823c2f98dcc698a8e26ff07c404e2dfd15808cb7287b2f844.

The certificate marker is
COMPLETE_UNIFIED_INTENT_GATE2_SEED_CERTIFICATE_V1_A4 and its sidecar matches.
Its internal error count is zero.

## Scientific boundary

Both stages are zero-game technical audits. They contain no W/D/L, score,
endpoint, defeated state, terminal building count, or policy ranking. The
selected range is evidence-separated, not evidence that the arbiter is
compatible or strong.

## Advancement

Gate 2 may now build its zero-update selector from the compact certificate.
The selector must independently rehash the full audit and certificate, create
exactly 180 paired cases and 360 tasks from base 3,350,000,000, and initialize
zero updates. Only after the selector and one fixed-horizon smoke pass may the
complete disabled-equivalence array launch.
