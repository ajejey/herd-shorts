/* G-words-from: words fall out of the big word, each with how many of the herd found it. */
import { labelOfDay, num, need } from '../lib.mjs';

const MIN_PLAYERS = 40;

/* When each found word drops out of the big word (the template uses the same times). */
export const wordTimes = (n) => Array.from({ length: n }, (_, i) => 1.6 + i * 1.5);

export function vars(data, pick = {}) {
  const wf = data.wordsFrom;
  need(wf, 'no Words from a Word that day');
  need(wf.players >= MIN_PLAYERS, `only ${wf.players} players`);
  need(wf.word && wf.word.length <= 11, `the word "${wf.word}" does not fit the tiles`);
  const found = (wf.mostFound || []).filter((w) => w.word !== wf.word).slice(0, 4);
  need(found.length >= 3, 'fewer than 3 found words to show');
  const copy = pick.copy || {};
  const W = wf.word.toUpperCase();
  return {
    date: labelOfDay(data.day),
    hook: copy.hook || `How many words can you make from ${W}?`,
    word: wf.word,
    found: found.map((w) => `${w.word}:${w.count}`).join('|'),
    wordTimes: wordTimes(found.length).map((t) => t.toFixed(3)).join(','),
    players: wf.players,
    payoff: copy.payoff || `${num(wf.hidden)} words hide in ${W}`,
    stat: copy.stat || `${num(wf.foundBigWord)} of ${num(wf.players)} found ${W} itself`,
    cta: copy.cta || 'How many can you find?',
    endHead: copy.endHead || 'Play today’s word',
    endGame: 'Words from a Word · new every day',
  };
}
