/*
  Upload a rendered video to the Herd Games YouTube channel as a Short (YouTube Data API v3).

    node pipeline/post-youtube.mjs --whoami          which channel the token reaches, uploads nothing
    node pipeline/post-youtube.mjs --id=2026-11-13-B upload it (title, description, tags from the release)

  Env: YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN (pipeline/setup-youtube-token.mjs stores
  them as secrets). Nothing secret is ever printed.

  UNTIL GOOGLE AUDITS THE PROJECT, every API upload is locked private and can never be made
  public, so nothing uploads automatically before then (repo variable AUTO_POST_YOUTUBE stays
  off; strategy/POSTING.md). A vertical video under 3 minutes is a Short on its own.
*/
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { findRow, updateLedgerRow } from './ledger.mjs';
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

/* Resumable upload: one session, the bytes in one PUT (a Short is a few MB). */
export async function uploadShort(token, { video, copy }) {
  const meta = {
    snippet: { title: copy.title, description: copy.description, tags: copy.tags, categoryId: '20' },
    status: { privacyStatus: 'public', selfDeclaredMadeForKids: false },
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
  return { id: body.id, url: `https://youtube.com/shorts/${body.id}`, privacy: body.status?.privacyStatus || null, at: new Date().toISOString(), by: 'api' };
}

async function main() {
  const token = await accessToken();
  if (arg('whoami')) {
    console.log(JSON.stringify({ ok: true, channel: await whoami(token) }));
    return;
  }
  const id = arg('id');
  const row = typeof id === 'string' ? findRow(id) : null;
  if (!row) throw new Error(id ? `no ledger row ${id}` : 'an --id is needed');
  if (row.posts?.youtube && !arg('again')) throw new Error(`${row.id} is already on YouTube: ${row.posts.youtube.url}`);
  const { video, meta } = filesFor(row);
  const copy = youtubeCopy(JSON.parse(fs.readFileSync(meta, 'utf8')));
  const posted = await uploadShort(token, { video, copy });
  updateLedgerRow(row.id, (r) => { r.posts = { ...(r.posts || {}), youtube: posted }; r.status = 'posted'; });
  console.log(JSON.stringify({ ok: true, id: row.id, youtube: posted }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => { console.log(JSON.stringify({ ok: false, error: scrub(err.message) })); process.exit(1); });
}
