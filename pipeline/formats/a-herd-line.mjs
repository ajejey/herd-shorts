/*
  A-herd-line: a Daily Guesstimate question. The herd's guesses drop onto a
  number line as sheep, "most said X", then the answer's flag drops; when the
  answer is outside the herd the camera pulls out to reach it.

  The numbers are worked out here (scale, views, ticks, who is highlighted) so
  the template only draws, and so they can be tested without a browser.
*/
import { labelOfDay, num, need } from '../lib.mjs';

const MAX_SHEEP = 180;
const MIN_PLAYERS = 40;

export const quantile = (sorted, f) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(f * sorted.length)))];

/* Evenly spaced picks from a sorted list, keeping both ends. */
export function sample(sorted, n) {
  if (sorted.length <= n) return sorted.slice();
  return Array.from({ length: n }, (_, i) => sorted[Math.round((i * (sorted.length - 1)) / (n - 1))]);
}

const trim = (x, digits = 3) => String(Number(x.toPrecision(digits)));

/* A number as a person would say it: years as is, big numbers in words, the rest with commas. */
export function say(v, unit) {
  if (unit === 'year') return String(Math.round(v));
  const a = Math.abs(v);
  if (a >= 1e12) return `${trim(v / 1e12)} trillion`;
  if (a >= 1e9) return `${trim(v / 1e9)} billion`;
  if (a >= 1e6) return `${trim(v / 1e6)} million`;
  if (a >= 1000) return num(Math.round(v));
  return trim(v);
}

/* Axis labels: short (1K, 2.5M). */
export function tickLabel(v, unit) {
  if (unit === 'year') return String(Math.round(v));
  const a = Math.abs(v);
  if (a >= 1e12) return `${trim(v / 1e12, 2)}T`;
  if (a >= 1e9) return `${trim(v / 1e9, 2)}B`;
  if (a >= 1e6) return `${trim(v / 1e6, 2)}M`;
  if (a >= 1e4) return `${trim(v / 1e3, 2)}K`;
  if (a >= 1000) return num(v);
  return trim(v, 2);
}

/* The answer as shown: the big number, and the line under it. */
export function answerParts(q) {
  if (q.unit === 'year') return { big: String(q.answer), unit: 'is the year' };
  if (q.unit === 'percent') return { big: `${trim(q.answer)}%`, unit: '' };
  const a = Math.abs(q.answer);
  for (const [n, w] of [[1e12, 'trillion'], [1e9, 'billion']]) if (a >= n) return { big: trim(q.answer / n), unit: `${w} ${q.unit}` };
  return { big: a >= 1000 ? num(Math.round(q.answer)) : trim(q.answer), unit: q.unit };
}

/*
  The scale and the two views (in value space): view 1 frames the herd (15th to
  85th percentile, padded); view 2 adds the answer when it is well outside it,
  landing it at 88% of the way across. A log scale when guesses span orders of
  magnitude; years and percentages are always linear.
*/
export function scaleFor(q, sorted) {
  const linear = q.unit === 'year' || q.unit === 'percent';
  let pts = linear ? sorted : sorted.filter((v) => v > 0);
  const p10 = quantile(pts, 0.15), p90 = quantile(pts, 0.85);
  const log = !linear && p10 > 0 && q.answer > 0 && (p90 / p10 > 30 || q.answer / q.median > 20 || q.median / q.answer > 20);
  const T = log ? Math.log10 : (x) => x;
  const U = log ? (t) => 10 ** t : (t) => t;

  let lo = T(p10), hi = T(p90);
  if (hi - lo < 1e-9) { const w = log ? 0.5 : Math.max(1, Math.abs(hi) * 0.2); lo -= w; hi += w; }
  const pad = (hi - lo) * 0.08;
  lo -= pad; hi += pad;
  if (q.unit === 'percent') { lo = Math.max(0, lo); hi = Math.min(100, hi); }
  if (!log && q.unit !== 'year' && p10 >= 0) lo = Math.max(0, lo);

  // The answer just outside the herd: widen view 1 instead of a pointless small pull
  const ta = T(q.answer), span = hi - lo;
  if (ta > hi && ta - hi < span * 0.25) hi = ta + span * 0.06;
  if (ta < lo && lo - ta < span * 0.25) lo = ta - span * 0.06;

  let lo2 = lo, hi2 = hi;
  if (ta > hi) hi2 = lo + (ta - lo) / 0.88;
  if (ta < lo) lo2 = hi - (hi - ta) / 0.88;
  pts = null;
  return { log, view1: [U(lo), U(hi)], view2: [U(lo2), U(hi2)], pull: lo2 !== lo || hi2 !== hi };
}

/* Round tick values inside a view: decades (or 1-2-5) on a log scale, a 1-2-5 step on a linear one. */
export function ticksFor([a, b], log, unit) {
  const out = [];
  if (log) {
    const k0 = Math.ceil(Math.log10(a)), k1 = Math.floor(Math.log10(b));
    if (k1 - k0 >= 2) {
      const every = Math.max(1, Math.ceil((k1 - k0 + 1) / 5));
      for (let k = k0; k <= k1; k += every) out.push(10 ** k);
    } else {
      const ms = k1 - k0 >= 1 ? [1, 3] : [1, 2, 5];
      for (let k = k0 - 1; k <= k1; k++) for (const m of ms) { const v = m * 10 ** k; if (v >= a && v <= b) out.push(v); }
    }
  } else {
    const raw = (b - a) / 4;
    const p = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw * 0.7) || 10 * p;
    for (let v = Math.ceil(a / step) * step; v <= b + 1e-9; v += step) out.push(Number(v.toPrecision(12)));
  }
  return out.map((v) => `${v}:${tickLabel(v, unit)}`).join(';');
}

/* The rule the "close" count used (the backend's): within 2 years, or within 10%. */
const closeTest = (q) => (q.unit === 'year' ? (g) => Math.abs(g - q.answer) <= 2 : (g) => Math.abs(g - q.answer) <= Math.abs(q.answer) * 0.1);

/* How far the herd's middle missed, in orders of magnitude (years: in decades of years). */
export const missOf = (q) => (q.unit === 'year' || q.unit === 'percent'
  ? Math.abs(q.median - q.answer) / Math.max(1, q.unit === 'year' ? 30 : 20)
  : q.median > 0 && q.answer > 0 ? Math.abs(Math.log10(q.median / q.answer)) : 0);

/* The question to show when the pick names none: the herd's biggest miss. */
export function chooseQuestion(qs) {
  const ok = qs.filter((q) => q.players >= MIN_PLAYERS && q.guesses && q.guesses.length);
  if (!ok.length) return null;
  return [...ok].sort((x, y) => missOf(y) - missOf(x))[0];
}

export function vars(data, pick = {}) {
  const qs = data.guesstimate || [];
  const q = pick.question != null ? qs.find((x) => x.id === pick.question) : chooseQuestion(qs);
  need(q, pick.question != null ? `no guesstimate question ${pick.question} that day` : `no guesstimate question with ${MIN_PLAYERS}+ players`);
  need(q.players >= MIN_PLAYERS, `only ${q.players} players on question ${q.id}`);
  const sorted = q.guesses.filter(Number.isFinite).sort((a, b) => a - b);
  const sc = scaleFor(q, sorted);
  const shown = sample(sorted, MAX_SHEEP);
  const close = closeTest(q);
  const copy = pick.copy || {};
  const ans = answerParts(q);

  let hiliteMode = 'none', hilite;
  if (q.exact > 0 && shown.some((g) => g === q.answer)) {
    hiliteMode = 'exact';
    hilite = `${num(q.exact)} of ${num(q.players)} players got it exactly`;
  } else if (q.close > 0 && shown.some(close)) {
    hiliteMode = 'close';
    hilite = `Only ${num(q.close)} of ${num(q.players)} got ${q.closeRule}`;
  } else {
    hilite = `Nobody got ${q.closeRule}`;
  }

  return {
    date: labelOfDay(data.day),
    question: q.question,
    hook: copy.hook || 'Guess before the herd does',
    context: copy.context || q.question,
    players: q.players,
    guesses: shown.map((g) => String(g)).join(','), // exact values: an exact guess must still equal the answer
    scale: sc.log ? 'log' : 'linear',
    view1Lo: sc.view1[0], view1Hi: sc.view1[1], view2Lo: sc.view2[0], view2Hi: sc.view2[1],
    ticks1: ticksFor(sc.view1, sc.log, q.unit),
    ticks2: ticksFor(sc.view2, sc.log, q.unit),
    median: q.median,
    tag: copy.tag || `Most said ${say(q.median, q.unit)}`,
    reveal: copy.reveal || 'The real answer is…',
    answer: q.answer,
    answerBig: ans.big,
    answerUnit: copy.unitLine ?? ans.unit,
    fact: copy.fact ?? (q.fact || ''),
    hiliteMode,
    closeLo: q.unit === 'year' ? q.answer - 2 : q.answer - Math.abs(q.answer) * 0.1,
    closeHi: q.unit === 'year' ? q.answer + 2 : q.answer + Math.abs(q.answer) * 0.1,
    hilite: copy.hilite || hilite,
    pull: sc.pull,
    endHead: copy.endHead || 'Can you beat | the herd?',
    endGame: 'Daily Guesstimate · new every day',
  };
}
