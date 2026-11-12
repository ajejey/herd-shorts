#!/usr/bin/env node
/*
  The day's videos: strategy.per_day of them, the first from Claude's pick (picks/<date>.json)
  if there is one, the rest by the strategy settings; each rendered, given its posting time
  (post_at, from strategy.slots_utc) and recorded in the ledger. pipeline/post-due.mjs posts
  them when their time comes.

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
import { readLedger, writeLedgerRow } from './ledger.mjs';

export { readLedger };

const GAME = { 'A-herd-line': 'daily-guesstimate', 'B-board': 'top-answers', 'C-dial': 'hot-takes', 'D-doodle': 'guess-the-doodle', 'E-word-climb': 'word-climb', 'F-secret-word': 'secret-word', 'G-words-from': 'words-from-a-word' };
const LONG = new Set(['guesses', 'strokes', 'ticks1', 'ticks2', 'lineTimes', 'rungTimes', 'chipTimes', 'wordTimes', 'endGame', 'endHead', 'credit', 'gotByLine']);


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

export function chooseFormat({ strategy, ledger, can, day, salt = 0 }) {
  const live = Object.entries(strategy.formats).filter(([f, s]) => can.includes(f) && ['testing', 'working'].includes(s.status) && s.weight > 0);
  if (!live.length) return null;
  const last = ledger.length ? ledger[ledger.length - 1].format : null;
  const pool = live.length > 1 ? live.filter(([f]) => f !== last) : live;
  const rand = seeded(day * 7919 + salt * 104729);
  const used = (f) => ledger.filter((r) => r.format === f).length;
  if (rand() < (strategy.explore_share || 0)) {
    return { format: [...pool].sort((a, b) => used(a[0]) - used(b[0]) || (a[0] < b[0] ? -1 : 1))[0][0], explore: true };
  }
  const total = pool.reduce((a, [, s]) => a + s.weight, 0);
  let r = rand() * total;
  for (const [f, s] of pool) { r -= s.weight; if (r <= 0) return { format: f, explore: false }; }
  return { format: pool[pool.length - 1][0], explore: false };
}

/*
  POSTING SLOTS (12 Nov 2026, Ajey: "Go for instagram scheduler"). Each render date posts
  strategy.per_day videos at strategy.slots_utc hours, chosen and ordered so that over a few days
  every format meets every slot: the weekly review can then tell "this format works" from "this
  time works". Hours are UTC: 08 is the Australian evening, 19 the UK evening and US lunch, 01
  (the next calendar day) the US evening.
*/
export function planSlots(date, day, perDay, slots) {
  const base = Date.parse(`${date}T00:00:00Z`);
  const first = slots[0];
  const at = (h) => new Date(base + (h < first ? 24 + h : h) * 3600000).toISOString();
  const n = Math.min(perDay, slots.length);
  const start = ((day % slots.length) + slots.length) % slots.length;
  const picked = Array.from({ length: n }, (_, i) => slots[(start + i) % slots.length]);
  return picked.map(at).sort();
}

/* The day's formats, all different, none the same as the last video before them. */
export function chooseFormats({ strategy, ledger, can, day, n }) {
  const out = [];
  const seen = [...ledger];
  for (let k = 0; k < n; k += 1) {
    const choice = chooseFormat({ strategy, ledger: seen, can: can.filter((f) => !out.some((o) => o.format === f)), day, salt: k });
    if (!choice) break;
    out.push(choice);
    seen.push({ format: choice.format });
  }
  return out;
}

/* Which format goes in which of the day's slots: the order in which each format has met its slot
   least often so far (from the ledger's post_at hours), ties broken by rotating with the day. So
   every format meets every slot, and the weekly review can compare formats and times separately. */
export function assignSlots(formats, slotTimes, day, ledger = []) {
  if (!slotTimes.length) return formats.map((f) => ({ ...f, post_at: null }));
  const met = (format, t) => ledger.filter((r) => r.format === format && r.post_at && new Date(r.post_at).getUTCHours() === new Date(t).getUTCHours()).length;
  const perms = (xs) => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])));
  const order = slotTimes.map((_, i) => i);
  let best = null;
  perms(order).forEach((perm, k) => {
    const cost = formats.reduce((sum, f, i) => sum + met(f.format, slotTimes[perm[i]]), 0);
    const tie = (k + day) % Math.max(1, perms(order).length);
    if (!best || cost < best.cost || (cost === best.cost && tie < best.tie)) best = { perm, cost, tie };
  });
  return formats.map((f, i) => ({ ...f, post_at: slotTimes[best.perm[i % best.perm.length]] }));
}

async function main() {
  const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
  const date = arg('date') || new Date().toISOString().slice(0, 10);
  // The scheduled render asks first: has anything been rendered for this date already?
  if (process.argv.includes('--check-done')) {
    const done = readLedger().some((r) => r.date === date);
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `done=${done}\n`);
    console.log(done ? `already rendered for ${date}` : `nothing rendered for ${date} yet`);
    return;
  }
  const days = fs.readdirSync(path.join(ROOT, 'data')).filter((f) => /^\d+\.json$/.test(f)).map((f) => Number(f.slice(0, -5)));
  const day = Number(arg('day')) || Math.max(...days);
  const strategy = readJson(path.join(ROOT, 'strategy', 'strategy.json'));
  const ledger = readLedger();

  const pickFile = path.join(ROOT, 'picks', `${date}.json`);
  const pick = fs.existsSync(pickFile) ? readJson(pickFile) : null;
  if (pick && pick.day && pick.day !== day) console.error(`  the pick is for day ${pick.day}, data is day ${day}: using the pick's day`);
  const useDay = pick?.day || day;
  const data = readJson(path.join(ROOT, 'data', `${useDay}.json`));

  /* What to render: a forced format alone (posted by hand, no slot), else the pick first and the
     strategy's choices for the rest of the day's slots. */
  let plan;
  if (arg('format')) {
    plan = [{ format: arg('format'), explore: false, source: 'forced', copy: {}, post_at: null }];
  } else {
    const perDay = Math.max(1, Number(strategy.per_day) || 1);
    const slots = Array.isArray(strategy.slots_utc) && strategy.slots_utc.length ? strategy.slots_utc : [8, 19, 1];
    /* A format already rendered for this date is not made again: one video per format per date. */
    const already = ledger.filter((r) => r.date === date).map((r) => r.format);
    const can = (await eligible(data)).filter((f) => !already.includes(f));
    const first = pick?.format ? [{ format: pick.format, explore: !!pick.explore, source: 'pick', copy: pick.copy || {} }] : [];
    const rest = chooseFormats({ strategy, ledger: [...ledger, ...first], can: can.filter((f) => !first.some((p) => p.format === f)), day: useDay, n: perDay - first.length })
      .map((c) => ({ ...c, source: 'strategy', copy: {} }));
    plan = assignSlots([...first, ...rest], planSlots(date, useDay, perDay, slots), useDay, ledger);
    if (!plan.length) throw new Error('no format can be made from this day');
  }

  const recent = ledger.slice(-20).map((x) => x.title).filter(Boolean);
  const results = [];
  for (const p of plan) {
    /* Never overwrite a video that is already out: its ledger row holds the post. */
    const existing = ledger.find((r) => r.id === `${date}-${p.format.charAt(0)}`);
    if (existing && existing.posts && Object.keys(existing.posts).length && !process.argv.includes('--again')) {
      results.push({ ok: false, format: p.format, error: `${existing.id} is already posted; --again to re-render it anyway` });
      continue;
    }
    try {
      const r = await render({ format: p.format, day: useDay, pick: { format: p.format, day: useDay, copy: p.copy } });
      // Title, description, pinned question: from the day's content, never too close to the last 20 titles
      const meta = metadata(p.format, r.values, { recent, copy: p.copy });
      recent.push(meta.title);
      const metaFile = r.file.replace(/\.mp4$/, '.meta.json');
      fs.writeFileSync(path.join(ROOT, metaFile), `${JSON.stringify(meta, null, 2)}\n`);
      const row = {
        id: `${date}-${p.format.charAt(0)}`,
        date,
        format: p.format,
        game: GAME[p.format],
        day: useDay,
        source: p.source,
        data: Object.fromEntries(Object.entries(r.values).filter(([k, v]) => !LONG.has(k) && (typeof v === 'number' || (typeof v === 'string' && v.length <= 140)))),
        hook: r.values.hook || r.values.label || r.values.question || null,
        title: meta.title,
        variety: { theme: r.values.theme, party: r.values.party, react: r.values.react, music: r.values.music },
        explore: p.explore,
        length_s: r.duration,
        post_at: p.post_at,
        status: 'rendered',
        file: path.basename(r.file),
        posts: {},
        metrics: {},
      };
      writeLedgerRow(row);
      results.push({ ok: true, id: row.id, format: p.format, post_at: p.post_at, file: r.file, sheet: r.sheet, meta: metaFile, duration: r.duration, warnings: [...(r.warnings || []), meta.titleWarning].filter(Boolean) });
    } catch (err) {
      /* One failed render never costs the day its other videos. */
      results.push({ ok: false, format: p.format, error: err.message });
    }
  }
  const made = results.filter((x) => x.ok);
  // One line per video for the workflow: id, video, contact sheet, metadata
  fs.writeFileSync(path.join(ROOT, 'renders', 'manifest.tsv'), made.map((x) => [x.id, x.file, x.sheet, x.meta].map((s) => String(s).replace(/\\/g, '/')).join('\t')).join('\n') + (made.length ? '\n' : ''));
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `count=${made.length}\nday=${useDay}\n`);
  console.log(JSON.stringify({ ok: made.length > 0, day: useDay, results }));
  if (!made.length) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => { console.log(JSON.stringify({ ok: false, error: err.message })); process.exit(1); });
}
