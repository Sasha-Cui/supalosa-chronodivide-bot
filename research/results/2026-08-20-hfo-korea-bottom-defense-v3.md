# HFO Korea bottom defense V3 result

Status: **complete; development screen advanced to replication**

## Identities

- Zero-update selector: job `22804712`, 42 initialized games, 12 selected
  Korea-bottom cases, selection SHA-256
  `fb63b2f0c55f6ec713cda88431de711cb9fd33eb3dc387d70366abd0de92f323`.
- Gameplay array: `22805169`, 72/72 tasks completed `0:0` under
  `pi_jss233`; no retries, replacements, or exclusions.
- Gameplay source commit:
  `91c5fe98ed8652ee73114729998949329a09dada`.
- Gameplay program SHA-256:
  `906466136fd1fe877f74c2fc63fa7a8cc93b0cba66740a24bee9e44fa93115de`.
- Protocol SHA-256:
  `77e8e9f1d4a632a3d772fda0740ed23a5c57ace2f69c9f18a883728dddac0dd2`.
- The first finalizer, job `22805170`, completed but incorrectly looked for a
  variant named `default` instead of the declared `retarget_control`. Its
  artifact SHA-256
  `5e8ddbb3fea10c7353ba172117c311c33aa7c13eaf3da68b8eb7e186282e0ee9`
  is preserved as failed reducer evidence.
- Reducer fix commit:
  `c6d3376947389ea14a5db1246ba881127e8754d3`.
- Immutable-cell refinalizer: job `22811739`, completed `0:0` with empty
  stderr. The corrected reducer program SHA-256 is
  `2a91b68e68b2037e138a480709d36f0bab91ea423661a6c06e7b9bac99b25237`.
- Corrected aggregate SHA-256:
  `863416b3e0d1cb22f0d02849f39caa1c16690e84218fabde11e2a9ef4bd8e8ba`.

## Results

| Arm | W | D | L | Win rate | Loss rate | Mean paired score gain |
|---|---:|---:|---:|---:|---:|---:|
| Retarget control | 7 | 1 | 4 | 58.33% | 33.33% | 0 |
| Two pillboxes | 9 | 0 | 3 | 75.00% | 25.00% | +0.125 |
| Four pillboxes | 3 | 0 | 9 | 25.00% | 75.00% | -0.375 |
| Wide guard | 4 | 1 | 7 | 33.33% | 58.33% | -0.250 |
| Two pillboxes + wide guard | 4 | 0 | 8 | 33.33% | 66.67% | -0.29167 |
| Four pillboxes + wide guard | 1 | 1 | 10 | 8.33% | 83.33% | -0.500 |

The two-pillbox arm improved three paired cases, tied eight, and worsened one.
Its one-sided 95% Wilson lower bound was `0.51266`. The paired-score lower
bound was negative (`-0.14854`), as expected for a 12-case development
screen; the frozen screen criterion required only a positive paired mean.

The preregistered winner had at least eight wins, more wins than losses, lower
loss rate than control, and positive mean paired improvement. The corrected
status is `ADVANCE_HFO_KOREA_BOTTOM_DEFENSE`.

## Interpretation and boundary

The screen supports a narrow mechanism: a small early static-defense investment
can improve Korea-bottom survival, while doubling that investment or adding a
wide home guard is harmful. This is useful because it argues against a generic
"more defense" explanation.

This is not deployment or paper-level confirmation. The winner remains
experimental. The next step is the prospectively frozen 40-case Korea
replication; all V3 seeds are barred from it and from final confirmation.
