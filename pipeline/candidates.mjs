#!/usr/bin/env node
/*
  Every format's story for one finished day, side by side: what the pick
  chooses between.

    node pipeline/candidates.mjs [--day=162]

  For each format: can it be made, the item it would show by default (and the
  other items it could show), the numbers its story rests on, and the default
  copy. Claude reads this, the ledger and the strategy, then writes the pick.
*/
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, FORMATS, readJson, NotEligible, num, sensitiveHits } from './lib.mjs';

const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
const days = fs.readdirSync(path.join(ROOT, 'data')).filter((f) => /^\d+\.json$/.test(f)).map((f) => Number(f.slice(0, -5)));
const day = Number(arg('day')) || Math.max(...days);
const data = readJson(path.join(ROOT, 'data', `${day}.json`));
const strategy = readJson(path.join(ROOT, 'strategy', 'strategy.json'));

/* The numbers each story rests on, and the other items a pick could choose. */
const ANGLES = {
  'A-herd-line': (d, A) => (d.guesstimate || []).map((q) => `  question ${q.id}: "${q.question}" · ${q.players} players · median ${q.median} vs answer ${q.answer} ${q.unit} · miss ${A.missOf(q).toFixed(2)} · exact ${q.exact}, close ${q.close}`),
  'B-board': (d) => (d.topAnswers ? [`  "${d.topAnswers.question}" · ${num(d.topAnswers.answers)} answers · ${d.topAnswers.tiles.map((t) => `${t.shown} ${t.pct}%`).join(', ')}`] : []),
  'C-dial': (d, C) => (d.hotTakes || []).map((t) => `  take "${t.id}": "${t.prompt}" ${t.a} ${t.counts[0]} / ${t.b} ${t.counts[1]} · gap ${Math.round(C.gap(t))} pts`),
  'D-doodle': (d) => (d.doodle ? [`  "${d.doodle.answer}" · ${d.doodle.lines} lines · ${d.doodle.players} players · got it by line: ${d.doodle.gotByLine.join(', ')}`] : []),
  'E-word-climb': (d) => (d.wordClimb ? [`  ${d.wordClimb.rungs.map((r) => `${r.word} ${r.solved}`).join(' → ')} · ${d.wordClimb.climbedAll}/${d.wordClimb.players} climbed all`] : []),
  'F-secret-word': (d) => (d.secretWord ? [`  "${d.secretWord.word}" · ${d.secretWord.found}/${d.secretWord.players} found · median ${d.secretWord.medianGuesses} guesses · first: ${d.secretWord.firstGuesses.map((x) => x.value).join(', ')} · close: ${d.secretWord.closeCalls.map((x) => x.value).join(', ')}`] : []),
  'G-words-from': (d) => (d.wordsFrom ? [`  "${d.wordsFrom.word}" · ${d.wordsFrom.hidden} hidden · ${d.wordsFrom.players} players · most found: ${d.wordsFrom.mostFound.map((w) => `${w.word} ${w.count}`).join(', ')}`] : []),
};
const SKIP = new Set(['guesses', 'strokes', 'ticks1', 'ticks2', 'lineTimes', 'rungTimes', 'chipTimes', 'wordTimes', 'gotByLine', 'rungs', 'endGame', 'credit']);

console.log(`Day ${day} candidates (strategy updated ${strategy.updated})\n`);
for (const [format, dir] of Object.entries(FORMATS)) {
  const s = strategy.formats[format] || {};
  const mod = await import(pathToFileURL(path.join(ROOT, 'pipeline', 'formats', `${dir}.mjs`)).href);
  console.log(`${format}  [${s.status || 'no strategy entry'}, weight ${s.weight ?? '-'}]${s.note ? `\n  note: ${s.note}` : ''}`);
  for (const line of (ANGLES[format] || (() => []))(data, mod)) console.log(line);
  try {
    const v = mod.vars(data, {});
    const copy = Object.entries(v).filter(([k, x]) => !SKIP.has(k) && typeof x === 'string' && x.length > 12).map(([k, x]) => `${k}: ${x}`);
    console.log(`  default copy → ${copy.join(' | ')}`);
    const hits = sensitiveHits(v);
    if (hits.length) console.log(`  ⚠ SENSITIVE: ${hits.join(', ')} (the fallback will not choose this; a pick may, with care)`);
  } catch (err) {
    console.log(`  CAN'T MAKE: ${err instanceof NotEligible ? err.message : `error: ${err.message}`}`);
  }
  console.log('');
}
