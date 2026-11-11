# Review: three sample Shorts (8 Nov 2026)

Picked storylines: A1 (herd on a number line), B1 (the board), C1 (the dial). Not built: A2/A3, B2/B3, C2/C3 (STORYLINES.md).

## Creative calls
- Every number is real production data (data.json, read-only): Daily Guesstimate 7 Nov (116 players, most said 7, one said exactly 4,000),
  Top Answers 4 Nov (3,071 answers, Printer 38%), Daily Hot Takes 4 Nov (7,683 players, 52/48).
- Brand from the live site capture: Fredoka/Quicksand files, cream + meadow sky, the cow mascot and herd sheep SVGs.
- A's question kept verbatim ("folded back and forth") and held 4.3 s with a 3-2-1 countdown; the herd piles at 7, then the scale pulls out to 4,000.
- B has no countdown: the #8 -> #2 flips are the wait. The #1 tile floods the frame pink for the payoff.
- C's needle is a closed-form damped swing, already moving at frame 0, settling at -3.3 deg (51.8% Absolutely).

## Measured vs looked at
- `check` passes on all three. Kept on purpose: `rotation_pivot_drift` on C's needle (it pivots at its base, by design);
  info-level off-canvas findings for A's herd/ticks (sheep beyond the visible scale, revealed by the pull-out).
- Review sheets (beats, seams, phone width) looked at for all three. Fixed from review: A question wrap + tiny sheep + broken arrow,
  B cow over the payoff at the seam + orphan word, C subline orphan + short holds, end-card orphans and spacing.
- Sound was measured (peaks placed one frame after each picture), not heard. No music bed: no music source on this machine.

## Weakest shot and next changes
- B's flood (10.05-10.5 s) is a plain pink rectangle growing for ~0.4 s; better if "Printer 38%" rode inside it as it grows.
- A: two real guesses of 5,000 sit half-off the right edge after the pull-out; reads like an artifact.
- All three would gain from a music bed (HeyGen catalog or a supplied track).
