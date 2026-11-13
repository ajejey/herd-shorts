/*
  Which rendered videos are due on a platform now. The hourly workflow
  (.github/workflows/post-due.yml) posts each.

    node pipeline/post-due.mjs                       Instagram: the due ids, one per line
    node pipeline/post-due.mjs --platform=youtube    YouTube
    node pipeline/post-due.mjs --now=2026-11-13T19:05:00Z

  Instagram: due once its post_at has come. Its API cannot schedule, so the Reel goes out
  when the hourly run reaches it.
  YouTube: due as soon as it is rendered, and uploaded with publishAt = post_at, so YouTube
  itself publishes it on the minute however late GitHub runs the job (13 Nov 2026: the
  hourly schedule fired about every 8 hours).

  Stale: more than STALE_HOURS past post_at. Past this, the video waits for a person
  rather than going out at a random time. A row without a post_at (a forced render) is
  never due: it is posted by hand.
*/
import { pathToFileURL } from 'node:url';
import { readLedger } from './ledger.mjs';

export const STALE_HOURS = 20;
export const PLATFORMS = ['instagram', 'youtube'];

export function dueRows(rows, now = Date.now(), platform = 'instagram') {
  if (!PLATFORMS.includes(platform)) throw new Error(`unknown platform ${platform} (${PLATFORMS.join(', ')})`);
  const early = platform === 'youtube';
  return rows
    .filter((r) => r.post_at && r.file && r.status !== 'skipped' && !(r.posts && r.posts[platform]))
    .filter((r) => {
      const t = Date.parse(r.post_at);
      return Number.isFinite(t) && (early || t <= now) && now - t <= STALE_HOURS * 3600000;
    })
    .sort((a, b) => (a.post_at < b.post_at ? -1 : a.post_at > b.post_at ? 1 : 0));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const nowArg = (process.argv.find((a) => a.startsWith('--now=')) || '').slice(6);
  const platform = (process.argv.find((a) => a.startsWith('--platform=')) || '--platform=instagram').slice(11);
  const now = nowArg ? Date.parse(nowArg) : Date.now();
  for (const r of dueRows(readLedger(), now, platform)) console.log(r.id);
}
