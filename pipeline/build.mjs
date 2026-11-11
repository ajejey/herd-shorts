#!/usr/bin/env node
/*
  Make one day's video project: copy a template to out/<day>-<format>/ with the
  day's values written in as its variables' defaults, ready to check and render.

    node pipeline/build.mjs --format=B-board --day=162 [--pick=picks/2026-11-11.json]

  Writing the values in (rather than passing --variables at render time) means
  `hyperframes check` measures the real day's text, so a long question or answer
  that would overflow is caught before anything is rendered, and the project
  opens in the preview exactly as it will render.

  Every variable the template declares must come from the format's vars(): a
  sample default never leaks into a real video. An element marked
  data-if="<variable>" is removed when that variable is empty (e.g. the flip
  sound of an answer the board does not have).
*/
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, FORMATS, readJson, NotEligible } from './lib.mjs';

const SKIP = new Set(['.hyperframes', '.media', 'node_modules', 'renders', 'out', 'snapshots']);

const decode = (s) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const encode = (s) => s.replace(/&/g, '&amp;').replace(/'/g, '&#39;');
const VARS_RE = /data-composition-variables='([^']*)'/;

export function declaredVariables(html) {
  const m = html.match(VARS_RE);
  if (!m) throw new Error('index.html declares no data-composition-variables');
  return JSON.parse(decode(m[1]));
}

export function rootDuration(html) {
  const m = html.match(/data-composition-id="main"[^>]*data-duration="([\d.]+)"/);
  return m ? Number(m[1]) : null;
}

/* The day's values checked against what the template declares: all present, none extra, right types. */
export function checkValues(decl, values) {
  const problems = [];
  const ids = new Set(decl.map((d) => d.id));
  for (const d of decl) {
    if (!(d.id in values)) { problems.push(`missing ${d.id}`); continue; }
    const v = values[d.id];
    const ok = d.type === 'number' ? typeof v === 'number' && Number.isFinite(v)
      : d.type === 'boolean' ? typeof v === 'boolean'
        : typeof v === 'string';
    if (!ok) problems.push(`${d.id} should be a ${d.type}, got ${JSON.stringify(v)}`);
    if (d.type === 'enum' && !(d.options || []).some((o) => o.value === v)) problems.push(`${d.id}: ${v} is not an option`);
  }
  for (const k of Object.keys(values)) if (!ids.has(k)) problems.push(`undeclared ${k}`);
  return problems;
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (SKIP.has(e.name) || e.name.endsWith('.log')) continue;
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) copyDir(a, b); else fs.copyFileSync(a, b);
  }
}

export async function build({ format, day, pick = {}, out }) {
  const dirName = FORMATS[format];
  if (!dirName) throw new Error(`unknown format ${format} (known: ${Object.keys(FORMATS).join(', ')})`);
  const template = path.join(ROOT, 'templates', dirName);
  if (!fs.existsSync(path.join(template, 'index.html'))) throw new NotEligible(`${format} has no template yet`);
  const data = readJson(path.join(ROOT, 'data', `${day}.json`));
  const { vars } = await import(pathToFileURL(path.join(ROOT, 'pipeline', 'formats', `${dirName}.mjs`)).href);
  const values = vars(data, pick);

  const src = fs.readFileSync(path.join(template, 'index.html'), 'utf8');
  const decl = declaredVariables(src);
  const problems = checkValues(decl, values);
  if (problems.length) throw new Error(`${format} day ${day}: ${problems.join('; ')}`);

  const dir = out || path.join(ROOT, 'out', `${day}-${dirName}`);
  // Empty it rather than delete it: hyperframes' warm checker can hold the folder open for a few minutes
  if (fs.existsSync(dir)) {
    for (const e of fs.readdirSync(dir)) if (e !== '.hyperframes') fs.rmSync(path.join(dir, e), { recursive: true, force: true });
  }
  copyDir(template, dir);
  fs.copyFileSync(path.join(ROOT, 'templates', '_shared', 'herd.js'), path.join(dir, 'assets', 'herd.js'));

  const filled = decl.map((d) => ({ ...d, default: values[d.id] }));
  let html = src.replace(VARS_RE, () => `data-composition-variables='${encode(JSON.stringify(filled, null, 0).replace(/\},\{/g, '},\n    {'))}'`);
  html = html.replace(/[ \t]*<(\w+)\b[^>]*\sdata-if="(\w+)"[^>]*>[\s\S]*?<\/\1>\n?/g, (whole, _tag, id) => (values[id] ? whole : ''));
  // data-each="<variable>": one copy per time in that comma list (e.g. a sound on every line of a doodle)
  html = html.replace(/([ \t]*)(<(\w+)\b[^>]*\sdata-each="(\w+)"[^>]*>[\s\S]*?<\/\3>)\n?/g, (whole, indent, el, _tag, id) => {
    const times = String(values[id] || '').split(',').filter(Boolean).map(Number);
    return times.map((t, i) => `${indent}${el
      .replace(/\sdata-each="\w+"/, '')
      .replace(/\sid="([^"]+)"/, (m, base) => ` id="${base}-${i + 1}"`)
      .replace(/\sdata-start="[^"]*"/, ` data-start="${t.toFixed(3)}"`)}\n`).join('');
  });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  fs.writeFileSync(path.join(dir, 'variables.json'), `${JSON.stringify(values, null, 2)}\n`);
  return { dir, values, duration: rootDuration(html) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
  try {
    const pick = arg('pick') ? readJson(path.resolve(arg('pick'))) : {};
    const r = await build({ format: arg('format') || pick.format, day: Number(arg('day') || pick.day), pick });
    console.log(`built ${path.relative(ROOT, r.dir)} (${r.duration}s)`);
  } catch (err) {
    console.error(`✗ ${err instanceof NotEligible ? 'not eligible: ' : ''}${err.message}`);
    process.exit(err instanceof NotEligible ? 3 : 1);
  }
}
