/*
  F-secret-word, "Hot or cold" (Secret Word): the herd's guesses are the clues,
  cold ones (where people started) and hot ones (the near misses); the viewer
  guesses the word; then it flips in. Follows strategy/PRINCIPLES.md.
*/
import { labelOfDay, num, need } from '../lib.mjs';

const MIN_PLAYERS = 40;

/* The beat clock (seconds) */
export const T = { clues: 1.0, count: 4.2, herd: 7.3, hold: 8.3, reveal: 9.9, sting: 10.6, ask: 11.1, play: 13.2, rewind: 15.3, end: 16.1 };
export const SCENE = 'scene';

const list = (xs, n) => (xs || []).slice(0, n).map((x) => `${x.value}:${x.count}`).join('|');

/* When each chip lands: cold ones first, then hot (the template uses the same times) */
export const chipTimes = (cold, hot) => [
  ...Array.from({ length: cold }, (_, i) => 1.2 + i * 0.35),
  ...Array.from({ length: hot }, (_, i) => 2.5 + i * 0.4),
];

export function vars(data, pick = {}) {
  const sw = data.secretWord;
  need(sw, 'no Secret Word that day');
  need(sw.players >= MIN_PLAYERS, `only ${sw.players} players`);
  need(sw.word && sw.word.length <= 8, `the word "${sw.word}" does not fit the tiles`);
  need((sw.firstGuesses || []).length >= 2 && (sw.closeCalls || []).length >= 2, 'not enough cold guesses or near misses to use as clues');
  const copy = pick.copy || {};
  const cold = Math.min(3, sw.firstGuesses.length), hot = Math.min(4, sw.closeCalls.length);
  return {
    date: labelOfDay(data.day),
    hook: copy.hook || 'Can you find the secret word?',
    word: sw.word.toUpperCase(),
    cold: list(sw.firstGuesses, cold),
    hot: list(sw.closeCalls, hot),
    chipTimes: chipTimes(cold, hot).map((t) => t.toFixed(3)).join(','),
    clues: copy.clues || 'The herd’s guesses, cold to hot:',
    turn: copy.turn || 'Your guess?',
    hold: copy.hold || 'The secret word was…',
    players: sw.players,
    sting: copy.sting || (sw.found / sw.players < 0.5 ? `Only ${num(sw.found)} of ${num(sw.players)} found it` : `${num(sw.found)} of ${num(sw.players)} found it`),
    insight: copy.insight ?? (sw.closeCalls[0] ? `Most common near miss: \u201c${sw.closeCalls[0].value}\u201d` : ''),
    ask: copy.ask || 'Did you get it?',
    play: copy.play || 'Play today’s Secret Word free',
    url: 'herdgamesonline.com',
  };
}
