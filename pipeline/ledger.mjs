/*
  ledger/videos.jsonl: one row per video, sorted by id (<date>-<format letter>).
  daily.mjs writes the row at render; the posters add `posts.<platform>`; the
  collectors add `metrics.<platform>`.
*/
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.mjs';

export const LEDGER = path.join(ROOT, 'ledger', 'videos.jsonl');

export const readLedger = () => (fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);

function save(rows) {
  rows.sort((a, b) => (a.id < b.id ? -1 : 1));
  fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
  fs.writeFileSync(LEDGER, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
}

export function writeLedgerRow(row) {
  save([...readLedger().filter((r) => r.id !== row.id), row]);
}

/* Change one row in place; throws when the id is not in the ledger. */
export function updateLedgerRow(id, change) {
  const rows = readLedger();
  const row = rows.find((r) => r.id === id);
  if (!row) throw new Error(`no ledger row ${id}`);
  change(row);
  save(rows);
  return row;
}

export const findRow = (id) => readLedger().find((r) => r.id === id) || null;

/* The latest rendered row, for "post today's video" without an id. */
export const latestRow = () => readLedger().filter((r) => r.file).pop() || null;
