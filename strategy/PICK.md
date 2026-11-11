# The daily pick (Claude, every morning after 06:10 UTC)

The data for the latest finished day lands in `data/<day>.json` at 06:10 UTC.
Your job: choose today's video and write its words, then commit the pick. The
push renders it.

## 1. Read

- `node pipeline/candidates.mjs` shows every format's story for the day: the
  items it could show, the numbers, the default copy, and any ⚠ SENSITIVE flag.
- `strategy/strategy.json`: format weights and status, notes, hook bank.
- `strategy/LEARNINGS.md`: what has worked, what hasn't, per platform.
- The last 14 rows of `ledger/videos.jsonl`: what went out recently and how it did.

## 2. Choose

- Follow the weights. About 1 day in 4 (`explore_share`) try something less
  proven on purpose: a format with few posts, or a new hook angle. Mark it
  `"explore": true`.
- Not the same format as yesterday unless LEARNINGS says that format is
  carrying the channel.
- The strongest story wins inside a format: a big miss (A), a near tie or a
  landslide (C), a low climb rate (E), a famous near miss (F). A flat Top
  Answers board (#1 under ~12%) is weak.
- ⚠ SENSITIVE content: skip it by default. Choose it only when the flagged
  word is plainly harmless where it sits, and say why in `why`.
- Can't-make formats are out (the candidates list says why).

## 3. Write

- Hook: at most 9 words, plain, true. A real number from the data beats a vague
  claim ("Only 35 of 206 climbed all 7"). Never a number that is not in the data.
- Top Answers counts can come from an older Daily Herd day: never say
  "yesterday" about them.
- Only set the copy lines you want to change; the rest default from the data.
  The lines each format reads are the keys in its `pipeline/formats/<fmt>.mjs`
  (`copy.hook`, `copy.verdict`, `copy.stat`, `copy.gag`, ...).

## 4. Save

`picks/<YYYY-MM-DD>.json` (today's UTC date):

```json
{
  "format": "A-herd-line",
  "day": 162,
  "question": 290,
  "explore": false,
  "why": "Biggest miss of the day and A has not run for 3 days",
  "copy": { "hook": "Most people guessed 17%. Can you beat them?" }
}
```

`question` (A) or `take` (C) picks the item; leave both out for the format's own choice.

Check it builds before you commit (no render needed):

    node pipeline/build.mjs --pick=picks/<date>.json

Then commit `Pick for <date>: <format> (<why, short>)` and push to main. The
workflow renders it, attaches it to a release and writes the ledger row. If no
pick lands by 09:00 UTC the workflow renders the strategy's own choice, which
never includes sensitive content.
