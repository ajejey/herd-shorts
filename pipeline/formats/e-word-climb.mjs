/*
  E-word-climb, "Guess the word" (Word Climb): the herd's most popular first
  guesses on the ladder's first rung, coloured the way the game colours them,
  are the clues; the viewer guesses the word; then how far the herd climbed.
  Follows strategy/PRINCIPLES.md.
*/
import { labelOfDay, num, need } from '../lib.mjs';

const MIN_PLAYERS = 40;

/* The beat clock (seconds) */
export const T = { clues: 1.0, count: 4.2, herd: 7.3, hold: 8.3, reveal: 9.9, sting: 10.6, ask: 11.1, play: 13.2, rewind: 15.3, end: 16.1 };
export const SCENE = 'scene';

/* The game's colouring of a guess against the answer: g right spot, y wrong spot, x not in the word (repeats counted properly) */
export function colour(guess, answer) {
  const g = guess.toLowerCase(), a = answer.toLowerCase();
  const out = Array(g.length).fill('x');
  const left = {};
  for (let i = 0; i < a.length; i++) if (g[i] !== a[i]) left[a[i]] = (left[a[i]] || 0) + 1;
  for (let i = 0; i < g.length; i++) if (g[i] === a[i]) out[i] = 'g';
  for (let i = 0; i < g.length; i++) if (out[i] !== 'g' && left[g[i]]) { out[i] = 'y'; left[g[i]] -= 1; }
  return out.join('');
}

/* The clue rows: the rung's most popular openers that fit it (same length, letters only, not the answer itself) */
export function clueRows(rung) {
  return (rung.openers || [])
    .filter((o) => typeof o.value === 'string' && o.value.length === rung.word.length && /^[a-z]+$/i.test(o.value) && o.value.toLowerCase() !== rung.word.toLowerCase())
    .slice(0, 3)
    .map((o) => ({ guess: o.value.toUpperCase(), code: colour(o.value, rung.word), count: o.count }));
}

/* When each clue row flips in (one flip sound per row) */
export const rowTimes = (n) => Array.from({ length: n }, (_, i) => T.clues + 0.2 + i * 0.85);

/* Commentary: the ladder's hardest word */
export function insight(wc) {
  let k = -1, worst = 2;
  wc.rungs.forEach((r, i) => { const p = r.reached ? r.solved / r.reached : 1; if (p < worst) { worst = p; k = i; } });
  return k < 0 ? '' : `Word ${k + 1} was the hardest: ${Math.round(worst * 100)}% solved it`;
}

export function vars(data, pick = {}) {
  const wc = data.wordClimb;
  need(wc, 'no Word Climb that day');
  need(wc.players >= MIN_PLAYERS, `only ${wc.players} players`);
  need(wc.rungs && wc.rungs.length >= 5, 'not a full ladder');
  // The first rung (of the first three) whose clues give the viewer something: at least 2 coloured letters
  const usable = (r) => r && r.word && r.word.length <= 7 && clueRows(r).length >= 2;
  const informative = (r) => clueRows(r).reduce((a, row) => a + row.code.replace(/x/g, '').length, 0) >= 2;
  const rung = pick.rung ? wc.rungs[pick.rung - 1] : wc.rungs.slice(0, 3).find((r) => usable(r) && informative(r));
  need(rung && usable(rung), 'no early rung with enough first guesses to use as clues');
  need(informative(rung), 'the clues would show no coloured letters: nothing to guess from');
  const rows = clueRows(rung);
  const copy = pick.copy || {};
  const n = wc.rungs.length;
  return {
    date: labelOfDay(data.day),
    hook: copy.hook || `Guess the hidden ${rung.word.length}-letter word`,
    rows: rows.map((r) => `${r.guess}:${r.code}`).join('|'),
    rowTimes: rowTimes(rows.length).map((t) => t.toFixed(3)).join(','),
    word: rung.word.toUpperCase(),
    clues: copy.clues || 'The herd’s first guesses:',
    turn: copy.turn || 'Your guess?',
    hold: copy.hold || 'The word was…',
    players: wc.players,
    solved: rung.solved,
    reached: rung.reached,
    sting: copy.sting || (wc.climbedAll / wc.players < 0.3 ? `Only ${num(wc.climbedAll)} of ${num(wc.players)} solved all ${n} words` : `${num(wc.climbedAll)} of ${num(wc.players)} solved all ${n} words`),
    insight: copy.insight ?? insight(wc),
    ask: copy.ask || 'How far would you get?',
    play: copy.play || 'Play today’s Word Climb free',
    url: 'herdgamesonline.com',
  };
}
