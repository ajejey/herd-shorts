#!/usr/bin/env node
/*
  Copy the shared pieces into every template, so each opens on its own in the
  preview exactly as it renders: templates/_shared/herd.js → assets/herd.js,
  _shared/sfx → assets/shared/sfx, _shared/music → assets/shared/music.
  build.mjs does the same into each day's project; check.mjs fails if a
  template's copy is stale.

    node pipeline/sync-shared.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, FORMATS } from './lib.mjs';

const SHARED = path.join(ROOT, 'templates', '_shared');

export function syncInto(dir) {
  fs.copyFileSync(path.join(SHARED, 'herd.js'), path.join(dir, 'assets', 'herd.js'));
  for (const sub of ['sfx', 'music']) {
    const from = path.join(SHARED, sub), to = path.join(dir, 'assets', 'shared', sub);
    if (!fs.existsSync(from)) continue;
    fs.rmSync(to, { recursive: true, force: true });
    fs.mkdirSync(to, { recursive: true });
    for (const f of fs.readdirSync(from)) if (/\.(mp3|wav|md|json)$/.test(f) && !f.startsWith('_raw')) fs.copyFileSync(path.join(from, f), path.join(to, f));
  }
}

/* Files in _shared that a template's copy is missing or has different. */
export function staleIn(dir) {
  const out = [];
  const same = (a, b) => fs.existsSync(b) && fs.readFileSync(a).equals(fs.readFileSync(b));
  if (!same(path.join(SHARED, 'herd.js'), path.join(dir, 'assets', 'herd.js'))) out.push('herd.js');
  for (const sub of ['sfx', 'music']) {
    const from = path.join(SHARED, sub);
    if (!fs.existsSync(from)) continue;
    for (const f of fs.readdirSync(from)) if (/\.(mp3|wav)$/.test(f) && !same(path.join(from, f), path.join(dir, 'assets', 'shared', sub, f))) out.push(`${sub}/${f}`);
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const dir of Object.values(FORMATS)) {
    const t = path.join(ROOT, 'templates', dir);
    if (!fs.existsSync(path.join(t, 'index.html'))) continue;
    syncInto(t);
    console.log(`synced ${dir}`);
  }
}
