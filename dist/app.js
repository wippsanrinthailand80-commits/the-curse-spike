import fs from 'node:fs';
import { Registry } from './registry.js';
import { paths, ensureStorage } from './storage.js';
import { ensureGitRepo } from './git.js';
import { purgeExpired } from './briefing.js';
export function createApp() {
    ensureStorage();
    ensureGitRepo();
    purgeExpired();
    const registry = new Registry();
    registry.loadAll();
    registry.startWatch();
    const config = JSON.parse(fs.readFileSync(paths().config, 'utf8'));
    return { registry, config };
}
export function reloadConfig(app) {
    try {
        app.config = JSON.parse(fs.readFileSync(paths().config, 'utf8'));
    }
    catch { }
}
//# sourceMappingURL=app.js.map