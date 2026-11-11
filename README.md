# Herd Shorts

Daily Shorts and Reels for Herd Games, made from real player data, picked by
Claude, and steered by what the numbers say.

The plan and the reasoning live in the game repo's `SHORTS_STRATEGY.md`. This
repo is the machine.

## How a day runs

1. **Data.** Yesterday's real numbers (Daily Guesstimate guesses, the Top
   Answers board, the Hot Takes split) come from the backend's read-only shorts
   endpoint.
2. **Render.** Each template in `templates/` takes those numbers as variables.
   The GitHub Action renders that day's candidates on GitHub's machines.
3. **Pick.** Claude picks one and writes its hook, using what
   `strategy/LEARNINGS.md` and `strategy/strategy.json` say is working.
4. **Post.** Instagram through Meta's API; YouTube through its API once Google's
   audit clears (by hand until then).
5. **Measure.** Each video's numbers are collected at 24 h, 3 days and 7 days
   into `ledger/`.
6. **Learn.** Every week Claude reviews the ledger against each platform,
   rewrites the learnings, adjusts the strategy settings (format mix, hooks,
   length, timing) and says what changed and why.

## Layout

| Path | What |
| --- | --- |
| `templates/` | HyperFrames projects, one per format (A herd line, B board, C dial) |
| `pipeline/` | Scripts: pull data, build variables, render, post, collect metrics |
| `ledger/` | Every video: what it was and how it did |
| `strategy/` | `LEARNINGS.md` (the written lessons) and `strategy.json` (the settings the pipeline reads) |
| `samples/` | The first three hand-made samples (8 Nov 2026), their storylines and review |

Rendered MP4s are not in git. They are attached to a release per day.
