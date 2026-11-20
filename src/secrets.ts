import fs from 'node:fs';
import { paths, readJson, writeJson } from './storage.js';

export function loadSecrets(): Record<string, string> {
  return readJson<Record<string, string>>(paths().secrets, {});
}

export function setSecret(name: string, value: string): void {
  const s = loadSecrets();
  s[name] = value;
  writeJson(paths().secrets, s);
  try { fs.chmodSync(paths().secrets, 0o600); } catch {}
}

export function getSecretNames(): string[] {
  return Object.keys(loadSecrets());
}

export function resolveSecrets(names: string[]): Record<string, string> {
  const s = loadSecrets();
  const out: Record<string, string> = {};
  for (const n of names) if (s[n] !== undefined) out[n] = s[n];
  return out;
}

export function redact(text: string): string {
  const s = loadSecrets();
  let out = text;
  for (const v of Object.values(s)) {
    if (v && v.length > 0) out = out.split(v).join('[REDACTED]');
  }
  return out;
}

export function containsSecret(text: string): boolean {
  const s = loadSecrets();
  return Object.values(s).some(v => v && v.length > 0 && text.includes(v));
}