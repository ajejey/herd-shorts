/*
  Which rendered videos are due on Instagram now: their post_at has come, they are not posted
  yet, and they are not stale. The hourly workflow (.github/workflows/post-due.yml) posts each.

    node pipeline/post-due.mjs            prints the due ids, one per line
    node pipeline/post-due.mjs --now=2026-11-13T19:05:00Z

  Stale: more than STALE_HOURS past post_at (GitHub can delay a scheduled run by hours; past
  this, the video waits for a person rather than going out at a random time). A row without a
  post_at (a forced render) is never due: it is posted by hand with post.yml.
*/
import { pathToFileURL } from 'node:url';
import { readLedger } from './ledger.mjs';

export const STALE_HOURS = 20;

export function dueRows(rows, now = Date.now()) {
  return rows
    .filter((r) => r.post_at && r.file && r.status !== 'skipped' && !(r.posts && r.posts.instagram))
    .filter((r) => {
      const t = Date.parse(r.post_at);
      return Number.isFinite(t) && t <= now && now - t <= STALE_HOURS * 3600000;
    })
    .sort((a, b) => (a.post_at < b.post_at ? -1 : 1));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const nowArg = (process.argv.find((a) => a.startsWith('--now=')) || '').slice(6);
  const now = nowArg ? Date.parse(nowArg) : Date.now();
  for (const r of dueRows(readLedger(), now)) console.log(r.id);
}
