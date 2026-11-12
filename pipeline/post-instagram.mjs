/*
  Post a rendered video to Instagram as a Reel (Meta's Instagram Graph API,
  Facebook Login path, the same as the carousel poster).

    node pipeline/post-instagram.mjs --whoami            check the token and account, post nothing
    node pipeline/post-instagram.mjs --dry-run [--id=…]  show the caption and file, post nothing
    node pipeline/post-instagram.mjs [--id=2026-11-13-B] [--trial] post (default: the latest rendered row; --trial: a Trial Reel)

  Env: IG_USER_ID (the Instagram professional account's id), IG_ACCESS_TOKEN (a
  Page access token with instagram_basic + instagram_content_publish), and
  optionally GRAPH_VERSION. The token is sent in a header and never printed.

  How it posts (developers.facebook.com, Instagram Platform > Content Publishing):
    1. POST /{ig-user}/media  media_type=REELS, upload_type=resumable, caption,
       thumb_offset (the cover frame, PRINCIPLES rule 2), share_to_feed
    2. the MP4's bytes to rupload.facebook.com: no public hosting needed
    3. poll the container until status_code is FINISHED
    4. POST /{ig-user}/media_publish, then read the permalink
  The ledger row gets posts.instagram = { id, permalink, at }. A row that already
  has one is never posted again (--again overrides, on purpose only).
*/
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, engagementAsks } from './lib.mjs';
import { findRow, latestRow, updateLedgerRow } from './ledger.mjs';

const GRAPH = 'https://graph.facebook.com';
const RUPLOAD = 'https://rupload.facebook.com/ig-api-upload';
export const THUMB_OFFSET_MS = 1500;
const CAPTION_MAX = 2200;
const HASHTAG_MAX = 30;

const arg = (name) => {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return null;
  return hit.includes('=') ? hit.slice(hit.indexOf('=') + 1) : true;
};

/*
  The caption: the title as the first line (Instagram shows about one line
  before "more"), the real question the video asks, then the description, which
  already carries the finding, "Play today's … free: herdgamesonline.com", any
  credit and the hashtags. Refused if it asks for engagement (rule 8) or breaks
  Instagram's limits.
*/
export function caption(meta) {
  const parts = [meta.title];
  if (meta.pinned && !meta.description.includes(meta.pinned)) parts.push(meta.pinned);
  parts.push(meta.description);
  const text = parts.filter(Boolean).join('\n\n').trim();
  const asks = engagementAsks({ caption: text });
  if (asks.length) throw new Error(`caption asks for engagement (PRINCIPLES rule 8): ${asks.join('; ')}`);
  if (text.length > CAPTION_MAX) throw new Error(`caption is ${text.length} characters, Instagram allows ${CAPTION_MAX}`);
  const tags = text.match(/#[\p{L}\p{N}_]+/gu) || [];
  if (tags.length > HASHTAG_MAX) throw new Error(`caption has ${tags.length} hashtags, Instagram allows ${HASHTAG_MAX}`);
  return text;
}

/* The files for a ledger row: renders/<file>.mp4 and its .meta.json beside it. */
export function filesFor(row) {
  if (!row || !row.file) throw new Error('that ledger row has no rendered file');
  const video = path.join(ROOT, 'renders', row.file);
  const meta = video.replace(/\.mp4$/, '.meta.json');
  return { video, meta };
}

function env() {
  const user = process.env.IG_USER_ID;
  const token = process.env.IG_ACCESS_TOKEN;
  if (!user || !token) throw new Error('IG_USER_ID and IG_ACCESS_TOKEN must be set (see strategy/POSTING.md)');
  if (!/^\d+$/.test(user)) throw new Error('IG_USER_ID must be the numeric Instagram account id');
  return { user, token, version: process.env.GRAPH_VERSION || 'v25.0' };
}

/* Every error from Meta is passed through this, so a token can never reach a log. */
export const redact = (s, token) => String(s).split(token).join('[token]');

async function graph(e, method, pathname, params) {
  const url = new URL(`${GRAPH}/${e.version}/${pathname}`);
  const init = { method, headers: { Authorization: `OAuth ${e.token}` } };
  if (method === 'GET') {
    for (const [k, v] of Object.entries(params || {})) url.searchParams.set(k, String(v));
  } else {
    init.body = new URLSearchParams(Object.entries(params || {}).map(([k, v]) => [k, String(v)]));
  }
  const res = await fetch(url, init);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 300) }; }
  if (!res.ok || body.error) {
    const m = body.error ? `${body.error.message} (code ${body.error.code}${body.error.error_subcode ? `/${body.error.error_subcode}` : ''})` : `HTTP ${res.status} ${body.raw || ''}`;
    throw new Error(redact(`${method} ${pathname}: ${m}`, e.token));
  }
  return body;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function whoami() {
  const e = env();
  const who = await graph(e, 'GET', e.user, { fields: 'username,name,media_count' });
  const limit = await graph(e, 'GET', `${e.user}/content_publishing_limit`, { fields: 'quota_usage,config' }).catch((err) => ({ error: err.message }));
  return { username: who.username, name: who.name, media: who.media_count, publishing: limit.data?.[0] || limit };
}

/*
  Trial Reels (12 Nov 2026, Ajey: "Yes post the Trial Reel"): shown first only to people who
  do not follow the account, which is the only audience a new account has. SS_PERFORMANCE lets
  Instagram share it to followers too when it does well. trial_params is part of the create-media
  call (Meta Instagram Platform changelog, Content Publishing).
*/
export const TRIAL = { graduation_strategy: 'SS_PERFORMANCE' };

export async function postReel({ video, text, trial = false, log = () => {} }) {
  const e = env();
  const bytes = fs.readFileSync(video);
  log(`creating the ${trial ? 'Trial ' : ''}Reel container (${(bytes.length / 1e6).toFixed(1)} MB)`);
  const params = { media_type: 'REELS', upload_type: 'resumable', caption: text, thumb_offset: THUMB_OFFSET_MS, share_to_feed: true };
  if (trial) params.trial_params = JSON.stringify(TRIAL);
  const container = await graph(e, 'POST', `${e.user}/media`, params);
  if (!container.id) throw new Error('Meta returned no container id');

  log('uploading the video to Meta');
  const up = await fetch(`${RUPLOAD}/${e.version}/${container.id}`, {
    method: 'POST',
    headers: { Authorization: `OAuth ${e.token}`, offset: '0', file_size: String(bytes.length), 'Content-Type': 'application/octet-stream' },
    body: bytes,
  });
  const upText = await up.text();
  if (!up.ok) throw new Error(redact(`upload failed: HTTP ${up.status} ${upText.slice(0, 300)}`, e.token));

  log('waiting for Instagram to process it');
  let status = null;
  for (let i = 0; i < 60; i += 1) {
    status = await graph(e, 'GET', container.id, { fields: 'status_code,status' });
    if (status.status_code === 'FINISHED') break;
    if (status.status_code === 'ERROR' || status.status_code === 'EXPIRED') throw new Error(`Instagram could not process the video: ${status.status_code} ${status.status || ''}`);
    await sleep(5000);
  }
  if (status?.status_code !== 'FINISHED') throw new Error(`still processing after 5 minutes (${status?.status_code}); container ${container.id}`);

  log('publishing');
  const pub = await graph(e, 'POST', `${e.user}/media_publish`, { creation_id: container.id });
  const media = await graph(e, 'GET', pub.id, { fields: 'permalink,shortcode,timestamp' }).catch(() => ({}));
  return { id: pub.id, permalink: media.permalink || null, at: media.timestamp || new Date().toISOString() };
}

async function main() {
  if (arg('whoami')) {
    console.log(JSON.stringify({ ok: true, ...(await whoami()) }));
    return;
  }
  const id = arg('id');
  const row = typeof id === 'string' ? findRow(id) : latestRow();
  if (!row) throw new Error(id ? `no ledger row ${id}` : 'the ledger has no rendered video yet');
  if (row.posts?.instagram && !arg('again')) throw new Error(`${row.id} is already on Instagram: ${row.posts.instagram.permalink || row.posts.instagram.id}`);
  const { video, meta } = filesFor(row);
  if (!fs.existsSync(video)) throw new Error(`missing ${path.relative(ROOT, video)} (download it from the release short-${row.id})`);
  const text = caption(JSON.parse(fs.readFileSync(meta, 'utf8')));

  if (arg('dry-run')) {
    console.log(`${row.id}  ${path.relative(ROOT, video)}  cover at ${THUMB_OFFSET_MS} ms${arg('trial') ? ', Trial Reel' : ''}\n\n${text}`);
    return;
  }
  const trial = Boolean(arg('trial'));
  const posted = { ...(await postReel({ video, text, trial, log: (m) => console.error(`  ${m}`) })), trial };
  updateLedgerRow(row.id, (r) => {
    r.posts = { ...(r.posts || {}), instagram: posted };
    r.status = 'posted';
  });
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `instagram=${posted.permalink || posted.id}\n`);
  console.log(JSON.stringify({ ok: true, id: row.id, instagram: posted }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => { console.log(JSON.stringify({ ok: false, error: err.message })); process.exit(1); });
}
