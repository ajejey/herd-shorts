# The weekly review (Claude, every Monday)

The channel is not "post every day and hope". Every week, read what the numbers
say per platform and change course where they point.

## 1. Read

- `ledger/videos.jsonl`: every video with its numbers at 24 h, 3 days and 7 days
  per platform, and site visits it brought (`utm_source`).
- `strategy/LEARNINGS.md` and `strategy/strategy.json` as they stand.

## 2. Work out

Per platform (Instagram, YouTube), never mixed, because they reward different things:

- For each format: posts, median views (plays), median average watch (% and
  seconds), shares + saves per 1,000 views, follows, site visits.
- Hooks: number hooks against question hooks; anything else the picks tried.
- Explore days against the rest.
- Posting time against the numbers, once there are enough posts to say.
- Say how sure each result is: 2 posts is a hint, 8 is a pattern.

## 3. Change course

`strategy/strategy.json`, within these bounds so one odd week can't swing everything:

- A weight moves at most ×2 or ÷2 a week.
- `testing` → `working` after 4+ posts at or above the platform median.
- `paused` after 4+ posts under half the median, with the rows named. A paused
  format comes back as an explore day after 3 weeks.
- New hook lines go in `hook_bank`; ones that keep losing come out.
- `post_times_utc` per platform moves only on 10+ posts of evidence.

## 4. Write it down

Rewrite `strategy/LEARNINGS.md`: Working / Not working / How each platform
behaves / Open questions. Every claim is dated and names the ledger ids behind
it. Add a row to "Changes made" for every setting changed, with why.

Commit `Weekly review <date>: <the one-line headline>` and push. Tell Ajey the
headline and anything that needs him (an account issue, a new format worth
building, a game that should get more videos).
