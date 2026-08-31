# ICAART upload staging bundle

This fail-closed staging directory prevents accidental upload of a stale PDF,
portal summary, or reviewer artifact. It does not submit anything and should
not itself be uploaded as one combined directory.

## Build

```bash
python3 research/scripts/build_icaart_upload_bundle.py --replace
```

Default output:

`tmp/submission/icaart-2027/`

The builder verifies the frozen SHA-256 and size of:

- `anonymous-paper.pdf` - upload as the regular-paper PDF;
- `submission-metadata.json` - copy exact values into PRIMORIS; and
- `anonymous-review-artifact.tar.gz` - attach only with written venue approval.

It also writes `UPLOAD_INSTRUCTIONS.txt` and `UPLOAD_MANIFEST.json`, rejects
identity-bearing tokens, refuses stale inputs, and atomically replaces only a
path under the repository's ignored `tmp/submission/` root.

## Bound identities

- Reviewed source: `75cdf7a68763007e45c737ee1773aad1cc71ded1`.
- PDF SHA-256:
  `628482e622a19700d56de5516e2f91ea1b74c48705a879a78d6b3c77ea91f7fc`.
- Portal metadata SHA-256:
  `cc8f656f8ccca9fab1a614d40a80368e0bec08bcfd6fc5dee07b69edb475d127`.
- Optional artifact SHA-256:
  `d0e49b55bc76d5d5c103378b23cbc374a9a93353e1380e0283b54421e7d249c4`.

After any approved manuscript change, rebuild the PDF and artifact, update the
bound constants/tests, and regenerate this staging directory. After portal
upload, download the venue copy and compare its PDF bytes and rendering.
