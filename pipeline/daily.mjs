#!/usr/bin/env node
/*
  The day's video: take Claude's pick (picks/<date>.json) or, if there is none,
  choose by the strategy settings; render it; record it in the ledger.

    node pipeline/daily.mjs [--day=162] [--format=B-board] [--date=2026-11-12]

  --day      the finished herd day to use (default: the newest file in data/)
  --format   force a format (default: the pick, else the strategy's choice)
  --date     the posting date the video is for (default: today, UTC)

  Fallback choice (no pick): formats marked testing or working, weighted by
  strategy.json, never the same format two days running, and with
  explore_share chance (seeded by the day, so a rerun chooses the same) of the
  least-used format instead. A format that can't be made from the day's data is
  skipped, with the reason printed.
*/
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, FORMATS, readJson, NotEligible, sensitiveHits } from './lib.mjs';
import { render } from './render.mjs';
import { metadata } from './metadata.mjs';

const LEDGER = path.join(ROOT, 'ledger', 'videos.jsonl');
const GAME = { 'A-herd-line': 'daily-guesstimate', 'B-board': 'top-answers', 'C-dial': 'hot-takes', 'D-doodle': 'guess-the-doodle', 'E-word-climb': 'word-climb', 'F-secret-word': 'secret-word', 'G-words-from': 'words-from-a-word' };
const LONG = new Set(['guesses', 'strokes', 'ticks1', 'ticks2', 'lineTimes', 'rungTimes', 'chipTimes', 'wordTimes', 'endGame', 'endHead', 'credit', 'gotByLine']);

export const readLedger = () => (fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);

function writeLedgerRow(row) {
  const rows = readLedger().filter((r) => r.id !== row.id);
  rows.push(row);
  rows.sort((a, b) => (a.id < b.id ? -1 : 1));
  fs.writeFileSync(LEDGER, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
}

/* mulberry32: the same day always makes the same choice */
const seeded = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

export async function eligible(data) {
  const out = [];
  for (const [format, dir] of Object.entries(FORMATS)) {
    try {
      const { vars } = await import(pathToFileURL(path.join(ROOT, 'pipeline', 'formats', `${dir}.mjs`)).href);
      const hits = sensitiveHits(vars(data, {}));
      if (hits.length) { console.error(`  skip ${format}: sensitive words on screen (${hits.join(', ')}); only a pick can choose it`); continue; }
      out.push(format);
    } catch (err) {
      console.error(`  skip ${format}: ${err instanceof NotEligible ? err.message : `error: ${err.message}`}`);
    }
  }
  return out;
}

export function chooseFormat({ strategy, ledger, can, day }) {
  const live = Object.entries(strategy.formats).filter(([f, s]) => can.includes(f) && ['testing', 'working'].includes(s.status) && s.weight > 0);
  if (!live.length) return null;
  const last = ledger.length ? ledger[ledger.length - 1].format : null;
  const pool = live.length > 1 ? live.filter(([f]) => f !== last) : live;
  const rand = seeded(day * 7919);
  const used = (f) => ledger.filter((r) => r.format === f).length;
  if (rand() < (strategy.explore_share || 0)) {
    return { format: [...pool].sort((a, b) => used(a[0]) - used(b[0]) || (a[0] < b[0] ? -1 : 1))[0][0], explore: true };
  }
  const total = pool.reduce((a, [, s]) => a + s.weight, 0);
  let r = rand() * total;
  for (const [f, s] of pool) { r -= s.weight; if (r <= 0) return { format: f, explore: false }; }
  return { format: pool[pool.length - 1][0], explore: false };
}

async function main() {
  const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
  const date = arg('date') || new Date().toISOString().slice(0, 10);
  // The 09:00 fallback asks first: has anything been rendered for this date already?
  if (process.argv.includes('--check-done')) {
    const done = readLedger().some((r) => r.date === date);
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `done=${done}\n`);
    console.log(done ? `already rendered for ${date}` : `nothing rendered for ${date} yet`);
    return;
  }
  const days =fs.readdirSync(path.join(ROOT, 'data')).filter((f) => /^\d+\.json$/.test(f)).map((f) => Number(f.slice(0, -5)));
  const day = Number(arg('day')) || Math.max(...days);
  const data = readJson(path.join(ROOT, 'data', `${day}.json`));
  const strategy = readJson(path.join(ROOT, 'strategy', 'strategy.json'));
  const ledger = readLedger();

  const pickFile = path.join(ROOT, 'picks', `${date}.json`);
  let pick = fs.existsSync(pickFile) ? readJson(pickFile) : null;
  let explore = !!pick?.explore;
  let source = pick ? 'pick' : 'strategy';
  if (pick && pick.day && pick.day !== day) { console.error(`  the pick is for day ${pick.day}, data is day ${day}: using the pick's day`); }
  const useDay = pick?.day || day;
  let format = arg('format') || pick?.format;
  if (arg('format')) source = 'forced';
  if (!format) {
    const can = await eligible(useDay === day ? data : readJson(path.join(ROOT, 'data', `${useDay}.json`)));
    const choice = chooseFormat({ strategy, ledger, can, day: useDay });
    if (!choice) throw new Error('no format can be made from this day');
    ({ format, explore } = choice);
    pick = { format, day: useDay };
  }

  const r = await render({ format, day: useDay, pick: pick || {} });
  // Title, description, pinned question: from the day's content, never too close to the last 20 titles
  const recent = ledger.slice(-20).map((x) => x.title).filter(Boolean);
  const meta = metadata(format, r.values, { recent, copy: (pick && pick.copy) || {} });
  const metaFile = r.file.replace(/\.mp4$/, '.meta.json');
  fs.writeFileSync(path.join(ROOT, metaFile), `${JSON.stringify(meta, null, 2)}\n`);
  const letter = format.charAt(0);
  const row = {
    id: `${date}-${letter}`,
    date,
    format,
    game: GAME[format],
    day: useDay,
    source,
    data: Object.fromEntries(Object.entries(r.values).filter(([k, v]) => !LONG.has(k) && (typeof v === 'number' || (typeof v === 'string' && v.length <= 140)))),
    hook: r.values.hook || r.values.label || r.values.question || null,
    title: meta.title,
    variety: { theme: r.values.theme, party: r.values.party, react: r.values.react, music: r.values.music },
    explore,
    length_s: r.duration,
    status: 'rendered',
    file: path.basename(r.file),
    posts: {},
    metrics: {},
  };
  writeLedgerRow(row);
  const out = { ok: true, id: row.id, format, day: useDay, source, explore, file: r.file, sheet: r.sheet, duration: r.duration, warnings: r.warnings };
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `id=${row.id}\nfile=${r.file.replace(/\\/g, '/')}\nsheet=${r.sheet.replace(/\\/g, '/')}\nmeta=${metaFile.replace(/\\/g, '/')}\nformat=${format}\nday=${useDay}\n`);
  }
  console.log(JSON.stringify(out));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => { console.log(JSON.stringify({ ok: false, error: err.message })); process.exit(1); });
}
