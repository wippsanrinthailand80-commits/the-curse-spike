import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ensureStorage } from '../src/storage.js';
import { ensureGitRepo } from '../src/git.js';

export function makeHome(): string {
  const home = mkdtempSync(path.join(tmpdir(), 'curse-'));
  process.env.CURSE_SPIKE_HOME = home;
  ensureStorage();
  ensureGitRepo();
  return home;
}