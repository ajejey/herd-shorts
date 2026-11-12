/*
  YouTube, by hand until the API can post publicly (videos uploaded through an
  unaudited API project are locked private, so the first weeks go up by hand).

    node pipeline/youtube-kit.mjs [--id=2026-11-13-B]
        writes renders/<video>.youtube.txt: the title, description, tags and the
        question to pin, ready to paste into YouTube Studio or the app
    node pipeline/youtube-kit.mjs --id=2026-11-13-B --posted=https://youtube.com/shorts/AbC123
        records the Short in the ledger, so the collectors and the weekly review find it

  A vertical video under 3 minutes is a Short on its own; no #Shorts needed.
*/
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, engagementAsks } from './lib.mjs';
import { findRow, latestRow, updateLedgerRow } from './ledger.mjs';
import { filesFor } from './post-instagram.mjs';

const arg = (name) => {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return null;
  return hit.includes('=') ? hit.slice(hit.indexOf('=') + 1) : true;
};

/* YouTube's own limits: title 100 characters, description 5,000, and neither may contain < or >. */
export function youtubeCopy(meta) {
  const title = String(meta.title || '').trim();
  const description = String(meta.description || '').trim();
  const problems = [];
  if (!title) problems.push('no title');
  if (title.length > 100) problems.push(`title is ${title.length} characters (YouTube allows 100)`);
  if (description.length > 5000) problems.push(`description is ${description.length} characters (YouTube allows 5000)`);
  if (/[<>]/.test(title + description)) problems.push('YouTube refuses < and > in titles and descriptions');
  const asks = engagementAsks({ title, description, pinned: meta.pinned || '' });
  if (asks.length) problems.push(`asks for engagement (PRINCIPLES rule 8): ${asks.join('; ')}`);
  if (problems.length) throw new Error(problems.join('; '));
  const tags = (meta.tags || []).map((t) => t.replace(/^#/, '')).filter(Boolean);
  return { title, description, tags, pinned: meta.pinned || '' };
}

/* The Short's id from any of its URL shapes: /shorts/ID, watch?v=ID, youtu.be/ID. */
export function shortId(url) {
  let u;
  try { u = new URL(url); } catch { return null; }
  if (!/(^|\.)(youtube\.com|youtu\.be)$/.test(u.hostname)) return null;
  const id = u.hostname.endsWith('youtu.be') ? u.pathname.slice(1) : (u.pathname.match(/^\/shorts\/([^/]+)/)?.[1] || u.searchParams.get('v'));
  return id && /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : null;
}

function main() {
  const id = arg('id');
  const row = typeof id === 'string' ? findRow(id) : latestRow();
  if (!row) throw new Error(id ? `no ledger row ${id}` : 'the ledger has no rendered video yet');

  const posted = arg('posted');
  if (posted) {
    const vid = shortId(String(posted));
    if (!vid) throw new Error(`not a YouTube link: ${posted}`);
    updateLedgerRow(row.id, (r) => {
      r.posts = { ...(r.posts || {}), youtube: { id: vid, url: `https://youtube.com/shorts/${vid}`, at: new Date().toISOString(), by: 'hand' } };
      r.status = 'posted';
    });
    console.log(JSON.stringify({ ok: true, id: row.id, youtube: vid }));
    return;
  }

  const { video, meta } = filesFor(row);
  const c = youtubeCopy(JSON.parse(fs.readFileSync(meta, 'utf8')));
  const out = video.replace(/\.mp4$/, '.youtube.txt');
  const text = [
    `VIDEO\n${path.relative(ROOT, video)}`,
    `TITLE\n${c.title}`,
    `DESCRIPTION\n${c.description}`,
    `TAGS\n${c.tags.join(', ')}`,
    c.pinned ? `PIN AS THE FIRST COMMENT\n${c.pinned}` : '',
    `AFTER POSTING\nnode pipeline/youtube-kit.mjs --id=${row.id} --posted=<the Short's link>`,
  ].filter(Boolean).join('\n\n');
  fs.writeFileSync(out, `${text}\n`);
  console.log(`${text}\n\n(saved to ${path.relative(ROOT, out)})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (err) { console.log(JSON.stringify({ ok: false, error: err.message })); process.exit(1); }
}
