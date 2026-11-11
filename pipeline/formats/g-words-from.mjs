/*
  G-words-from, "Find the words" (Words from a Word): the viewer gets a
  6-second turn to find words in the big word; then the herd's top finds drop
  out of it; then how many were hiding. Follows strategy/PRINCIPLES.md.
*/
import { labelOfDay, num, need } from '../lib.mjs';

const MIN_PLAYERS = 40;

/* The beat clock (seconds): a 6-second turn from 1.2 (count = its last 3 seconds, when the beeps play) */
export const T = { turn: 1.2, count: 4.2, finds: 7.3, reveal: 9.9, sting: 10.6, ask: 11.1, play: 13.2, rewind: 15.3, end: 16.1 };
export const SCENE = 'scene';

/* When each of the herd's finds drops out of the big word (the template uses the same times) */
export const wordTimes = (n) => Array.from({ length: n }, (_, i) => T.finds + 0.15 + i * 0.55);

export function vars(data, pick = {}) {
  const wf = data.wordsFrom;
  need(wf, 'no Words from a Word that day');
  need(wf.players >= MIN_PLAYERS, `only ${wf.players} players`);
  need(wf.word && wf.word.length <= 11, `the word "${wf.word}" does not fit the tiles`);
  const found = (wf.mostFound || []).filter((w) => w.word !== wf.word && w.word.length <= 8).slice(0, 4);
  need(found.length >= 3, 'fewer than 3 found words to show');
  const copy = pick.copy || {};
  const W = wf.word.toUpperCase();
  return {
    date: labelOfDay(data.day),
    hook: copy.hook || `How many words can you find in ${W}?`,
    word: W,
    found: found.map((w) => `${w.word.toUpperCase()}:${w.count}`).join('|'),
    wordTimes: wordTimes(found.length).map((t) => t.toFixed(3)).join(','),
    turn: copy.turn || 'Find as many as you can',
    finds: copy.finds || 'The herd’s top finds:',
    reveal: copy.reveal || `${num(wf.hidden)} words were hiding!`,
    players: wf.players,
    sting: copy.sting || `${num(wf.foundBigWord)} of ${num(wf.players)} spotted ${W} itself`,
    insight: copy.insight ?? (wf.differentWordsFound ? `The herd found ${num(wf.differentWordsFound)} different words` : ''),
    ask: copy.ask || 'How many did you find?',
    play: copy.play || 'Play today’s Words from a Word',
    url: 'herdgamesonline.com',
  };
}
