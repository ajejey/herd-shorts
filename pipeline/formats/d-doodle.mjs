/*
  D-doodle, "Guess the drawing": the viewer plays first. The doodle draws a
  line at a time; lines 2 and 3 get a beat each (the challenge is "before line
  3"), the rest sketch in fast; a herd meter shows how many players had it by
  each line; a 3-2-1 final answer; the reveal; how the herd did; then it
  rewinds to the first frame so the video loops. Follows strategy/PRINCIPLES.md.
  Doodles are from Quick, Draw! by Google (CC BY 4.0): the credit is on screen.
*/
import { labelOfDay, num, need } from '../lib.mjs';

const MIN_PLAYERS = 40;
export const T = { line2: 1.4, line3: 2.8, restFrom: 3.9, restTo: 6.2, count: 6.6, reveal: 9.9, sting: 11.1, cta: 12.9, url: 13.1, rewind: 14.6, end: 15.4 };

const cap = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);

/* When each line from the second on starts drawing. */
export function lineTimes(lines) {
  if (lines < 2) return [];
  const t = [T.line2];
  if (lines >= 3) t.push(T.line3);
  const rest = lines - 3;
  for (let i = 0; i < rest; i++) t.push(rest === 1 ? T.restFrom : T.restFrom + (i * (T.restTo - T.restFrom)) / (rest - 1));
  return t;
}

/* A pencil sound for lines 2 and 3, then at most one every 0.5 s while the rest sketch in. */
export function scribbleTimes(lines) {
  const out = [];
  for (const t of lineTimes(lines)) if (!out.length || t - out[out.length - 1] >= 0.5) out.push(t);
  return out;
}

export function sting(d) {
  const first = d.gotByLine[0] || 0;
  if (first === 0) return 'Nobody got it from line 1';
  return first / d.players <= 0.15
    ? `Only ${num(first)} of ${num(d.players)} got it from line 1`
    : `${num(first)} of ${num(d.players)} got it from line 1`;
}

export function vars(data, pick = {}) {
  const d = data.doodle;
  need(d, 'no doodle that day (Guess the Doodle launched on day 162)');
  need(d.players >= MIN_PLAYERS, `only ${d.players} players`);
  need(Array.isArray(d.strokes) && d.strokes.length === d.lines && d.lines >= 3, 'the doodle needs at least 3 lines');
  need(Array.isArray(d.gotByLine) && d.gotByLine.length === d.lines, 'got-by-line counts do not match the lines');
  const copy = pick.copy || {};
  const word = d.answer || d.key;
  return {
    date: labelOfDay(data.day),
    tag: 'Guess the doodle',
    hook: copy.hook || 'Can you guess it before line 3?',
    mid: copy.mid || 'Got it yet?',
    final: copy.final || 'Final answer?',
    lines: d.lines,
    strokes: d.strokes.map((s) => s.join(',')).join('|'),
    gotByLine: d.gotByLine.join(','),
    players: d.players,
    lineTimes: lineTimes(d.lines).map((t) => t.toFixed(3)).join(','),
    scribbleTimes: scribbleTimes(d.lines).map((t) => t.toFixed(3)).join(','),
    answer: cap(word),
    sting: copy.sting || sting(d),
    cta: copy.cta || 'When did you get it? Comment the line',
    url: 'herdgamesonline.com',
    credit: d.credit || 'Doodles from Quick, Draw! by Google, CC BY 4.0',
  };
}
