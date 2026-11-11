#!/usr/bin/env node
/*
  Pull one finished day's real numbers from the Herd Games backend and save them
  as data/<day>.json for the templates.

    SHORTS_KEY=... node pipeline/pull-data.mjs            # yesterday
    SHORTS_KEY=... node pipeline/pull-data.mjs --day=162  # a given finished day

  The backend only answers for finished days (no spoilers) and only with the key.
  Env: SHORTS_KEY (required), SHORTS_API (default: the production backend).
*/
import fs from 'node:fs';
import path from 'node:path';

const API = (process.env.SHORTS_API || 'https://herd-game-backend-production.up.railway.app').replace(/\/$/, '');
const KEY = process.env.SHORTS_KEY;
const dayArg = (process.argv.find((a) => a.startsWith('--day=')) || '').split('=')[1];

if (!KEY) {
  console.error('✗ SHORTS_KEY is not set. Fix: export SHORTS_KEY (GitHub secret in CI).');
  process.exit(1);
}

const url = `${API}/api/shorts/day${dayArg ? `?day=${encodeURIComponent(dayArg)}` : ''}`;
const res = await fetch(url, { headers: { 'x-shorts-key': KEY }, signal: AbortSignal.timeout(30000) });
const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(`✗ ${res.status} from ${API}: ${body.error || 'no body'}${res.status === 404 ? ' (key wrong, or the backend predates the shorts endpoint)' : ''}`);
  process.exit(1);
}

const dir = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', 'data');
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `${body.day}.json`);
fs.writeFileSync(file, `${JSON.stringify(body, null, 2)}\n`);

const n = (x) => (x == null ? '-' : x);
console.log(`day ${body.day} saved to data/${body.day}.json`);
console.log(`  guesstimate ${body.guesstimate.map((q) => n(q.players)).join('/')} players · top answers ${n(body.topAnswers?.answers)} answers · hot takes ${n(body.hotTakes[0]?.players)}`);
console.log(`  doodle ${n(body.doodle?.players)} · word climb ${n(body.wordClimb?.players)} · secret word ${n(body.secretWord?.players)} · words from ${n(body.wordsFrom?.players)}`);
