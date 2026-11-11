# Ledger

`videos.jsonl`, one line per posted video, appended by the pipeline and updated
as its numbers come in. This file is the channel's memory: every strategy
change must point at rows here.

```json
{
  "id": "2026-11-12-B",
  "date": "2026-11-12",
  "format": "B-board",
  "game": "top-answers",
  "data": { "question": "...", "players": 3071, "top": "Printer", "top_pct": 38 },
  "hook": "3,071 people answered. Can you guess #1?",
  "explore": false,
  "length_s": 18.5,
  "posts": {
    "instagram": { "media_id": "...", "posted_at": "2026-11-12T16:00:00Z" },
    "youtube": { "video_id": "...", "posted_at": "2026-11-12T16:05:00Z", "manual": true }
  },
  "metrics": {
    "instagram": { "24h": { "plays": 0, "reach": 0, "avg_watch_s": 0, "shares": 0, "saves": 0, "comments": 0, "follows": 0 } },
    "youtube": { "24h": { "views": 0, "viewed_pct": 0, "avg_view_pct": 0, "likes": 0, "comments": 0, "shares": 0, "subs": 0 } },
    "site": { "7d": { "visits": 0, "plays": 0 } }
  }
}
```

Metrics are taken at `24h`, `3d` and `7d` after posting. `site` counts visits
arriving with `utm_source=instagram` or `utm_source=youtube`. On 11 Nov 2026 only
Google Analytics records that tag (our backend does not, and PostHog is over its
quota), so the pipeline adds its own arrival record to the backend before the
first post.
