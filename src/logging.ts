import fs from 'node:fs';
import path from 'node:path';
import { paths } from './storage.js';
import { redact } from './secrets.js';

export function logRun(entry: Record<string, unknown>): void {
  const date = new Date().toISOString().slice(0, 10);
  const file = path.join(paths().logs, `runs-${date}.jsonl`);
  const safe = { ...entry };
  for (const k of Object.keys(safe)) {
    if (typeof safe[k] === 'string') safe[k] = redact(safe[k] as string);
    else if (k === 'args') safe[k] = redact(JSON.stringify(safe[k]));
  }
  fs.appendFileSync(file, JSON.stringify(safe) + '\n');
}

export function logSpray(entry: Record<string, unknown>): void {
  const date = new Date().toISOString().slice(0, 10);
  const file = path.join(paths().logs, `spray-${date}.jsonl`);
  const safe = { ...entry };
  for (const k of Object.keys(safe)) {
    if (typeof safe[k] === 'string') safe[k] = redact(safe[k] as string);
  }
  fs.appendFileSync(file, JSON.stringify(safe) + '\n');
}