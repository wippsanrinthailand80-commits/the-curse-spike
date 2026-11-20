import fs from 'node:fs';
import { Registry } from './registry.js';
import { paths, ensureStorage } from './storage.js';
import { ensureGitRepo } from './git.js';
import { purgeExpired } from './briefing.js';
import { OllamaSearchProvider } from './search.js';
import { initProxy } from './proxy.js';

export interface App {
  registry: Registry;
  config: any;
}

export function createApp(): App {
  ensureStorage();
  ensureGitRepo();
  purgeExpired();
  const config = JSON.parse(fs.readFileSync(paths().config, 'utf8'));
  const registry = new Registry();
  registry.loadAll();
  const ss = (config as any)?.semanticSearch;
  if (ss && ss.provider === 'ollama' && ss.url && ss.model) {
    registry.searchProvider = new OllamaSearchProvider(ss.url, ss.model);
  }
  registry.startWatch();
  initProxy({ servers: (config as any)?.mcpServers }).catch(() => {});
  return { registry, config };
}

export function reloadConfig(app: App): void {
  try { app.config = JSON.parse(fs.readFileSync(paths().config, 'utf8')); } catch {}
}