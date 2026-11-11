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
