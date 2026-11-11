/*
  D-doodle: the day's Guess the Doodle draws itself line by line, as players saw
  it, with how many of the herd had it by each line; then the answer.
  Doodles are from Quick, Draw! by Google (CC BY 4.0): the credit is on screen.
*/
import { labelOfDay, num, need } from '../lib.mjs';

const MIN_PLAYERS = 40;
const FIRST = 1.4, LAST = 9.4;   // line 2 starts at FIRST, the last line at LAST (seconds)

const cap = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);
const article = (w) => (/^[aeiou]/i.test(w) ? 'an' : 'a');

/* When each line from the second on starts drawing: evenly spread over FIRST..LAST. */
export function lineTimes(lines) {
  if (lines < 2) return [];
  const slot = (LAST - FIRST) / Math.max(1, lines - 2);
  return Array.from({ length: lines - 1 }, (_, i) => (lines === 2 ? FIRST : FIRST + i * slot));
}

export function stat(d) {
  const first = d.gotByLine[0] || 0;
  if (first === 0) return `Nobody got it from line 1`;
  if (first / d.players < 0.15) return `Only ${num(first)} of ${num(d.players)} got it from line 1`;
  return `${num(first)} of ${num(d.players)} got it from line 1`;
}

export function vars(data, pick = {}) {
  const d = data.doodle;
  need(d, 'no doodle that day (Guess the Doodle launched on day 162)');
  need(d.players >= MIN_PLAYERS, `only ${d.players} players`);
  need(Array.isArray(d.strokes) && d.strokes.length === d.lines && d.lines >= 2, 'the doodle has no lines to draw');
  need(Array.isArray(d.gotByLine) && d.gotByLine.length === d.lines, 'got-by-line counts do not match the lines');
  const copy = pick.copy || {};
  const word = d.answer || d.key;
  return {
    date: labelOfDay(data.day),
    hook: copy.hook || 'Can you guess it from one line?',
    lines: d.lines,
    strokes: d.strokes.map((s) => s.join(',')).join('|'),
    gotByLine: d.gotByLine.join(','),
    players: d.players,
    lineTimes: lineTimes(d.lines).map((t) => t.toFixed(3)).join(','),
    hold: `It’s ${article(word)}…`,
    answer: cap(word),
    stat: copy.stat || stat(d),
    cta: copy.cta || 'When did you get it? Comment the line.',
    credit: d.credit || 'Doodles from Quick, Draw! by Google, CC BY 4.0',
    endHead: copy.endHead || 'Guess today’s doodle',
    endGame: 'Guess the Doodle · a new one every day',
  };
}
