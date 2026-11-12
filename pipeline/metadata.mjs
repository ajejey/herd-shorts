/*
  Title, description and pinned question for a video. YouTube reads titles and
  descriptions when judging "template-made" channels, so these are built from
  the day's own content (the question, the word, the take) and, where a format's
  challenge repeats (the doodle, the hidden word, the secret word), rotate
  between phrasings. A pick's copy (title, description) wins. Whatever is
  chosen must not be too close to any of the last 20 titles: similarTo() refuses it.
*/
import { num } from './lib.mjs';

const GAME = { 'A-herd-line': 'Daily Guesstimate', 'B-board': 'Top Answers', 'C-dial': 'Hot Takes', 'D-doodle': 'Guess the Doodle', 'E-word-climb': 'Word Climb', 'F-secret-word': 'Secret Word', 'G-words-from': 'Words from a Word' };
export const TAGS = {
  'A-herd-line': ['#quiz', '#trivia', '#guessinggame', '#didyouknow', '#brainteaser'],
  'B-board': ['#gameshow', '#survey', '#quiz', '#guessinggame', '#trivia'],
  'C-dial': ['#wouldyourather', '#hottake', '#poll', '#debate', '#thisorthat'],
  'D-doodle': ['#drawing', '#guessthedrawing', '#doodle', '#guessthedoodle', '#puzzle'],
  'E-word-climb': ['#dailypuzzle', '#wordgame', '#wordpuzzle', '#puzzle', '#brainteaser'],
  'F-secret-word': ['#wordgame', '#guesstheword', '#puzzle', '#hotorcold', '#riddle'],
  'G-words-from': ['#wordgame', '#anagram', '#vocabulary', '#wordpuzzle', '#brainteaser'],
};

const words = (s) => new Set(String(s).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2));
/* Word overlap (Jaccard) of two titles: 1 = the same words */
export function similarity(a, b) {
  const A = words(a), B = words(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter += 1;
  return inter / (A.size + B.size - inter);
}
export const TOO_SIMILAR = 0.6;
export function similarTo(title, recent) { return recent.find((r) => similarity(title, r) >= TOO_SIMILAR) || null; }

const clip = (s, n) => (s.length <= n ? s : `${s.slice(0, n - 1).replace(/\s+\S*$/, '')}…`);

/* Title candidates in order of preference, all from the day's content */
function titles(format, v) {
  switch (format) {
    case 'A-herd-line': return [clip(v.question, 95), `${clip(v.question, 70)} ${v.tag}.`, `${v.insight}: ${clip(v.question, 60)}`];
    case 'B-board': return [`${clip(v.question, 70)} Guess the #1 answer`, `${v.total ? num(v.total) : 'Thousands of'} people answered: ${clip(v.question, 60)}`, `${clip(v.question, 80)} What did most people say?`];
    case 'C-dial': return [`${v.prompt} ${v.a} or ${String(v.b).charAt(0).toLowerCase()}${String(v.b).slice(1)}?`, `${v.prompt} ${num(v.players)} people voted`, `${v.prompt} ${v.verdict}`];
    case 'D-doodle': return [`Guess this doodle before line 3`, `What is this drawing? ${v.insight}`, `${v.sting}. Can you beat them?`, `Can you guess what this doodle is?`];
    case 'E-word-climb': return [`Guess the hidden word from the herd's first guesses`, `${num(v.solved)} of ${num(v.reached)} got this word. Can you?`, `${v.insight}. Try the first one`, `Can you crack this ${String(v.word).length}-letter word?`];
    case 'F-secret-word': return [`Hot or cold: find the secret word`, `${v.insight}. What's the secret word?`, `${v.sting}. Can you find it?`, `Find the secret word from ${num(v.players)} people's guesses`];
    case 'G-words-from': return [`How many words can you find in ${v.word}?`, `${v.reveal.replace('!', '')} in ${v.word}`, `${v.word}: how many words can you make?`];
    default: return ['Can you beat the herd?'];
  }
}

export function metadata(format, values, { recent = [], copy = {} } = {}) {
  const candidates = copy.title ? [copy.title] : titles(format, values);
  const title = candidates.find((t) => !similarTo(t, recent));
  if (!title) throw new Error(`every title for ${format} is too close to a recent one ("${candidates[0]}" ~ "${similarTo(candidates[0], recent)}"): the pick must write a new one`);
  const tags = TAGS[format] || [];
  const lines = [
    [values.insight, values.sting].filter(Boolean).join('. ') + '.',
    '',
    `Play today's ${GAME[format]} free: herdgamesonline.com`,
  ];
  if (values.credit) lines.push('', values.credit);
  lines.push('', tags.slice(0, 4).join(' '));
  return { title, description: copy.description || lines.join('\n'), pinned: copy.pinned || values.ask || '', tags };
}
