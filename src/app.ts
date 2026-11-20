import fs from 'node:fs';
import { Registry } from './registry.js';
import { paths, ensureStorage } from './storage.js';
import { ensureGitRepo } from './git.js';
import { purgeExpired } from './briefing.js';

export interface App {
  registry: Registry;
  config: any;
}

export function createApp(): App {
  ensureStorage();
  ensureGitRepo();
  purgeExpired();
  const registry = new Registry();
  registry.loadAll();
  registry.startWatch();
  const config = JSON.parse(fs.readFileSync(paths().config, 'utf8'));
  return { registry, config };
}

export function reloadConfig(app: App): void {
  try { app.config = JSON.parse(fs.readFileSync(paths().config, 'utf8')); } catch {}
}