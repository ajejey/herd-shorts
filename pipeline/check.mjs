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
import { ROOT, FORMATS, readJson, NotEligible, sensitiveHits, engagementAsks, variety, THEMES, MUSIC } from './lib.mjs';
import { metadata, similarity, similarTo, TAGS } from './metadata.mjs';
import { declaredVariables, checkValues, build } from './build.mjs';
import { staleIn } from './sync-shared.mjs';
import { caption, redact, THUMB_OFFSET_MS } from './post-instagram.mjs';
import { youtubeCopy, shortId } from './youtube-kit.mjs';

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
      const values = { ...vars(readJson(path.join(ROOT, 'data', `${day}.json`)), {}), ...variety(format, day) };   // as build.mjs makes them
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
  is('C: verdicts follow the gap', C.verdict(tk(343, 332)) === 'Split almost in half!' && C.verdict(tk(85, 537)) === 'Not even close!');
  is('C: a near tie says how close, a landslide says who won', C.sting(tk(343, 332)) === 'Only 11 votes apart' && /^86% picked/.test(C.sting(tk(85, 537))));
  is('C: takes under 100 votes are never shown', C.chooseTake([tk(40, 30)]) === null);
  // The option labels never run under the sheep hub (hyperframes check can't see it: the hub is a picture, not text).
  // Showcase, 11 Nov 2026: "Up at the first alarm" ran under it.
  const css = fs.readFileSync(path.join(ROOT, 'templates', 'c-dial', 'compositions', 'scene.html'), 'utf8');
  const sides = css.match(/#c-sides \{[^}]*left: (\d+)px;[^}]*width: (\d+)px;[^}]*column-gap: (\d+)px;/);
  const hub = css.match(/#c-hub \{[^}]*left: (\d+)px;[^}]*width: (\d+)px;/);
  if (sides && hub) {
    const [l, w, g] = sides.slice(1).map(Number), [hl, hw] = hub.slice(1).map(Number);
    const col = (w - g) / 2;
    is(`C: label columns (${l}-${l + col}, ${l + col + g}-${l + w}) clear the hub (${hl}-${hl + hw})`, l + col <= hl && l + col + g >= hl + hw);
  } else is('C: label columns and hub found in scene.html', false);
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
// The clue colours must be the game's own: a wrong colour teaches the viewer a wrong word
is('E: colours follow the game (STAR vs FOAM: A right spot, the rest not in word)', E.colour('star', 'foam') === 'xxgx');
is('E: a repeated letter is yellow only as many times as the answer has it (SPEED vs ABIDE)', E.colour('speed', 'abide') === 'xxyxy');
is('E: right spot wins over wrong spot for the same letter (ALLEE vs EAGLE)', E.colour('allee', 'eagle') === 'yyxyg');
{
  // Clues that show no coloured letter give the viewer nothing: the format moves to a rung that does
  const d161 = readJson(path.join(ROOT, 'data', '161.json'));
  if (d161.wordClimb) {
    const v = E.vars(d161, {});
    const coloured = String(v.rows).split('|').reduce((a, r) => a + r.split(':')[1].replace(/x/g, '').length, 0);
    is(`E: the clues always give something to go on (day 161 uses ${v.word}, ${coloured} coloured letters)`, coloured >= 2);
  }
}
const F = await fmt('f-secret-word'), G = await fmt('g-words-from');
is('F: cold guesses land before the near misses', (() => { const t = F.chipTimes(3, 4); return t.length === 7 && t.every((x, i) => !i || x > t[i - 1]) && t[3] < F.T.count; })());
is('G: the herd\'s finds all land before the reveal', (() => { const t = G.wordTimes(4); return t.length === 4 && t[3] + 0.5 < G.T.reveal; })());

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
      const flips = (html.match(/<audio id="snd-flip-\d+"/g) || []).length;
      is(`builder: day ${day} board of ${tiles} gets one flip sound per tile it flips before #1 (${flips})`, flips === tiles - 1);
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
    // Day 161's Top Answers board shows "Sex" at 10%: the unattended fallback must not choose it
    return d.topAnswers ? !(await eligible(d)).includes('B-board') : true;
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

/* ── Variety: no format looks or sounds the same two days running (YouTube's "template with little variation") ── */
{
  for (const format of Object.keys(FORMATS)) {
    let same = 0;
    for (let d = 160; d < 220; d++) {
      const a = variety(format, d), b = variety(format, d + 1);
      if (a.theme === b.theme || a.party === b.party || a.react === b.react || a.music === b.music) same += 1;
    }
    is(`variety: ${format} never repeats its world, celebration, cow reaction or music on consecutive days`, same === 0, `${same} repeats`);
  }
  const missing = Object.values(MUSIC).flat().filter((m) => !fs.existsSync(path.join(ROOT, 'templates', '_shared', 'music', `${m}.mp3`)));
  is('variety: every music bed in every pool exists', missing.length === 0, missing.join(', '));
  const kitText = fs.readFileSync(path.join(ROOT, 'templates', '_shared', 'herd.js'), 'utf8');
  const noWorld = THEMES.filter((t) => !new RegExp(`\\b${t}: \\{ sky`).test(kitText));
  is('variety: the kit draws every world the rotation can pick', noWorld.length === 0, noWorld.join(', '));
  try {
    const r = await build({ format: 'D-doodle', day: 162, out: path.join(ROOT, 'out', '_check-music') });
    const html = fs.readFileSync(path.join(r.dir, 'index.html'), 'utf8');
    const srcs = [...html.matchAll(/<audio[^>]*data-music="1"[^>]*src="([^"]+)"/g)].map((m) => m[1]);
    is(`variety: the builder puts the day's music bed in every music clip (${r.values.music})`, srcs.length >= 3 && srcs.every((s) => s.endsWith(`/${r.values.music}.mp3`)), srcs.join(' '));
    fs.rmSync(r.dir, { recursive: true, force: true });
  } catch (err) { is('variety: D-doodle builds for the music check', false, err.message); }
}

/* ── Titles and descriptions: from the day's content, never a near-copy of a recent title, never asking ── */
{
  is('titles: the same title twice is refused', similarTo('Guess this doodle before line 3', ['Guess this doodle before line 3']) !== null);
  is('titles: two different questions pass', similarity('How many colors can a 24-bit display show?', 'Roughly how many square miles is Australia?') < 0.3);
  const recent = [];
  for (const [format, dir] of Object.entries(FORMATS)) {
    const m = await fmt(dir);
    for (const day of days) {
      let v;
      try { v = { ...m.vars(readJson(path.join(ROOT, 'data', `${day}.json`)), {}), ...variety(format, day) }; } catch (err) { continue; }
      try {
        const md = metadata(format, v, { recent });
        recent.push(md.title);
        const asks = engagementAsks({ title: md.title, description: md.description });
        is(`titles: ${format} day ${day} "${md.title}" (under 100 chars, no asks)`, md.title.length <= 100 && asks.length === 0, asks.join('; '));
        try { caption(md); youtubeCopy(md); is(`posting: ${format} day ${day} caption and YouTube copy within limits`, true); } catch (err) { is(`posting: ${format} day ${day} caption and YouTube copy within limits`, false, err.message); }
      } catch (err) { is(`titles: ${format} day ${day} makes a title`, false, err.message); }
    }
  }
  /* 12 Nov 2026: the daily run failed because Words from a Word had used every phrasing within the
     last 20 titles. A day is never lost to the guard: it takes the least similar and says so. */
  const g = { word: 'BREAKDOWN', reveal: '87 words were hiding!', sting: '40 of 300 spotted BREAKDOWN itself', insight: 'The herd found 210 different words' };
  const all = ['How many words can you find in BREAKDOWN?', '87 words were hiding in BREAKDOWN', 'BREAKDOWN: how many words can you make?', 'Find the words hiding inside BREAKDOWN', '40 of 300 spotted BREAKDOWN itself. Did you?', 'The herd found 210 different words in BREAKDOWN'];
  let md = null; let threw = false;
  try { md = metadata('G-words-from', g, { recent: all }); } catch { threw = true; }
  is('titles: every phrasing taken still gives a title, flagged, never a failed day', !threw && md && all.includes(md.title) && /least similar/.test(md.titleWarning || ''), threw ? 'threw' : JSON.stringify(md && { title: md.title, w: md.titleWarning }));
  md = metadata('G-words-from', g, { recent: [] });
  is('titles: a fresh day has no warning', md.titleWarning === null);
}

/* ── Posting ─────────────────────────────────────────────────────────────── */
{
  const meta = { title: 'Guess the #1 answer', description: "Most said pizza.\n\nPlay today's Top Answers free: herdgamesonline.com\n\n#quiz #trivia", pinned: 'What did you guess?', tags: ['#quiz', '#trivia'] };
  const c = caption(meta);
  is('posting: caption opens with the title and carries the question, the address and the hashtags', c.startsWith('Guess the #1 answer\n\nWhat did you guess?') && c.includes('herdgamesonline.com') && c.endsWith('#quiz #trivia'), c);
  const refuses = (f) => { try { f(); return false; } catch { return true; } };
  is('posting: a caption that asks for comments is refused', refuses(() => caption({ ...meta, pinned: 'Comment your guess below' })));
  is('posting: a caption over 2,200 characters is refused', refuses(() => caption({ ...meta, description: 'x'.repeat(2300) })));
  is('posting: more than 30 hashtags is refused', refuses(() => caption({ ...meta, description: Array.from({ length: 31 }, (_, i) => `#t${i}`).join(' ') })));
  is('posting: YouTube copy with < or > is refused', refuses(() => youtubeCopy({ ...meta, title: 'a <b> c' })));
  is('posting: a YouTube title over 100 characters is refused', refuses(() => youtubeCopy({ ...meta, title: 'x'.repeat(101) })));
  is('posting: YouTube tags lose their #', youtubeCopy(meta).tags.join() === 'quiz,trivia');
  is('posting: the cover frame is 1.5 s in (PRINCIPLES rule 2)', THUMB_OFFSET_MS === 1500);
  is('posting: a token never survives into an error', redact('bad token EAAB123 for EAAB123', 'EAAB123') === 'bad token [token] for [token]');
  const links = [['https://youtube.com/shorts/AbC_12-xyz', 'AbC_12-xyz'], ['https://www.youtube.com/watch?v=AbC12345', 'AbC12345'], ['https://youtu.be/AbC12345', 'AbC12345'], ['https://youtube.com.evil.example/shorts/AbC12345', null], ['not a url', null], ['https://youtube.com/shorts/', null]];
  for (const [u, want] of links) is(`posting: YouTube link ${u} reads as ${want}`, shortId(u) === want, String(shortId(u)));
  /* Another company's product as a hashtag is misleading metadata on YouTube (12 Nov 2026: #familyfeud, #wordle, #scrabble, #quickdraw were in these lists). */
  const BRANDS = /familyfeud|wordle|scrabble|quickdraw|pictionary|jeopardy|kahoot|boggle|codenames|wheeloffortune|spellingbee|connections/i;
  for (const [format, tags] of Object.entries(TAGS)) is(`posting: ${format} hashtags name no other company's game`, !tags.some((t) => BRANDS.test(t)), tags.filter((t) => BRANDS.test(t)).join(' '));
}

/* ── Scheduling: per_day videos a day, rotating slots, every format meeting every slot ── */
{
  const { planSlots, assignSlots, chooseFormats } = await import(pathToFileURL(path.join(ROOT, 'pipeline', 'daily.mjs')).href);
  const { dueRows, STALE_HOURS } = await import(pathToFileURL(path.join(ROOT, 'pipeline', 'post-due.mjs')).href);
  const strategy = readJson(path.join(ROOT, 'strategy', 'strategy.json'));
  const slots = strategy.slots_utc;
  is('schedule: strategy has per_day and three slots', strategy.per_day >= 1 && Array.isArray(slots) && slots.length === 3);
  const p = planSlots('2026-11-13', 165, 2, [8, 19, 1]);
  is('schedule: two slots, in time order, on the right dates', JSON.stringify(p) === JSON.stringify(['2026-11-13T08:00:00.000Z', '2026-11-13T19:00:00.000Z']), JSON.stringify(p));
  is('schedule: the 01:00 slot falls on the next calendar day', planSlots('2026-11-13', 163, 2, [8, 19, 1])[1] === '2026-11-14T01:00:00.000Z');
  const used = new Set();
  for (let d = 0; d < 3; d += 1) for (const t of planSlots('2026-11-13', d, 2, [8, 19, 1])) used.add(new Date(t).getUTCHours());
  is('schedule: over three days every slot is used', used.size === 3);
  const can = Object.keys(strategy.formats);
  const meets = {};
  const history = [];
  for (let d = 300; d < 340; d += 1) {
    const day = assignSlots(chooseFormats({ strategy, ledger: history, can, day: d, n: 2 }), planSlots('2026-11-13', d, 2, slots), d, history);
    for (const x of day) history.push({ format: x.format, post_at: x.post_at });
    is(`schedule: day ${d} has two different formats, each with a time`, day.length === 2 && day[0].format !== day[1].format && day.every((x) => x.post_at), JSON.stringify(day));
    for (const x of day) (meets[x.format] = meets[x.format] || new Set()).add(new Date(x.post_at).getUTCHours());
  }
  is('schedule: over 40 days every format meets every slot', Object.values(meets).every((s) => s.size === 3), JSON.stringify(Object.fromEntries(Object.entries(meets).map(([k, v]) => [k, [...v]]))));
  const now = Date.parse('2026-11-13T19:05:00Z');
  const rows = [
    { id: 'a', file: 'a.mp4', post_at: '2026-11-13T19:00:00.000Z', posts: {} },
    { id: 'b', file: 'b.mp4', post_at: '2026-11-14T01:00:00.000Z', posts: {} },
    { id: 'c', file: 'c.mp4', post_at: '2026-11-13T08:00:00.000Z', posts: { instagram: { id: '1' } } },
    { id: 'd', file: 'd.mp4', post_at: null, posts: {} },
    { id: 'e', file: 'e.mp4', post_at: new Date(now - (STALE_HOURS + 1) * 3600000).toISOString(), posts: {} },
    { id: 'f', file: 'f.mp4', post_at: '2026-11-13T08:00:00.000Z', posts: {} },
  ];
  is('schedule: due = time come, not posted, not stale, never a hand-posted render; oldest first', dueRows(rows, now).map((r) => r.id).join() === 'f,a', dueRows(rows, now).map((r) => r.id).join());
  /* YouTube: due from the moment it is rendered (uploaded scheduled for post_at), per platform. */
  const ytRows = [...rows, { id: 'g', file: 'g.mp4', post_at: '2026-11-13T08:00:00.000Z', posts: { youtube: { id: 'x' } } }];
  const ids = (list) => list.map((r) => r.id).join();
  is('schedule: YouTube due = rendered, not on YouTube, not stale, future ones too; oldest first', ids(dueRows(ytRows, now, 'youtube')) === 'c,f,a,b', ids(dueRows(ytRows, now, 'youtube')));
  is('schedule: a row on YouTube is still due on Instagram', ids(dueRows(ytRows, now, 'instagram')) === 'f,g,a', ids(dueRows(ytRows, now, 'instagram')));
  let unknown = false;
  try { dueRows(rows, now, 'tiktok'); } catch { unknown = true; }
  is('schedule: an unknown platform is refused', unknown);
}

/* ── YouTube automatic upload: scheduled for post_at, never twice, confirmed public ── */
{
  const { publishPlan, sameUpload, toConfirm, LEAD_MINUTES } = await import(pathToFileURL(path.join(ROOT, 'pipeline', 'post-youtube.mjs')).href);
  const now = Date.parse('2026-11-14T06:50:00Z');
  const later = publishPlan('2026-11-14T08:00:00.000Z', now);
  is('youtube: a video for later is uploaded private with publishAt = post_at', later.privacyStatus === 'private' && later.publishAt === '2026-11-14T08:00:00.000Z', JSON.stringify(later));
  is(`youtube: a video due within ${LEAD_MINUTES} minutes, or past, goes up public`, publishPlan(new Date(now + 5 * 60000).toISOString(), now).privacyStatus === 'public' && publishPlan('2026-11-14T01:00:00.000Z', now).privacyStatus === 'public' && !publishPlan(null, now).publishAt);
  const items = [
    { snippet: { title: 'Guess this doodle before line 3 ', publishedAt: '2026-11-14T06:45:00Z', resourceId: { videoId: 'NEW1' } } },
    { snippet: { title: 'Old title', publishedAt: '2026-11-01T06:45:00Z', resourceId: { videoId: 'OLD1' } } },
  ];
  is('youtube: the same title uploaded lately is found (no second upload)', sameUpload(items, 'Guess this doodle before line 3', now - 3 * 86400000) === 'NEW1');
  is('youtube: an old upload or another title is not a match', sameUpload(items, 'Old title', now - 3 * 86400000) === null && sameUpload(items, 'Something new', 0) === null);
  const hr = 3600000;
  const yt = (y) => ({ posts: { youtube: y } });
  const confirmRows = [
    yt({ id: 'a', by: 'api', publish_at: new Date(now - 2 * hr).toISOString() }),
    yt({ id: 'b', by: 'api', at: new Date(now - 2 * hr).toISOString() }),
    yt({ id: 'c', by: 'api', publish_at: new Date(now - 2 * hr).toISOString(), live: true }),
    yt({ id: 'd', by: 'hand', at: new Date(now - 2 * hr).toISOString() }),
    yt({ id: 'e', by: 'api', publish_at: new Date(now - 0.5 * hr).toISOString() }),
    yt({ id: 'f', by: 'api', publish_at: new Date(now + 5 * hr).toISOString() }),
    yt({ id: 'g', by: 'api', publish_at: new Date(now - 100 * hr).toISOString() }),
  ];
  const checked = toConfirm(confirmRows, now).map((r) => r.posts.youtube.id).join();
  is('youtube: --confirm checks API uploads an hour past their time, not yet seen public, under 3 days old', checked === 'a,b', checked);
  const dueYml = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'post-due.yml'), 'utf8');
  const dailyYml = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'daily.yml'), 'utf8');
  is('youtube: the hourly poster uploads only while AUTO_POST_YOUTUBE is on, and confirms', /AUTO_YT: \$\{\{ vars\.AUTO_POST_YOUTUBE \}\}/.test(dueYml) && /\[ "\$AUTO_YT" = on \] \|\| continue/.test(dueYml) && /post-youtube\.mjs --confirm/.test(dueYml));
  is('youtube: the hourly poster runs off the top of the hour (GitHub drops those runs)', /cron: '(1[0-9]|[2-4][0-9]) \* \* \* \*'/.test(dueYml));
  is('youtube: a render starts the poster straight away', /actions: write/.test(dailyYml) && /gh workflow run post-due\.yml/.test(dailyYml));
  /* The outside timer starts the render by workflow_dispatch: without the done check a second start would render two more videos for the same slots. */
  is('schedule: a render started with if_not_done skips a date already rendered', /if_not_done:[\s\S]*?type: boolean/.test(dailyYml) && /id: seen\n\s+if: github\.event_name == 'schedule' \|\| inputs\.if_not_done/.test(dailyYml));
}

console.log(failures ? `\n${failures} FAILED\n` : '\nevery format makes a valid video from every day it can, and says why when it can\'t\n');
process.exit(failures ? 1 : 0);
