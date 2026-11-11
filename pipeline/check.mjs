#!/usr/bin/env node
/*
  The pipeline's own checks: no browser, no network, a few seconds.

    node pipeline/check.mjs

  For every format and every day in data/: the format either makes values or
  says plainly why it can't (never throws anything else), and the values match
  what its template declares (all there, none extra, right types). Then the
  numbers that are easy to get wrong: A's scale and ticks, C's verdict and
  swing, D/E/F/G's timing lists against the sounds that follow them, and the
  builder's data-if / data-each handling. Every template carries the current
  shared helper.
*/
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, FORMATS, readJson, NotEligible, sensitiveHits, engagementAsks } from './lib.mjs';
import { declaredVariables, checkValues, build } from './build.mjs';
import { staleIn } from './sync-shared.mjs';

let failures = 0;
const is = (msg, cond, detail = '') => {
  if (cond) console.log(`  ok    ${msg}`);
  else { failures += 1; console.log(`  FAIL  ${msg}${detail ? ` — ${detail}` : ''}`); }
};
const fmt = async (dir) => import(pathToFileURL(path.join(ROOT, 'pipeline', 'formats', `${dir}.mjs`)).href);

const days = fs.readdirSync(path.join(ROOT, 'data')).filter((f) => /^\d+\.json$/.test(f)).map((f) => Number(f.slice(0, -5))).sort((a, b) => a - b);
is(`there is data to check (${days.join(', ')})`, days.length > 0);

/* ── Every format × every day ─────────────────────────────────────────────── */
const shared = fs.readFileSync(path.join(ROOT, 'templates', '_shared', 'herd.js'), 'utf8');
for (const [format, dir] of Object.entries(FORMATS)) {
  const tpl = path.join(ROOT, 'templates', dir, 'index.html');
  if (!fs.existsSync(tpl)) { is(`${format}: has a template`, false); continue; }
  const decl = declaredVariables(fs.readFileSync(tpl, 'utf8'));
  is(`${format}: template carries the current shared helper`, fs.readFileSync(path.join(ROOT, 'templates', dir, 'assets', 'herd.js'), 'utf8') === shared);
  const stale = staleIn(path.join(ROOT, 'templates', dir));
  is(`${format}: template's shared sounds and music are current (node pipeline/sync-shared.mjs)`, stale.length === 0, stale.slice(0, 5).join(', '));
  // Every sound or music file the template plays exists
  const html = fs.readFileSync(tpl, 'utf8');
  const missing = [...html.matchAll(/(?:src|data-rotate)="([^"]+\.mp3[^"]*)"/g)].flatMap((m) => m[1].split('|')).filter((f) => !fs.existsSync(path.join(ROOT, 'templates', dir, f)));
  is(`${format}: every sound it plays is there`, missing.length === 0, missing.join(', '));
  is(`${format}: the template's own defaults pass its contract`, checkValues(decl, Object.fromEntries(decl.map((d) => [d.id, d.default]))).length === 0);
  const { vars } = await fmt(dir);
  let made = 0;
  for (const day of days) {
    try {
      const values = vars(readJson(path.join(ROOT, 'data', `${day}.json`)), {});
      const problems = checkValues(decl, values);
      is(`${format} day ${day}: values match the template`, problems.length === 0, problems.join('; '));
      const asks = engagementAsks(values);
      is(`${format} day ${day}: no explicit ask for comments/shares/tags on screen`, asks.length === 0, asks.join('; '));
      made += 1;
    } catch (err) {
      is(`${format} day ${day}: ${err instanceof NotEligible ? `not eligible (${err.message})` : 'threw'}`, err instanceof NotEligible, err.message);
    }
  }
  is(`${format}: made from at least one day`, made > 0);
}

/* ── A: scale, views, ticks ──────────────────────────────────────────────── */
const A = await fmt('a-herd-line');
const q = (o) => ({ unit: 'things', median: 100, answer: 100, players: 100, exact: 0, close: 0, closeRule: 'within 10%', ...o });
{
  const g = Array.from({ length: 200 }, (_, i) => 10 ** (i / 40));   // 1 .. 1e5, spread over 5 decades
  const s = A.scaleFor(q({ median: 300, answer: 1.6e7 }), g);
  is('A: guesses over 5 decades get a log scale', s.log);
  is('A: an answer far past the herd gets the camera pull, landing inside the reveal view', s.pull && s.view2[1] > 1.6e7 && s.view1[1] < 1.6e7);
  const y = A.scaleFor(q({ unit: 'year', median: 1900, answer: 1886 }), Array.from({ length: 100 }, (_, i) => 1800 + i * 2));
  is('A: years are always linear', !y.log);
  const p = A.scaleFor(q({ unit: 'percent', median: 20, answer: 25 }), [1, 5, 10, 20, 30, 40, 60, 90, 99, 292802]);
  is('A: percentages stay inside 0-100', !p.log && p.view1[0] >= 0 && p.view2[1] <= 100);
  const inside = A.scaleFor(q({ median: 50, answer: 52 }), Array.from({ length: 100 }, (_, i) => 30 + i * 0.5));
  is('A: an answer inside the herd: no pull', !inside.pull);
  const t = A.ticksFor([2.7, 2.2e5], true, 'colors').split(';');
  is('A: log ticks are decades, 2 to 6 of them', t.length >= 2 && t.length <= 6 && t.every((x) => /^1(0*):/.test(x)), t.join(' '));
  const lin = A.ticksFor([0.96, 45], false, 'percent').split(';');
  is('A: a linear view gets at least 3 ticks', lin.length >= 3, lin.join(' '));
  is('A: say() keeps an exact answer exact under a billion', A.say(16777216, 'colors') === '16.8 million' || A.answerParts({ unit: 'colors', answer: 16777216 }).big === '16,777,216');
  is('A: the answer shown in full digits (16,777,216)', A.answerParts({ unit: 'colors', answer: 16777216 }).big === '16,777,216');
  is('A: billions in words', A.answerParts({ unit: 'years', answer: 5e9 }).big === '5' && A.answerParts({ unit: 'years', answer: 5e9 }).unit === 'billion years');
  const d161 = readJson(path.join(ROOT, 'data', '161.json'));
  if (d161.guesstimate?.find((x) => x.id === 394)) {
    const v = A.vars(d161, { question: 394 });
    is('A: an exact guess survives into the sheep list (no rounding)', v.guesses.split(',').map(Number).includes(v.answer));
  }
}

/* ── C: the take and the swing ───────────────────────────────────────────── */
const C = await fmt('c-dial');
{
  const tk = (a, b) => ({ id: `${a}-${b}`, prompt: 'x?', a: 'A', b: 'B', counts: [a, b], players: a + b });
  is('C: a near tie is chosen over a landslide', C.chooseTake([tk(500, 120), tk(330, 340)]).id === '330-340');
  is('C: no near tie: the most lopsided', C.chooseTake([tk(400, 300), tk(85, 537)]).id === '85-537');
  is('C: verdicts follow the gap', C.verdict(tk(343, 332)) === 'Split almost in half.' && C.verdict(tk(85, 537)) === 'Not even close.');
  is('C: takes under 100 votes are never shown', C.chooseTake([tk(40, 30)]) === null);
  // The option labels never run under the sheep hub (hyperframes check can't see it: the hub is a picture, not text).
  // Showcase, 11 Nov 2026: "Up at the first alarm" ran under it.
  const css = fs.readFileSync(path.join(ROOT, 'templates', 'c-dial', 'compositions', 'dial.html'), 'utf8');
  const sides = css.match(/#c-sides \{[^}]*left: (\d+)px;[^}]*width: (\d+)px;[^}]*column-gap: (\d+)px;/);
  const hub = css.match(/#c-hub \{[^}]*left: (\d+)px;[^}]*width: (\d+)px;/);
  if (sides && hub) {
    const [l, w, g] = sides.slice(1).map(Number), [hl, hw] = hub.slice(1).map(Number);
    const col = (w - g) / 2;
    is(`C: label columns (${l}-${l + col}, ${l + col + g}-${l + w}) clear the hub (${hl}-${hl + hw})`, l + col <= hl && l + col + g >= hl + hw);
  } else is('C: label columns and hub found in dial.html', false);
  // The needle's widest swing (0.62 of the amplitude) never passes the dial's end
  for (const p of [0.5, 0.86, 0.99]) {
    const FINAL = -(2 * p - 1) * 90, AMP = Math.min(75, (88 - Math.abs(FINAL)) / 0.62);
    let worst = 0;
    for (let t = 0; t <= 7.6; t += 0.01) worst = Math.max(worst, Math.abs(FINAL + AMP * Math.exp(-0.6 * t) * Math.cos(2.4 * t + 0.9)));
    is(`C: at a ${Math.round(p * 100)}% split the needle stays on the dial (max ${worst.toFixed(1)}°)`, worst <= 90);
  }
}

/* ── D-G: the timing lists the sounds follow ─────────────────────────────── */
const D = await fmt('d-doodle');
for (const n of [3, 5, 7, 10, 16]) {
  const t = D.lineTimes(n), s = D.scribbleTimes(n);
  // Lines 2 and 3 get a beat each (the challenge is "before line 3"); all lines are down before the countdown
  is(`D: ${n} lines → ${n - 1} draws: line 2 at ${D.T.line2} s, line 3 at ${D.T.line3} s, all before the countdown (${D.T.count} s), in order`,
    t.length === n - 1 && t[0] === D.T.line2 && t[1] === D.T.line3 && t[t.length - 1] < D.T.count - 0.3 && t.every((x, i) => !i || x > t[i - 1]));
  is(`D: ${n} lines → pencil sounds never closer than 0.5 s (${s.length})`, s.every((x, i) => !i || x - s[i - 1] >= 0.5 - 1e-9) && s[0] === D.T.line2);
}
const E = await fmt('e-word-climb');
is('E: 7 rungs fill from 1.3 s to 8.2 s', (() => { const t = E.rungTimes(7); return t.length === 7 && t[0] === 1.3 && Math.abs(t[6] - 8.2) < 1e-9; })());

/* ── The builder ─────────────────────────────────────────────────────────── */
{
  const d = days[days.length - 1];
  try {
    const r = await build({ format: 'D-doodle', day: d, out: path.join(ROOT, 'out', '_check-d') });
    const html = fs.readFileSync(path.join(r.dir, 'index.html'), 'utf8');
    const want = String(r.values.scribbleTimes).split(',').filter(Boolean).length;
    const tags = html.match(/<audio id="snd-pencil-\d+"[^>]*>/g) || [];
    is(`builder: data-each made one pencil sound per scribble time (${tags.length}/${want})`, tags.length === want && !html.includes('data-each=') && !html.includes('data-rotate='));
    const srcs = tags.map((t) => (t.match(/src="([^"]+)"/) || [])[1]);
    is('builder: data-rotate takes turns (no two pencil sounds in a row are the same take)', srcs.every((x, i) => !i || x !== srcs[i - 1]), srcs.join(' '));
    is('builder: the day\'s values are written in as defaults', html.includes(JSON.stringify(r.values.answer)));
    fs.rmSync(r.dir, { recursive: true, force: true });
  } catch (err) {
    is('builder: D-doodle builds for the latest day', err instanceof NotEligible, err.message);
  }
  for (const day of days) {
    try {
      const r = await build({ format: 'B-board', day, out: path.join(ROOT, 'out', '_check-b') });
      const html = fs.readFileSync(path.join(r.dir, 'index.html'), 'utf8');
      const tiles = [1, 2, 3, 4, 5, 6, 7, 8].filter((i) => r.values[`ans${i}`]).length;
      is(`builder: day ${day} board of ${tiles} keeps flip sounds only for its answers`, html.includes('id="snd-flip8"') === tiles >= 8 && html.includes('id="snd-flip7"') === tiles >= 7);
      fs.rmSync(r.dir, { recursive: true, force: true });
    } catch (err) {
      is(`builder: B-board day ${day}`, err instanceof NotEligible, err.message);
    }
  }
}

/* ── Engagement bait: the asks Instagram won't recommend ─────────────────── */
{
  is('asks: "Comment the line" is caught', engagementAsks({ cta: 'When did you get it? Comment the line' }).length === 1);
  is('asks: "Send this to someone" is caught', engagementAsks({ x: 'Send this to someone who would get it wrong' }).length === 1);
  is('asks: a real question passes ("When did you get it?", "Which side are you on?")', engagementAsks({ a: 'When did you get it?', b: 'Which side are you on?', c: 'Play today’s doodle free' }).length === 0);
}

/* ── Brand safety: the words the unattended fallback must not put on screen ── */
{
  is('sensitive: a Word Climb rung "racism" is caught', sensitiveHits({ rungs: 'burn:124|usage:83|racism:64' }).length === 1);
  is('sensitive: a Top Answers tile "Sex" is caught', sensitiveHits({ ans2: 'Sex' }).length === 1);
  is('sensitive: ordinary words pass (snacks, Weather, Sussex, classic, hello, skill)', sensitiveHits({ a: 'Snacks', b: 'Weather', c: 'Sussex', d: 'classic', e: 'hello', f: 'skill' }).length === 0);
  is('sensitive: the doodle credit and timing lists are not read', sensitiveHits({ credit: 'Doodles from Quick, Draw! by Google', lineTimes: '1.4,2.4' }).length === 0);
  is('sensitive: the fallback list skips a format with a hit', await (async () => {
    const { eligible } = await import(pathToFileURL(path.join(ROOT, 'pipeline', 'daily.mjs')).href);
    const d = readJson(path.join(ROOT, 'data', '161.json'));
    return d.wordClimb ? !(await eligible(d)).includes('E-word-climb') : true;
  })());
}

/* ── The fallback choice (no pick that day) ──────────────────────────────── */
{
  const { chooseFormat } = await import(pathToFileURL(path.join(ROOT, 'pipeline', 'daily.mjs')).href);
  const strategy = readJson(path.join(ROOT, 'strategy', 'strategy.json'));
  const can = Object.keys(strategy.formats);
  const ledger = [], seq = [];
  for (let day = 200; day < 260; day++) { const c = chooseFormat({ strategy, ledger, can, day }); seq.push(c); ledger.push({ format: c.format }); }
  is('fallback: never the same format two days running', seq.every((c, i) => !i || c.format !== seq[i - 1].format));
  is('fallback: a rerun of a day chooses the same', chooseFormat({ strategy, ledger: [], can, day: 222 }).format === chooseFormat({ strategy, ledger: [], can, day: 222 }).format);
  const ex = seq.filter((c) => c.explore).length / seq.length;
  is(`fallback: explore picks near explore_share (${Math.round(ex * 100)}% vs ${Math.round(strategy.explore_share * 100)}%)`, Math.abs(ex - strategy.explore_share) < 0.15);
  is('fallback: a format the day cannot make is never chosen', chooseFormat({ strategy, ledger: [], can: ['C-dial'], day: 1 }).format === 'C-dial');
  const paused = { ...strategy, formats: Object.fromEntries(Object.entries(strategy.formats).map(([f, s]) => [f, { ...s, status: f === 'B-board' ? 'testing' : 'paused' }])) };
  is('fallback: paused formats are skipped', chooseFormat({ strategy: paused, ledger: [], can, day: 5 }).format === 'B-board');
}

console.log(failures ? `\n${failures} FAILED\n` : '\nevery format makes a valid video from every day it can, and says why when it can\'t\n');
process.exit(failures ? 1 : 0);
