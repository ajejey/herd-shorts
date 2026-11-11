/* C-dial: one Hot Take as a gauge; the needle swings and settles on the real split. */
import { labelOfDay, num, need } from '../lib.mjs';

const MIN_VOTES = 100;

/* How far apart the two sides are, in percentage points. */
export const gap = (t) => (t.players ? Math.abs(t.counts[0] - t.counts[1]) * 100 / t.players : 100);

/*
  The take to show when the pick names none: a near tie if there is one (the
  needle hovering is the story), otherwise the most lopsided (the swing that
  lands far over).
*/
export function chooseTake(takes) {
  const ok = takes.filter((t) => t.players >= MIN_VOTES && t.a && t.b);
  if (!ok.length) return null;
  const closest = [...ok].sort((x, y) => gap(x) - gap(y))[0];
  if (gap(closest) <= 8) return closest;
  return [...ok].sort((x, y) => gap(y) - gap(x))[0];
}

export function verdict(t) {
  const g = gap(t);
  if (g <= 6) return 'Split almost in half.';
  if (g <= 20) return 'Close, but not a tie.';
  if (g <= 50) return 'A clear winner.';
  return 'Not even close.';
}

export function vars(data, pick = {}) {
  const takes = data.hotTakes || [];
  const take = pick.take ? takes.find((t) => t.id === pick.take) : chooseTake(takes);
  need(take, pick.take ? `no hot take "${pick.take}" that day` : `no hot take with ${MIN_VOTES}+ votes that day`);
  need(take.players >= MIN_VOTES, `only ${take.players} votes on "${take.prompt}"`);
  const copy = pick.copy || {};
  return {
    date: labelOfDay(data.day),
    prompt: take.prompt,
    a: take.a,
    b: take.b,
    countA: take.counts[0],
    countB: take.counts[1],
    line1: copy.hook || `${num(take.players)} people answered. | Where did they land?`,
    line2: copy.line2 || 'Guess where it stops',
    line3: copy.verdict || verdict(take),
    line4: copy.line4 || 'Which side are you on?',
    endHead: copy.endHead || 'Pick your side',
    endGame: 'Daily Hot Takes · new takes every day',
  };
}
