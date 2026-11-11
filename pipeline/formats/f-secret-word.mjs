/* F-secret-word: where the herd started, how close it got, then the word. */
import { labelOfDay, num, need } from '../lib.mjs';

const MIN_PLAYERS = 40;
const list = (xs, n) => (xs || []).slice(0, n).map((x) => `${x.value}:${x.count}`).join('|');

/* When each chip pops in: first guesses from 1.7 s, close calls from 4.9 s, 0.4 s apart (the template uses the same times). */
export const chipTimes = (firsts, closes) => [
  ...Array.from({ length: firsts }, (_, i) => 1.7 + i * 0.4),
  ...Array.from({ length: closes }, (_, i) => 4.9 + i * 0.4),
];

export function vars(data, pick = {}) {
  const sw = data.secretWord;
  need(sw, 'no Secret Word that day');
  need(sw.players >= MIN_PLAYERS, `only ${sw.players} players`);
  need(sw.word && sw.word.length <= 9, `the word "${sw.word}" does not fit the tiles`);
  need((sw.firstGuesses || []).length >= 2 && (sw.closeCalls || []).length >= 2, 'not enough first guesses or close calls to show');
  const copy = pick.copy || {};
  return {
    date: labelOfDay(data.day),
    hook: copy.hook || `The herd needed ${num(sw.medianGuesses)} guesses. Can you beat that?`,
    word: sw.word,
    firsts: list(sw.firstGuesses, 3),
    closes: list(sw.closeCalls, 4),
    chipTimes: chipTimes(Math.min(3, sw.firstGuesses.length), Math.min(4, sw.closeCalls.length)).map((t) => t.toFixed(3)).join(','),
    reveal: copy.reveal || 'The secret word was…',
    stat: copy.stat || `${num(sw.found)} of ${num(sw.players)} found it`,
    stat2: copy.stat2 || (sw.fewestGuesses === 1 ? 'Someone got it in 1 guess' : `Fastest: ${num(sw.fewestGuesses)} guesses`),
    cta: copy.cta || 'How many guesses would you need?',
    endHead: copy.endHead || 'Find today’s word',
    endGame: 'Secret Word · a new word every day',
  };
}
