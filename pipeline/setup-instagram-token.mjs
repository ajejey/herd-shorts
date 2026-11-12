/*
  One-time: turn a token from Meta's Graph API Explorer into the never-expiring
  Page token the poster needs, find the Instagram account id, and store both as
  GitHub secrets. Run it in YOUR OWN terminal (not through Claude): the token
  and app secret are typed into hidden prompts, go only to Meta and to `gh`,
  and are never printed.

    node pipeline/setup-instagram-token.mjs

  It asks for:
    App ID          developers.facebook.com > the Herd Shorts app > App settings > Basic
    App secret      same page, "Show" (Meta asks for your password)
    User token      Graph API Explorer, the Herd Shorts app selected, "Generate Access Token"

  Then: short-lived user token -> long-lived user token (60 days) -> the Page's
  token from it (no expiry) -> the Instagram account linked to that Page ->
  gh secret set IG_ACCESS_TOKEN and IG_USER_ID on ajejey/herd-shorts.
*/
import readline from 'node:readline';
import { spawnSync } from 'node:child_process';

const GRAPH = `https://graph.facebook.com/${process.env.GRAPH_VERSION || 'v25.0'}`;
const REPO = 'ajejey/herd-shorts';

function ask(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); };
    }
    rl.question(question, (answer) => { rl.close(); if (hidden) process.stdout.write('\n'); resolve(answer.trim()); });
  });
}

const secrets = [];
const scrub = (s) => secrets.reduce((acc, x) => (x ? acc.split(x).join('[hidden]') : acc), String(s));

async function graph(pathname, params) {
  const url = new URL(`${GRAPH}/${pathname}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) throw new Error(scrub(`${pathname}: ${body.error?.message || res.status}`));
  return body;
}

function setSecret(name, value) {
  const r = spawnSync('gh', ['secret', 'set', name, '-R', REPO], { input: value, encoding: 'utf8', stdio: ['pipe', 'ignore', 'pipe'] });
  if (r.status !== 0) throw new Error(scrub(`gh secret set ${name} failed: ${r.stderr || r.error?.message || r.status}`));
}

async function main() {
  const appId = await ask('App ID: ');
  const appSecret = await ask('App secret (hidden): ', true);
  const shortToken = await ask('User token from Graph API Explorer (hidden): ', true);
  secrets.push(appSecret, shortToken);
  if (!/^\d+$/.test(appId) || !appSecret || !shortToken) throw new Error('all three are needed');

  const long = await graph('oauth/access_token', { grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret, fb_exchange_token: shortToken });
  secrets.push(long.access_token);
  const pages = await graph('me/accounts', { access_token: long.access_token, fields: 'id,name,access_token,instagram_business_account{id,username}' });
  for (const p of pages.data || []) secrets.push(p.access_token);
  const linked = (pages.data || []).filter((p) => p.instagram_business_account);
  if (!linked.length) {
    throw new Error(`no Page with a linked Instagram account. Pages this token sees: ${(pages.data || []).map((p) => p.name).join(', ') || 'none'} (link the Instagram account to the Page, and tick the Page when Meta asks)`);
  }
  let page = linked[0];
  if (linked.length > 1) {
    linked.forEach((p, i) => console.log(`  ${i + 1}. ${p.name} -> @${p.instagram_business_account.username}`));
    const pick = Number(await ask('Which one? '));
    page = linked[pick - 1];
    if (!page) throw new Error('no such choice');
  }
  const ig = page.instagram_business_account;
  /* A Page token from a long-lived user token does not expire; confirm before storing it. */
  const debug = await graph('debug_token', { input_token: page.access_token, access_token: `${appId}|${appSecret}` });
  const expires = debug.data?.expires_at;
  setSecret('IG_ACCESS_TOKEN', page.access_token);
  setSecret('IG_USER_ID', ig.id);
  console.log(`Stored for ${REPO}: IG_ACCESS_TOKEN (Page "${page.name}", ${expires ? `expires ${new Date(expires * 1000).toISOString().slice(0, 10)}` : 'never expires'}) and IG_USER_ID (@${ig.username}, ${ig.id}).`);
  console.log(`Scopes on it: ${(debug.data?.scopes || []).join(', ')}`);
}

main().catch((err) => { console.error(`Stopped: ${scrub(err.message)}`); process.exit(1); });
