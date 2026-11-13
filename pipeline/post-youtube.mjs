/*
  Upload a rendered video to the Herd Games YouTube channel as a Short (YouTube Data API v3).

    node pipeline/post-youtube.mjs --whoami          which channel the token reaches, uploads nothing
    node pipeline/post-youtube.mjs --id=2026-11-13-B upload it (title, description, tags from the release)
    node pipeline/post-youtube.mjs --confirm         did every scheduled upload go public on time?

  Env: YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN (pipeline/setup-youtube-token.mjs stores
  them as secrets). Nothing secret is ever printed.

  A video whose post_at is still ahead is uploaded private with publishAt = post_at, and YouTube
  publishes it on the minute (the hourly GitHub job can run hours late); one whose time has
  passed goes up public. A vertical video under 3 minutes is a Short on its own.

  Private lock (13 Nov 2026): Google's API docs said uploads from an unaudited project are
  locked private; Google's API team wrote that they are not, and closed our audit request as
  unneeded. --confirm settles it for every upload: an hour after its publish time each one must
  be public, or the run fails and says so (then switch AUTO_POST_YOUTUBE off; strategy/POSTING.md).
  Before uploading, the channel's recent uploads are searched for the same title, so a ledger
  write that was lost after an upload never puts the same Short up twice.
*/
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { findRow, readLedger, updateLedgerRow } from './ledger.mjs';
import { filesFor } from './post-instagram.mjs';
import { youtubeCopy } from './youtube-kit.mjs';

const arg = (name) => {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return null;
  return hit.includes('=') ? hit.slice(hit.indexOf('=') + 1) : true;
};

const secrets = [];
const scrub = (s) => secrets.reduce((acc, x) => (x ? acc.split(x).join('[hidden]') : acc), String(s));

export async function accessToken() {
  const { YT_CLIENT_ID: id, YT_CLIENT_SECRET: secret, YT_REFRESH_TOKEN: refresh } = process.env;
  if (!id || !secret || !refresh) throw new Error('YT_CLIENT_ID, YT_CLIENT_SECRET and YT_REFRESH_TOKEN must be set (pipeline/setup-youtube-token.mjs)');
  secrets.push(secret, refresh);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: id, client_secret: secret, refresh_token: refresh, grant_type: 'refresh_token' }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) throw new Error(scrub(`token refresh failed: ${body.error_description || body.error || res.status}`));
  secrets.push(body.access_token);
  return body.access_token;
}

async function api(token, url, init = {}) {
  const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 300) }; }
  if (!res.ok) throw new Error(scrub(`${init.method || 'GET'} ${new URL(url).pathname}: ${body.error?.message || res.status} ${body.raw || ''}`));
  return { res, body };
}

export async function whoami(token) {
  const { body } = await api(token, 'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true');
  const c = body.items && body.items[0];
  return c ? { id: c.id, title: c.snippet.title, videos: Number(c.statistics?.videoCount || 0), subscribers: Number(c.statistics?.subscriberCount || 0) } : null;
}

/* Scheduled when post_at is more than LEAD_MINUTES ahead (YouTube wants publishAt in the future), else public now. */
export const LEAD_MINUTES = 15;
export function publishPlan(postAt, now = Date.now()) {
  const t = Date.parse(postAt || '');
  if (Number.isFinite(t) && t - now > LEAD_MINUTES * 60000) return { privacyStatus: 'private', publishAt: new Date(t).toISOString() };
  return { privacyStatus: 'public' };
}

/* An upload of this title on the channel since `since` (ms): the video id, or null. */
export function sameUpload(items, title, since) {
  const want = String(title || '').trim();
  const hit = (items || []).find((it) => String(it?.snippet?.title || '').trim() === want
    && Date.parse(it?.snippet?.publishedAt || '') >= since && it?.snippet?.resourceId?.videoId);
  return hit ? hit.snippet.resourceId.videoId : null;
}

/* The channel's 50 latest uploads, private and scheduled ones included (the owner's token sees them). 2 quota units. */
async function recentUploads(token) {
  const { body: ch } = await api(token, 'https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true');
  const list = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!list) return [];
  const { body } = await api(token, `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${encodeURIComponent(list)}`);
  return body.items || [];
}

/* What --confirm checks: uploads by the API whose publish time is LIVE_AFTER_MINUTES past, not yet seen public, at most CONFIRM_HOURS old. */
export const LIVE_AFTER_MINUTES = 60;
export const CONFIRM_HOURS = 72;
export function toConfirm(rows, now = Date.now()) {
  return rows.filter((r) => {
    const y = r.posts?.youtube;
    if (!y || y.by !== 'api' || y.live) return false;
    const t = Date.parse(y.publish_at || y.at || '');
    return Number.isFinite(t) && now - t >= LIVE_AFTER_MINUTES * 60000 && now - t <= CONFIRM_HOURS * 3600000;
  });
}

/* Resumable upload: one session, the bytes in one PUT (a Short is a few MB). */
export async function uploadShort(token, { video, copy, plan = { privacyStatus: 'public' } }) {
  const meta = {
    snippet: { title: copy.title, description: copy.description, tags: copy.tags, categoryId: '20' },
    status: { ...plan, selfDeclaredMadeForKids: false },
  };
  const bytes = fs.readFileSync(video);
  const { res } = await api(token, 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': 'video/mp4', 'X-Upload-Content-Length': String(bytes.length) },
    body: JSON.stringify(meta),
  });
  const session = res.headers.get('location');
  if (!session) throw new Error('YouTube returned no upload session');
  const { body } = await api(token, session, { method: 'PUT', headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(bytes.length) }, body: bytes });
  const posted = { id: body.id, url: `https://youtube.com/shorts/${body.id}`, privacy: body.status?.privacyStatus || null, at: new Date().toISOString(), by: 'api' };
  if (plan.publishAt) posted.publish_at = plan.publishAt;
  return posted;
}

async function confirm(token) {
  const rows = toConfirm(readLedger());
  if (!rows.length) { console.log(JSON.stringify({ ok: true, confirm: 'nothing to check' })); return; }
  const ids = rows.map((r) => r.posts.youtube.id);
  const { body } = await api(token, `https://www.googleapis.com/youtube/v3/videos?part=status&id=${ids.map(encodeURIComponent).join(',')}`);
  const seen = new Map((body.items || []).map((v) => [v.id, v.status || {}]));
  const stuck = [];
  for (const r of rows) {
    const y = r.posts.youtube;
    const st = seen.get(y.id);
    if (st && st.privacyStatus === 'public') {
      updateLedgerRow(r.id, (x) => { x.posts.youtube.live = true; x.posts.youtube.privacy = 'public'; });
      console.log(JSON.stringify({ ok: true, id: r.id, live: y.url }));
    } else {
      const why = st
        ? `still ${st.privacyStatus}, upload ${st.uploadStatus}${st.rejectionReason ? `, rejected: ${st.rejectionReason}` : ''}${st.failureReason ? `, failed: ${st.failureReason}` : ''}`
        : 'not on the channel';
      stuck.push(`${r.id} (${y.url}): ${why}`);
    }
  }
  if (stuck.length) throw new Error(`not public an hour after its time: ${stuck.join('; ')}. If YouTube locked it private, switch AUTO_POST_YOUTUBE off and upload by hand (strategy/POSTING.md)`);
}

async function main() {
  const token = await accessToken();
  if (arg('whoami')) {
    console.log(JSON.stringify({ ok: true, channel: await whoami(token) }));
    return;
  }
  if (arg('confirm')) { await confirm(token); return; }
  const id = arg('id');
  const row = typeof id === 'string' ? findRow(id) : null;
  if (!row) throw new Error(id ? `no ledger row ${id}` : 'an --id is needed');
  if (row.posts?.youtube && !arg('again')) throw new Error(`${row.id} is already on YouTube: ${row.posts.youtube.url}`);
  const { video, meta } = filesFor(row);
  const copy = youtubeCopy(JSON.parse(fs.readFileSync(meta, 'utf8')));
  const plan = publishPlan(row.post_at);

  /* Already up (an upload whose ledger write was lost): record it, never upload it twice. */
  const found = arg('again') ? null : sameUpload(await recentUploads(token), copy.title, Date.now() - 3 * 86400000);
  if (found) {
    const posted = { id: found, url: `https://youtube.com/shorts/${found}`, at: new Date().toISOString(), by: 'api', found: true };
    if (plan.publishAt) posted.publish_at = plan.publishAt;
    updateLedgerRow(row.id, (r) => { r.posts = { ...(r.posts || {}), youtube: posted }; r.status = 'posted'; });
    console.log(JSON.stringify({ ok: true, id: row.id, youtube: posted, note: 'already on the channel; recorded, not uploaded again' }));
    return;
  }

  const posted = await uploadShort(token, { video, copy, plan });
  updateLedgerRow(row.id, (r) => { r.posts = { ...(r.posts || {}), youtube: posted }; r.status = 'posted'; });
  console.log(JSON.stringify({ ok: true, id: row.id, youtube: posted }));
  if (!plan.publishAt && posted.privacy !== 'public') {
    throw new Error(`${row.id} was uploaded ${posted.privacy || 'without a privacy status'}, not public: ${posted.url}. If YouTube locked it private, switch AUTO_POST_YOUTUBE off (strategy/POSTING.md)`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => { console.log(JSON.stringify({ ok: false, error: scrub(err.message) })); process.exit(1); });
}
