/*
  C-dial, "Pick a side" (Hot Takes): the viewer picks in 3 seconds, the needle
  swings to where the herd landed, the split slams in. Follows strategy/PRINCIPLES.md.
*/
import { labelOfDay, num, need } from '../lib.mjs';

const MIN_VOTES = 100;

/* The beat clock (seconds) */
export const T = { count: 1.1, swing: 4.4, settle: 8.6, hold: 8.6, reveal: 9.9, sting: 10.6, ask: 11.1, play: 13.2, rewind: 15.3, end: 16.1 };
export const SCENE = 'scene';

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
  if (t.counts[0] === t.counts[1]) return 'A perfect tie!';
  if (g <= 6) return 'Split almost in half!';
  if (g <= 20) return 'Close, but not a tie';
  if (g <= 50) return 'A clear winner';
  return 'Not even close!';
}

export function sting(t) {
  const diff = Math.abs(t.counts[0] - t.counts[1]);
  // 15 Nov 2026: an exact 195-195 tie went out as "Only 0 votes apart", which read as no data.
  if (diff === 0) return `Dead even: ${num(t.counts[0])} each`;
  if (diff === 1) return 'Decided by 1 vote';
  if (gap(t) <= 3) return `Only ${num(diff)} votes apart`;
  const win = t.counts[0] >= t.counts[1] ? 0 : 1;
  const pct = Math.round((100 * t.counts[win]) / t.players);
  return `${pct}% picked “${win ? t.b : t.a}”`;
}

/* The needle's swing (the template draws the same curve): seconds of the swing at which it crosses its resting point */
export function swingTicks() {
  const k = 7.6 / (T.settle - T.swing);   // the curve's own clock runs 7.6 s over the swing
  const out = [];
  for (let i = 0; i < 6; i++) { const tp = (Math.PI / 2 - 0.9) / 2.4 + (i * Math.PI) / 2.4; if (tp < 6.6) out.push(T.swing + tp / k); }
  return out;
}

/* Commentary: where this take sits among the day's */
export function insight(take, takes) {
  const ok = takes.filter((t) => t.players >= MIN_VOTES && t.a && t.b);
  if (ok.length < 3) return '';
  const byGap = [...ok].sort((x, y) => gap(x) - gap(y));
  if (byGap[0].id === take.id) return 'The most divided take of the day';
  if (byGap[byGap.length - 1].id === take.id) return 'The most one-sided take of the day';
  return `One of ${ok.length} takes today`;
}

export function vars(data, pick = {}) {
  const takes = data.hotTakes || [];
  const take = pick.take ? takes.find((t) => t.id === pick.take) : chooseTake(takes);
  need(take, pick.take ? `no hot take "${pick.take}" that day` : `no hot take with ${MIN_VOTES}+ votes that day`);
  need(take.players >= MIN_VOTES, `only ${take.players} votes on "${take.prompt}"`);
  const copy = pick.copy || {};
  return {
    date: labelOfDay(data.day),
    label: copy.label || 'Pick a side:',
    prompt: take.prompt,
    a: take.a,
    b: take.b,
    countA: take.counts[0],
    countB: take.counts[1],
    turn: copy.turn || 'Quick, pick one!',
    herd: copy.herd || 'Where did the herd land?',
    hold: copy.hold || 'The herd says…',
    verdict: copy.verdict || verdict(take),
    players: take.players,
    sting: copy.sting || sting(take),
    insight: copy.insight ?? insight(take, takes),
    ask: copy.ask || 'Which side are you on?',
    play: copy.play || 'Play today’s Hot Takes free',
    url: 'herdgamesonline.com',
    swingTicks: swingTicks().map((t) => t.toFixed(3)).join(','),
  };
}
