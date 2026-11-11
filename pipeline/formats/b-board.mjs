/*
  B-board, "Guess the #1 answer" (Top Answers): the viewer names the #1 answer
  before the board flips from the last answer up; #1 lands last with the crowd.
  Follows strategy/PRINCIPLES.md.
*/
import { labelOfDay, num, need } from '../lib.mjs';

/* The beat clock (seconds) */
export const T = { count: 1.1, flips: 4.5, hold: 8.3, reveal: 9.9, sting: 10.6, ask: 11.1, play: 13.2, rewind: 15.3, end: 16.1 };
export const SCENE = 'scene';
const LAST_FLIP = 8.0;   // #2 flips by here

/* When each tile from the last up to #2 flips (#1 flips at the reveal) */
export const flipTimes = (n) => Array.from({ length: Math.max(0, n - 1) }, (_, i) => T.flips + (n > 2 ? (i * (LAST_FLIP - T.flips)) / (n - 2) : 0));

export function sting(ta) {
  const top = ta.tiles[0];
  const ans = String(top.shown).charAt(0).toUpperCase() + String(top.shown).slice(1);
  return top.pct < 15 ? `Only ${top.pct}% said ${ans}` : `${num(top.count)} of ${num(ta.answers)} people said ${ans}`;
}

export function vars(data, pick = {}) {
  const ta = data.topAnswers;
  need(ta, 'no Top Answers board that day');
  const tiles = ta.tiles || [];
  need(tiles.length >= 5, `only ${tiles.length} answers on the board (5 needed)`);
  const copy = pick.copy || {};
  const v = {
    date: labelOfDay(data.day),
    label: copy.label || 'Guess the #1 answer:',
    question: ta.question,
    turn: copy.turn || 'Lock in your answer',
    // Boards can come from an older Daily Herd day: never "yesterday" about the count
    herd: copy.herd || `Here's what ${num(ta.answers)} people said`,
    hold: copy.hold || 'And the #1 answer…',
    total: ta.answers,
    count1: tiles[0].count,
    sting: copy.sting || sting(ta),
    ask: copy.ask || 'Did you get it?',
    play: copy.play || 'Play today’s Top Answers free',
    url: 'herdgamesonline.com',
    flipTimes: flipTimes(Math.min(8, tiles.length)).map((t) => t.toFixed(3)).join(','),
  };
  for (let i = 0; i < 8; i++) {
    v[`ans${i + 1}`] = tiles[i] ? String(tiles[i].shown) : '';
    v[`pct${i + 1}`] = tiles[i] ? tiles[i].pct : 0;
  }
  return v;
}
