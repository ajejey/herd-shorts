/*
  One-time: let the pipeline upload to the Herd Games YouTube channel. Run it in YOUR OWN
  terminal (not through Claude): the client secret goes into a hidden prompt, the tokens go only
  to Google and to `gh`, and nothing secret is printed.

    node pipeline/setup-youtube-token.mjs

  1. Paste the Client ID and Client secret from Google Cloud (project Herd Shorts > Google Auth
     Platform > Clients > Herd Shorts uploader).
  2. Your browser opens Google's consent page. Choose the HERD GAMES channel (not your personal
     one). Google warns "Google hasn't verified this app": Advanced > Go to Herd Shorts. Allow.
  3. It checks which channel it got, then stores YT_CLIENT_ID, YT_CLIENT_SECRET and
     YT_REFRESH_TOKEN as secrets on ajejey/herd-shorts.
*/
import http from 'node:http';
import readline from 'node:readline';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';

const REPO = 'ajejey/herd-shorts';
const SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'];

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); });
  });
}

/* Echoes nothing, pasted text included (raw mode; see setup-instagram-token.mjs). */
function askHidden(question) {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    stdout.write(question);
    if (!stdin.isTTY) { reject(new Error('run this in a terminal, so the secret can be typed without being shown')); return; }
    let value = '';
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const done = (err) => { stdin.setRawMode(false); stdin.pause(); stdin.removeListener('data', onData); stdout.write('\n'); if (err) reject(err); else resolve(value.trim()); };
    function onData(chunk) {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') return done();
        if (ch === '\u0003') return done(new Error('cancelled'));
        if (ch === '\u0008' || ch === '\u007f') value = value.slice(0, -1);
        else if (ch >= ' ') value += ch;
      }
      return undefined;
    }
    stdin.on('data', onData);
  });
}

const secrets = [];
const scrub = (s) => secrets.reduce((acc, x) => (x ? acc.split(x).join('[hidden]') : acc), String(s));

/* Opens the consent page without a shell: through cmd, every & in the address ends the command
   (12 Nov 2026: Google got only client_id and answered "response_type is missing"). */
function openBrowser(url) {
  const [cmd, args] = process.platform === 'win32' ? ['rundll32', ['url.dll,FileProtocolHandler', url]]
    : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  try { spawn(cmd, args, { stdio: 'ignore', detached: true, shell: false }).unref(); } catch { /* the link is printed too */ }
}

/* Google's loopback flow: a one-shot server on 127.0.0.1 receives the code. Resolves once it is
   listening, with its address and a promise of the code. */
function startLoopback(state) {
  return new Promise((ready, fail) => {
    let gotCode;
    let lost;
    const code = new Promise((resolve, reject) => { gotCode = resolve; lost = reject; });
    const server = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://127.0.0.1');
      if (u.pathname !== '/') { res.writeHead(404).end(); return; }
      const ok = u.searchParams.get('state') === state && u.searchParams.get('code');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(ok ? '<h2>Done. You can close this tab and go back to the terminal.</h2>' : '<h2>That did not work. Go back to the terminal.</h2>');
      server.close();
      if (ok) gotCode(u.searchParams.get('code'));
      else lost(new Error(`consent did not complete: ${u.searchParams.get('error') || 'no code'}`));
    });
    server.on('error', fail);
    server.listen(0, '127.0.0.1', () => ready({ redirect: `http://127.0.0.1:${server.address().port}`, code }));
    setTimeout(() => { server.close(); lost(new Error('no answer from the browser within 5 minutes')); }, 300000).unref();
  });
}

function setSecret(name, value) {
  const r = spawnSync('gh', ['secret', 'set', name, '-R', REPO], { input: value, encoding: 'utf8', stdio: ['pipe', 'ignore', 'pipe'] });
  if (r.status !== 0) throw new Error(scrub(`gh secret set ${name} failed: ${r.stderr || r.error?.message || r.status}`));
}

async function main() {
  const clientId = await ask('Client ID: ');
  const clientSecret = await askHidden('Client secret (hidden, nothing shows as you type or paste): ');
  secrets.push(clientSecret);
  if (!/\.apps\.googleusercontent\.com$/.test(clientId) || !clientSecret) throw new Error('both are needed (the Client ID ends in .apps.googleusercontent.com)');

  const state = crypto.randomBytes(16).toString('hex');
  const { redirect, code: codePromise } = await startLoopback(state);
  const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  auth.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirect, response_type: 'code', scope: SCOPES.join(' '), access_type: 'offline', prompt: 'consent', state }).toString();
  console.log('Opening Google in your browser. Choose the HERD GAMES channel, then Allow.');
  console.log(`If no browser opens, open this link yourself:
${auth.toString()}
`);
  openBrowser(auth.toString());
  const code = await codePromise;
  secrets.push(code);

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirect, grant_type: 'authorization_code' }),
  });
  const tokens = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokens.refresh_token) throw new Error(scrub(`token exchange failed: ${tokens.error_description || tokens.error || tokenRes.status}${tokens.access_token && !tokens.refresh_token ? ' (no refresh token: remove Herd Shorts at myaccount.google.com/permissions and run again)' : ''}`));
  secrets.push(tokens.refresh_token, tokens.access_token);

  const ch = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', { headers: { Authorization: `Bearer ${tokens.access_token}` } }).then((r) => r.json());
  const channel = ch.items && ch.items[0];
  if (!channel) throw new Error('Google returned no channel for that account: choose the Herd Games channel on the consent page and run again');
  const title = channel.snippet?.title || '';
  console.log(`Authorised for the channel "${title}" (${channel.id}).`);
  if (!/herd games/i.test(title)) {
    const go = await ask('That is not "Herd Games". Store it anyway? (y/N) ');
    if (!/^y/i.test(go)) throw new Error('stopped: run again and choose the Herd Games channel');
  }
  setSecret('YT_CLIENT_ID', clientId);
  setSecret('YT_CLIENT_SECRET', clientSecret);
  setSecret('YT_REFRESH_TOKEN', tokens.refresh_token);
  console.log(`Stored YT_CLIENT_ID, YT_CLIENT_SECRET and YT_REFRESH_TOKEN for ${REPO}.`);
}

main().catch((err) => { console.error(`Stopped: ${scrub(err.message)}`); process.exit(1); });
