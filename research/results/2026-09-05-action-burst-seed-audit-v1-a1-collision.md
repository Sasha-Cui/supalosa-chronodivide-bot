# Action-burst V1 A1 seed audit: second namespace collision

Date: 2026-09-05

## Disposition

Replacement audit `24935965` failed correctly before any game
initialization. The A1 interval is permanently barred from the action-burst
diagnostic.

No action trace, game update, policy outcome, W/D/L value, score, endpoint,
building state, or policy ranking was generated.

## Frozen identities

- source:
  `2ecaa1e1d67e1688d97e7688f4567ba15ffc7906`
- program SHA-256:
  `f5b48956a910224056cd4b156f29131f86067d7dbb172473cc97b5a9f7cc690c`
- parent protocol SHA-256:
  `a07abda852b03a3904e364235dd50672aa9885fdf1062c7e1865e0695dc636b7`
- amendment A1 SHA-256:
  `def1d7cab6fe8c31878e67b6f28c6670c6047575b85cb2d648dac939514ba549`
- Slurm script SHA-256:
  `47c381e5bc34cf06fb52cd56ce554ef88e3ad30113f8a27d894c344abcff7c73`
- scheduler: `24935965`, `FAILED 2:0`, `pi_jss233/day`, one CPU,
  no GPU, zero restarts
- artifact SHA-256:
  `c13be6c5a4f6b3bb9dc0217e08aad54c80eb5aef1e60c059d8a0b3e2ca644dee`
- artifact bytes: 537,178,612

The audit scanned 1,811,149 retained files totaling 13,717,431,904 bytes with
zero read errors.

## Collision

One retained completed outcome-blind compatibility artifact contains all
eighteen seeds at the A1 lower boundary. This is a genuine prior-use
population, not the current protocol, a hash substring, or a numeric fragment.

## Repair principle

Trying one guessed range per two-hour full scan is inefficient and provides no
additional scientific protection. Amendment A2 therefore freezes an ordered
list of candidate intervals and requires one complete scan to evaluate every
candidate. It selects the first interval with zero token and declared-range
collisions. Selection is based only on retained metadata and never on gameplay.

Both failed intervals remain barred. Neither failed artifact is overwritten,
pooled, or described as a successful reservation.
