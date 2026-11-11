/* Small helpers shared by the pipeline scripts. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* Herd day 0 is 1 June 2026 (UTC), the same counter the backend uses. */
const DAY0 = Date.UTC(2026, 5, 1);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const dateOfDay = (day) => new Date(DAY0 + day * 86400000);
export const isoOfDay = (day) => dateOfDay(day).toISOString().slice(0, 10);
export const labelOfDay = (day) => { const d = dateOfDay(day); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };

export const num = (n) => Number(n).toLocaleString('en-US');
export const pct = (part, whole) => (whole ? Math.round((100 * part) / whole) : 0);

export const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

/* The format ids the strategy uses, and the template folder each renders from. */
export const FORMATS = {
  'A-herd-line': 'a-herd-line',
  'B-board': 'b-board',
  'C-dial': 'c-dial',
  'D-doodle': 'd-doodle',
  'E-word-climb': 'e-word-climb',
  'F-secret-word': 'f-secret-word',
  'G-words-from': 'g-words-from',
};

/* A format that cannot be made from a day's data says why instead of rendering something wrong. */
export class NotEligible extends Error {}
export const need = (cond, why) => { if (!cond) throw new NotEligible(why); };

/*
  Words that should never go out on a public channel without a person (or
  Claude, reading the candidates) choosing to: the unattended fallback skips any
  format whose on-screen text contains one. Real catches: day 161's Word Climb
  rung "racism", a Top Answers board with "Sex" at 10%.
*/
const SENSITIVE = /\b(sex\w*|porn\w*|nude\w*|naked|racis\w*|nazi\w*|hitler|rape\w*|suicid\w*|kill\w*|murder\w*|terror\w*|drug\w*|cocaine|heroin|weed|alcohol\w*|drunk|gun\w*|shoot\w*|bomb\w*|abuse\w*|slave\w*|genocide|holocaust|dead|death|die|dying|cancer|penis|vagina|boob\w*|fuck\w*|shit\w*|bitch\w*|damn|hell|crap|ass|bastard|dick\w*|piss\w*|communis\w*|fascis\w*|trump|biden|religio\w*|god|jesus|allah|islam\w*|christian\w*|jew\w*|muslim\w*)\b/i;

/* Every on-screen string in a format's values that contains a sensitive word. */
export function sensitiveHits(values) {
  const hits = [];
  for (const [k, v] of Object.entries(values)) {
    if (typeof v !== 'string' || ['guesses', 'strokes', 'ticks1', 'ticks2', 'lineTimes', 'rungTimes', 'chipTimes', 'wordTimes', 'gotByLine', 'credit'].includes(k)) continue;
    for (const part of v.split(/[|,;]/)) {
      const m = part.match(SENSITIVE);
      if (m) hits.push(`${k}: "${m[0]}"`);
    }
  }
  return hits;
}

/*
  Explicit asks for engagement. Instagram does not recommend posts that ask for
  comments, shares or tags (its engagement-bait rule), so on-screen copy asks a
  real question instead ("When did you get it?"). check.mjs fails any default
  copy that matches; a pick's copy is checked the same way before render.
*/
const ASKS = /\b(comment|comments|share|shares|tag a|tag your|tag someone|follow|subscribe|send this|send it to|repost|like and)\b/i;
export function engagementAsks(values) {
  return Object.entries(values).filter(([k, v]) => typeof v === 'string' && !['strokes', 'guesses', 'credit'].includes(k) && ASKS.test(v)).map(([k, v]) => `${k}: "${v}"`);
}

/*
  Variety (strategy/PRINCIPLES.md, YouTube's "inauthentic content" rule:
  template-made videos "with little to no variation" lose standing). Every
  video gets a world, a celebration, a host reaction and a music bed, rotated
  by day so the same format never looks or sounds the same two days running,
  and offset by format so the same day's formats differ too. A pick can set
  any of them ("variety": { "theme": "snow" }).
*/
export const THEMES = ['meadow', 'sunset', 'snow', 'beach', 'autumn', 'spring'];
export const PARTIES = ['confetti', 'stars', 'stampede'];
export const REACTS = ['jump', 'spin', 'dance'];
export const MUSIC = {
  'A-herd-line': ['quiz-pluck', 'orchestral-pizz', 'arcade-bounce', 'jazz-swing'],
  'B-board': ['feud-funk', 'funk-clav', 'synth-pop', 'tropical'],
  'C-dial': ['debate-synth', 'synth-pop', 'arcade-bounce', 'funk-clav'],
  'D-doodle': ['sketch-uke', 'orchestral-pizz', 'tropical', 'jazz-swing'],
  'E-word-climb': ['word-keys', 'jazz-swing', 'orchestral-pizz', 'synth-pop'],
  'F-secret-word': ['word-keys', 'tension-pulse', 'funk-clav', 'tropical'],
  'G-words-from': ['word-keys', 'arcade-bounce', 'jazz-swing', 'synth-pop'],
};
export function variety(format, day, pick = {}) {
  const fi = Math.max(0, Object.keys(FORMATS).indexOf(format));
  const v = pick.variety || {};
  const pool = MUSIC[format] || MUSIC['A-herd-line'];
  return {
    theme: v.theme || THEMES[(day + fi * 5) % THEMES.length],
    party: v.party || PARTIES[(day + fi * 2) % PARTIES.length],
    react: v.react || REACTS[(day + fi) % REACTS.length],
    music: v.music || pool[(day + fi) % pool.length],
  };
}
export const VARIETY_DECL = {
  theme: { label: 'World', options: THEMES },
  party: { label: 'Celebration at the reveal', options: PARTIES },
  react: { label: 'The cow at the reveal', options: REACTS },
  music: { label: 'Music bed (file in assets/shared/music)' },
};
