#!/usr/bin/env node
/*
  The sound library every template shares: real recorded game-show sounds, two or
  three takes of each so a repeated action never plays the identical file twice
  in a row. Public domain only (CC0), from Freesound; ranked by how often other
  creators downloaded them. Peak-normalised to -3 dBFS so volumes in the
  templates mean the same thing for every file.

    FREESOUND_API_KEY=... node pipeline/fetch-sfx.mjs           # fetch what's missing
    FREESOUND_API_KEY=... node pipeline/fetch-sfx.mjs --refetch tick

  Writes templates/_shared/sfx/<cue>-<n>.mp3, manifest.json and CREDITS.md.
*/
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from './lib.mjs';

const KEY = process.env.FREESOUND_API_KEY;
if (!KEY) { console.error('✗ FREESOUND_API_KEY is not set'); process.exit(1); }
const OUT = path.join(ROOT, 'templates', '_shared', 'sfx');
fs.mkdirSync(OUT, { recursive: true });

/* cue: what it is for, the search, the length range in seconds, how many takes */
export const CUES = {
  tick: { for: 'each second of a countdown', q: 'clock tick', d: [0.05, 1.2], n: 3 },
  drumroll: { for: 'the hold right before the answer', q: 'drumroll', d: [1.5, 4], n: 2 },
  ding: { for: 'the answer revealed / right', q: 'correct answer ding', d: [0.3, 3], n: 2 },
  buzzer: { for: 'wrong / time up', q: 'wrong answer buzzer', d: [0.3, 2.5], n: 1 },
  ooh: { for: 'a surprising number', q: 'crowd ooh', d: [0.8, 4], n: 2 },
  cheer: { for: 'the big reveal landing', q: 'crowd cheer short', d: [1, 5], n: 2 },
  whoosh: { for: 'a big element moving fast, a scene change', q: 'whoosh', d: [0.2, 1.5], n: 3 },
  pop: { for: 'a chip, badge or number landing', q: 'bubble pop', d: [0.05, 0.6], n: 3 },
  flip: { for: 'a tile or card flipping', q: 'card flip', d: [0.05, 0.9], n: 3 },
  pencil: { for: 'a doodle line drawing', q: 'pencil scribble', d: [0.3, 2.2], n: 3 },
  baa: { for: 'the herd arriving (our signature)', q: 'sheep baa', d: [0.4, 2.5], n: 3 },
  moo: { for: 'the cow host reacting', q: 'cow moo', d: [0.5, 3], n: 1 },
  impact: { for: 'the reveal hit (mid-range: phone speakers lose sub-bass)', q: 'punchy hit', d: [0.3, 2.5], n: 2 },
  key: { for: 'a letter tile landing', q: 'typewriter key', d: [0.03, 0.4], n: 3 },
  riser: { for: 'tension into the reveal', q: 'riser', d: [1, 4], n: 1 },
  // Chosen by id: the best-rated, most-downloaded CC0 takes of the sounds that matter most
  tada: { for: 'the answer revealed: the celebration', ids: [397355, 397353] },
  build: { for: 'the rumbling roll into the reveal', ids: [535607] },
  beep: { for: 'the last 3 seconds of a countdown', ids: [515317] },
  rimshot: { for: 'a joke landing (ba-dum-tss)', ids: [573259] },
};

const refetch = new Set(process.argv.includes('--refetch') ? process.argv.slice(process.argv.indexOf('--refetch') + 1) : []);
const manifestFile = path.join(OUT, 'manifest.json');
const manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : {};

async function byIds(ids) {
  const out = [];
  for (const id of ids) {
    const r = await fetch(`https://freesound.org/apiv2/sounds/${id}/?fields=id,name,username,duration,license,previews,url`, { headers: { Authorization: `Token ${KEY}` }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`sound ${id}: ${r.status}`);
    const s = await r.json();
    if (!String(s.license).includes('publicdomain/zero')) throw new Error(`sound ${id} is not CC0 (${s.license})`);
    out.push(s);
  }
  return out;
}

async function search(cue) {
  const u = new URL('https://freesound.org/apiv2/search/text/');
  u.searchParams.set('query', cue.q);
  u.searchParams.set('filter', `license:"Creative Commons 0" duration:[${cue.d[0]} TO ${cue.d[1]}]`);
  u.searchParams.set('fields', 'id,name,username,duration,license,previews,num_downloads,url');
  u.searchParams.set('sort', 'downloads_desc');
  u.searchParams.set('page_size', String(cue.n + 4));
  const r = await fetch(u, { headers: { Authorization: `Token ${KEY}` }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`search "${cue.q}": ${r.status}`);
  return (await r.json()).results || [];
}

for (const [name, cue] of Object.entries(CUES)) {
  if (manifest[name] && !refetch.has(name)) { console.log(`  have ${name} (${manifest[name].length})`); continue; }
  const results = cue.ids ? await byIds(cue.ids) : (await search(cue)).slice(0, cue.n);
  const takes = [];
  for (const [i, s] of results.entries()) {
    const file = `${name}-${i + 1}.mp3`;
    const raw = path.join(OUT, `_raw-${file}`);
    const res = await fetch(s.previews['preview-hq-mp3'], { signal: AbortSignal.timeout(30000) });
    fs.writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
    // Peak-normalise to -3 dBFS and trim leading silence, so the hit is at the clip's start
    const vol = spawnSync('ffmpeg', ['-i', raw, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' });
    const peak = Number((vol.stderr.match(/max_volume: (-?[\d.]+) dB/) || [])[1] || 0);
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-af', `silenceremove=start_periods=1:start_threshold=-45dB,volume=${(-3 - peak).toFixed(1)}dB`, '-ac', '2', '-ar', '44100', '-b:a', '160k', path.join(OUT, file)]);
    fs.rmSync(raw);
    const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(OUT, file)], { encoding: 'utf8' });
    takes.push({ file, duration: Number(Number(probe.stdout.trim()).toFixed(3)), source: s.url, title: s.name, by: s.username, license: 'CC0' });
  }
  manifest[name] = takes;
  console.log(`  ${name}: ${takes.map((t) => `${t.title} (${t.duration}s)`).join(' | ')}`);
}

fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
const credits = ['# Sound effects', '', 'All CC0 (public domain) from Freesound: no credit is required; listed so anyone can find the originals.', ''];
for (const [name, takes] of Object.entries(manifest)) for (const t of takes) credits.push(`- \`${t.file}\` (${CUES[name]?.for || name}): "${t.title}" by ${t.by}, ${t.source}`);
fs.writeFileSync(path.join(OUT, 'CREDITS.md'), `${credits.join('\n')}\n`);
console.log(`\n${Object.values(manifest).flat().length} sounds in templates/_shared/sfx`);
