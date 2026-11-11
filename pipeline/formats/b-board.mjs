/* B-board: the Top Answers board flips from the last answer up to #1. */
import { labelOfDay, num, need } from '../lib.mjs';

export function vars(data, pick = {}) {
  const ta = data.topAnswers;
  need(ta, 'no Top Answers board that day');
  const tiles = ta.tiles || [];
  need(tiles.length >= 5, `only ${tiles.length} answers on the board (5 needed)`);
  const copy = pick.copy || {};
  const v = {
    date: labelOfDay(data.day),
    question: ta.question,
    hook: copy.hook || `${num(ta.answers)} people answered. Can you name #1?`,
    hold: copy.hold || 'And the #1 answer…',
    count1: tiles[0].count,
    total: ta.answers,
    gag: copy.gag ?? 'Did you get it?',
    endHead: copy.endHead || 'Play today’s board',
    endGame: 'Top Answers · a new board every day',
  };
  for (let i = 0; i < 8; i++) {
    v[`ans${i + 1}`] = tiles[i] ? String(tiles[i].shown) : '';
    v[`pct${i + 1}`] = tiles[i] ? tiles[i].pct : 0;
  }
  return v;
}
