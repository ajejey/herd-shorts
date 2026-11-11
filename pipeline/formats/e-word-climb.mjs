/* E-word-climb: the day's ladder fills in rung by rung, with how many of the herd made each one. */
import { labelOfDay, num, need } from '../lib.mjs';

const MIN_PLAYERS = 40;
const FIRST = 1.3, LAST = 8.2;   // rung 1 fills at FIRST, the top rung at LAST (seconds)

export const rungTimes = (n) => Array.from({ length: n }, (_, i) => FIRST + (i * (LAST - FIRST)) / Math.max(1, n - 1));

/* The most common opening guess on any rung (a word the herd leaned on). */
export function topOpener(rungs) {
  let best = null;
  rungs.forEach((r, i) => (r.openers || []).forEach((o) => { if (!best || o.count > best.count) best = { ...o, rung: i + 1 }; }));
  return best;
}

export function payoff(wc) {
  const n = wc.rungs.length;
  if (!wc.climbedAll) return `Nobody climbed all ${n}`;
  if (wc.climbedAll / wc.players < 0.3) return `Only ${num(wc.climbedAll)} of ${num(wc.players)} climbed all ${n}`;
  return `${num(wc.climbedAll)} of ${num(wc.players)} climbed all ${n}`;
}

export function vars(data, pick = {}) {
  const wc = data.wordClimb;
  need(wc, 'no Word Climb that day');
  need(wc.players >= MIN_PLAYERS, `only ${wc.players} players`);
  need(wc.rungs && wc.rungs.length >= 5 && wc.rungs.length <= 8, `a ladder of ${wc.rungs?.length} rungs (the layout holds 5-8)`);
  need(wc.rungs.every((r) => r.word && r.word.length <= 10), 'a rung word longer than 10 letters');
  const copy = pick.copy || {};
  const op = topOpener(wc.rungs);
  return {
    date: labelOfDay(data.day),
    hook: copy.hook || `${num(wc.players)} people started the climb. How far would you get?`,
    players: wc.players,
    rungs: wc.rungs.map((r) => `${r.word}:${r.solved}`).join('|'),
    rungTimes: rungTimes(wc.rungs.length).map((t) => t.toFixed(3)).join(','),
    payoff: copy.payoff || payoff(wc),
    stat: copy.stat || (op ? `Most popular opener: ${op.value.toUpperCase()} (rung ${op.rung})` : `${num(wc.finished)} finished the ladder`),
    cta: copy.cta || 'How far would you get? Comment your rung.',
    endHead: copy.endHead || 'Climb today’s ladder',
    endGame: 'Word Climb · a new ladder every day',
  };
}
