#!/usr/bin/env node
/*
  Build, check and render one video, then prove the file is right.

    node pipeline/render.mjs --format=B-board --day=162 [--pick=picks/2026-11-11.json] [--quality=draft]

  Steps: build (pipeline/build.mjs) → `hyperframes check` must pass (lint, layout,
  contrast on the real day's text) → render → the file exists, is not tiny, and
  ffprobe's duration matches the composition → a contact sheet of 7 frames.

  Writes renders/<day>-<format>.mp4 and renders/<day>-<format>.jpg, and prints
  one JSON line ({ ok, file, sheet, duration, values }) for the workflow.
*/
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { ROOT, readJson, NotEligible } from './lib.mjs';
import { build } from './build.mjs';

const HF = ['--yes', 'hyperframes@0.9.20'];
const isWin = process.platform === 'win32';

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: isWin, maxBuffer: 64 * 1024 * 1024, ...opts });
  return { code: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}
const q = (s) => (isWin && /\s/.test(s) ? `"${s}"` : s);

function latestCheck(dir) {
  const d = path.join(dir, '.hyperframes', 'artifacts', 'checks');
  if (!fs.existsSync(d)) return null;
  const f = fs.readdirSync(d).map((x) => path.join(d, x)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
  return f ? readJson(f) : null;
}

export function findings(report) {
  const out = [];
  for (const [section, s] of Object.entries(report || {})) {
    if (s && Array.isArray(s.findings)) for (const f of s.findings) out.push({ section, ...f });
  }
  return out;
}

export async function render({ format, day, pick = {}, quality = 'looks' }) {
  const b = await build({ format, day, pick });
  const name = `${day}-${path.basename(b.dir).replace(/^\d+-/, '')}`;

  const started = Date.now();
  run('npx', [...HF, 'check'], { cwd: b.dir });
  const report = latestCheck(b.dir);
  if (!report || fs.statSync(path.join(b.dir, '.hyperframes', 'artifacts', 'checks')).mtimeMs < started - 1000) throw new Error('check wrote no report');
  const all = findings(report);
  const errors = all.filter((f) => f.severity === 'error');
  if (!report.ok || errors.length) {
    throw new Error(`check failed: ${errors.map((f) => `${f.section}/${f.code}: ${(f.message || '').slice(0, 160)}`).join(' | ') || 'not ok'}`);
  }

  fs.mkdirSync(path.join(ROOT, 'renders'), { recursive: true });
  const file = path.join(ROOT, 'renders', `${name}.mp4`);
  fs.rmSync(file, { force: true });
  const r = run('npx', [...HF, 'render', '--quality', quality, '--output', q(file)], { cwd: b.dir });
  if (r.code !== 0 || !fs.existsSync(file)) throw new Error(`render failed:\n${r.out.slice(-2000)}`);
  if (fs.statSync(file).size < 100 * 1024) throw new Error(`render is only ${fs.statSync(file).size} bytes`);

  const probe = run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', q(file)]);
  const duration = Number(probe.out.trim());
  if (!(Math.abs(duration - b.duration) < 0.25)) throw new Error(`rendered ${duration}s, composition is ${b.duration}s`);
  const audio = run('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', q(file)]);
  if (!audio.out.includes('audio')) throw new Error('render has no sound');

  // Contact sheet: 7 frames across the video, for a look before anything is posted
  const sheet = path.join(ROOT, 'renders', `${name}.jpg`);
  const times = [0, 0.12, 0.3, 0.5, 0.65, 0.8, 0.95].map((f) => (f * duration).toFixed(2));
  const inputs = times.flatMap((t) => ['-ss', t, '-i', q(file)]);
  const s = run('ffmpeg', ['-loglevel', 'error', '-y', ...inputs, '-filter_complex', q(`${times.map((_, i) => `[${i}:v]scale=300:-1[v${i}]`).join(';')};${times.map((_, i) => `[v${i}]`).join('')}hstack=inputs=${times.length}`), '-frames:v', '1', '-q:v', '3', q(sheet)]);
  if (s.code !== 0) throw new Error(`contact sheet failed: ${s.out.slice(-500)}`);

  return { ok: true, file: path.relative(ROOT, file), sheet: path.relative(ROOT, sheet), duration, warnings: all.filter((f) => f.severity === 'warning').map((f) => `${f.code}: ${(f.message || '').slice(0, 120)}`), values: b.values };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
  try {
    const pick = arg('pick') ? readJson(path.resolve(arg('pick'))) : {};
    const r = await render({ format: arg('format') || pick.format, day: Number(arg('day') || pick.day), pick, quality: arg('quality') || 'looks' });
    console.log(JSON.stringify(r));
  } catch (err) {
    console.log(JSON.stringify({ ok: false, notEligible: err instanceof NotEligible, error: err.message }));
    process.exit(err instanceof NotEligible ? 3 : 1);
  }
}
