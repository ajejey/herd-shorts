#!/usr/bin/env node
/*
  Write a template's index.html: its variables (defaults from a real day), one
  scene, and the sound plan every Herd Short shares, timed from the format's
  beat clock T (exported by its pipeline/formats/<dir>.mjs):

    music     the format's bed from frame 0, ducked under the countdown, out for
              the held breath before the reveal, back up on the reveal
    countdown a beep on each number, a tick on each half, a rumbling roll under it
    reveal    fanfare + crowd cheer + a hit; the sting gets a crowd "ooh"; the
              question a sheep; the play banner a whoosh and a pop; the rewind a whoosh
    extras    the format's own sounds (pipeline/formats/<dir>.sounds.html, optional)

    node pipeline/make-root.mjs <dir> <day> <music.mp3> [labels.json]
*/
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, FORMATS, variety, VARIETY_DECL } from './lib.mjs';

const [dir, day, musicArg, labelsFile] = process.argv.slice(2);
const formatKey = Object.keys(FORMATS).find((k) => FORMATS[k] === dir);
const mod = await import(pathToFileURL(path.join(ROOT, 'pipeline', 'formats', `${dir}.mjs`)).href);
const T = mod.T;
const values = { ...mod.vars(JSON.parse(fs.readFileSync(path.join(ROOT, 'data', `${day}.json`), 'utf8')), {}), ...variety(formatKey, Number(day)) };
const music = musicArg && musicArg !== '-' ? musicArg : `${values.music}.mp3`;
const labels = labelsFile ? JSON.parse(fs.readFileSync(labelsFile, 'utf8')) : {};
const decl = Object.entries(values).map(([id, def]) => {
  const d = { id, type: typeof def === 'number' ? 'number' : typeof def === 'boolean' ? 'boolean' : 'string', label: labels[id] || (VARIETY_DECL[id] && VARIETY_DECL[id].label) || id, default: def };
  if (VARIETY_DECL[id] && VARIETY_DECL[id].options) Object.assign(d, { type: 'enum', options: VARIETY_DECL[id].options.map((o) => ({ value: o, label: o })) });
  return `    ${JSON.stringify(d).replace(/&/g, '&amp;').replace(/'/g, '&#39;')}`;
}).join(',\n');

const f = (x) => Number(x.toFixed(3));
const M = `assets/shared/music/${music}`, S = (n) => `assets/shared/sfx/${n}.mp3`;
const a = (id, src, start, dur, track, vol, extra = '') => `      <audio id="${id}"${src === M ? ' data-music="1"' : ''} class="clip" src="${src}" data-start="${f(start)}"${extra} data-duration="${f(dur)}" data-track-index="${track}" data-volume="${vol}"></audio>`;
const lines = [];
const duckEnd = T.count + 3;
// Music: up, ducked for the countdown, (up again if there is a stretch before the reveal), out for the held breath, up on the reveal
lines.push(a('mus-a', M, 0, T.count, 30, 0.55, ''), );
lines[lines.length - 1] = lines[lines.length - 1].replace('></audio>', ' data-fade-out="0.12"></audio>');
if (duckEnd < T.reveal - 0.4) {
  lines.push(a('mus-b', M, T.count, 3, 31, 0.22, ` data-media-start="${f(T.count)}"`).replace('></audio>', ' data-fade-in="0.1" data-fade-out="0.1"></audio>'));
  lines.push(a('mus-c', M, duckEnd, T.reveal - 0.15 - duckEnd, 33, 0.45, ` data-media-start="${f(duckEnd)}"`).replace('></audio>', ' data-fade-in="0.1" data-fade-out="0.1"></audio>'));
} else {
  lines.push(a('mus-b', M, T.count, T.reveal - 0.15 - T.count, 31, 0.22, ` data-media-start="${f(T.count)}"`).replace('></audio>', ' data-fade-in="0.1" data-fade-out="0.1"></audio>'));
}
lines.push(a('mus-d', M, T.reveal, T.end - T.reveal, 32, 0.55, ` data-media-start="${f(T.reveal)}"`).replace('></audio>', ' data-fade-out="0.35"></audio>'));
// Countdown
[0, 1, 2].forEach((i) => lines.push(a(`snd-beep${3 - i}`, S('beep-1'), T.count + i, 0.67, 12, i === 2 ? 0.6 : 0.55)));
lines.push(a('snd-tick1', S('tick-1'), T.count + 0.5, 0.443, 13, 0.6));
lines.push(a('snd-tick2', S('tick-2'), T.count + 1.5, 0.103, 13, 0.6));
lines.push(a('snd-tick3', S('tick-1'), T.count + 2.5, 0.443, 13, 0.6));
const build = T.reveal - 3.25;
lines.push(a('snd-build', S('build-1'), build, Math.min(3.15, T.reveal - build), 14, 0.35).replace('></audio>', ' data-fade-out="0.1"></audio>'));
// Reveal and after
lines.push(a('snd-tada', S('tada-1'), T.reveal, 1.696, 15, 0.8));
lines.push(a('snd-cheer', S('cheer-2'), T.reveal + 0.05, 2.9, 16, 0.5));
lines.push(a('snd-hit', S('impact-1'), T.reveal, 0.456, 17, 0.5));
lines.push(a('snd-ooh', S('ooh-1'), T.sting, 2.869, 18, 0.65));
lines.push(a('snd-baa', S('baa-2'), T.ask + 0.02, 1.095, 19, 0.6));
lines.push(a('snd-play', S('whoosh-1'), T.play, 0.426, 20, 0.45));
lines.push(a('snd-play-pop', S('pop-3'), T.play + 0.75, 0.155, 22, 0.6));
lines.push(a('snd-rewind', S('whoosh-3'), T.rewind, 0.437, 21, 0.5));
const extrasFile = path.join(ROOT, 'pipeline', 'formats', `${dir}.sounds.html`);
const extras = fs.existsSync(extrasFile) ? fs.readFileSync(extrasFile, 'utf8').trimEnd() : '';
const scene = mod.SCENE || 'scene';

fs.writeFileSync(path.join(ROOT, 'templates', dir, 'index.html'), `<!doctype html>
<html
  lang="en"
  data-resolution="portrait"
  data-composition-variables='[
${decl}
  ]'
>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      @font-face { font-family: "Fredoka"; src: url("assets/fonts/fredoka.woff2") format("woff2"); font-weight: 300 700; font-display: block; }
      @font-face { font-family: "Quicksand"; src: url("assets/fonts/quicksand.woff2") format("woff2"); font-weight: 300 700; font-display: block; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #E9F4E8; }
      #root { position: relative; width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${T.end}" data-width="1080" data-height="1920">
      <div id="${scene}" data-composition-id="${scene}" data-composition-src="compositions/${scene}.html"
        data-start="0" data-duration="${T.end}" data-track-index="1" data-track-kind="graphics"
        data-width="1080" data-height="1920" style="z-index: 1"></div>

      <!-- Sound (strategy/PRINCIPLES.md rule 6), written by pipeline/make-root.mjs from the format's beat clock -->
${lines.join('\n')}
${extras}
    </div>
    <script src="assets/herd.js"></script>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`);
console.log(`wrote templates/${dir}/index.html (${T.end}s, ${Object.keys(values).length} variables, ${lines.length} shared sounds${extras ? ' + extras' : ''})`);
