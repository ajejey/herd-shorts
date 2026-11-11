# Herd Shorts

Daily Shorts and Reels for Herd Games, made from real player data, picked by
Claude, and steered by what the numbers say.

The plan and the reasoning live in the game repo's `SHORTS_STRATEGY.md`. This
repo is the machine.

## How a day runs

1. **Data.** Yesterday's real numbers for seven games (Daily Guesstimate, Top
   Answers, Hot Takes, Guess the Doodle, Word Climb, Secret Word, Words from a
   Word) come from the backend's read-only shorts endpoint
   (`pipeline/pull-data.mjs` → `data/<day>.json`). It only serves days that
   have closed, so nothing is a spoiler.
2. **Pick.** Claude picks a format and writes its copy (hook, payoff lines),
   using what `strategy/LEARNINGS.md` and `strategy/strategy.json` say is
   working, into `picks/<date>.json`.
3. **Render.** `pipeline/render.mjs` builds the video project with the day's
   values written in, runs `hyperframes check` on the real text, renders, and
   checks the file (length, sound) and writes a contact sheet. On GitHub's machines.
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
| `templates/` | HyperFrames projects, one per format: A herd line (Guesstimate), B board (Top Answers), C dial (Hot Takes), D doodle, E Word Climb, F Secret Word, G Words from a Word. `_shared/herd.js` is the helper every one loads |
| `pipeline/formats/` | One file per format: turns a day's data (and a pick's copy) into the template's variables, or says why that day can't make one |
| `pipeline/` | `pull-data`, `build` (template + day → project), `render` (check, render, verify), `check` (the pipeline's own tests) |
| `data/` | Each finished day's numbers, as pulled |
| `ledger/` | Every video: what it was and how it did |
| `strategy/` | `LEARNINGS.md` (the written lessons) and `strategy.json` (the settings the pipeline reads) |
| `samples/` | The first three hand-made samples (8 Nov 2026), their storylines and review |

Rendered MP4s are not in git. They are attached to a release per day.

## Making one video by hand

    node pipeline/render.mjs --format=B-board --day=160
    node pipeline/render.mjs --pick=picks/2026-11-12.json      # format, day and copy from a pick

A pick file:

    { "format": "A-herd-line", "day": 161, "question": 394,
      "copy": { "hook": "Guess before the herd does", "tag": "Most said 162" } }

`question` (A) and `take` (C) choose which of the day's items to show;
without them each format picks its strongest. Any copy line a format reads can
be set in `copy`; the rest default from the data.

## Checks

    node pipeline/check.mjs     # every format x every day, the scale and timing maths, the builder

A template's text is laid out at render time from real data, so `render.mjs`
refuses to render when `hyperframes check` finds overflow, hidden text or poor
contrast on that day's words.
