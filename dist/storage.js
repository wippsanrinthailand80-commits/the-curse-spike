import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
export function homeDir() {
    return process.env.CURSE_SPIKE_HOME || path.join(os.homedir(), '.curse-spike');
}
export function paths() {
    const home = homeDir();
    return {
        home,
        skills: path.join(home, 'skills'),
        logs: path.join(home, 'logs'),
        briefings: path.join(home, 'briefings'),
        secrets: path.join(home, 'secrets.json'),
        config: path.join(home, 'config.json'),
        stats: path.join(home, 'stats.json'),
        gitMarker: path.join(home, 'skills', '.git'),
    };
}
export function ensureStorage() {
    const p = paths();
    for (const d of [p.home, p.skills, p.logs, p.briefings]) {
        fs.mkdirSync(d, { recursive: true });
    }
    if (!fs.existsSync(p.config)) {
        fs.writeFileSync(p.config, JSON.stringify({ sprayMaxDepth: 2, briefingTtlMs: 3600000, briefingMaxPerHour: 20, briefingMaxSkills: 5, briefingMaxSummaryChars: 4000, runTimeoutMs: 30000, runMaxOutputBytes: 65536 }, null, 2));
    }
    if (!fs.existsSync(p.stats)) {
        fs.writeFileSync(p.stats, JSON.stringify({ skills: {}, sprays: 0, briefingsCreated: 0 }, null, 2));
    }
    if (!fs.existsSync(p.secrets)) {
        fs.writeFileSync(p.secrets, JSON.stringify({}, null, 2));
        try {
            fs.chmodSync(p.secrets, 0o600);
        }
        catch { }
    }
}
export function readJson(file, fallback) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    catch {
        return fallback;
    }
}
export function writeJson(file, obj) {
    fs.writeFileSync(file, JSON.stringify(obj, null, 2));
}
export function bundledSkillsDir() {
    // relative to compiled dist: ../skills-bundled or src/../skills-bundled
    const candidates = [
        path.resolve(process.cwd(), 'skills-bundled'),
        path.resolve(new URL('.', import.meta.url).pathname, '..', 'skills-bundled'),
        path.resolve(new URL('.', import.meta.url).pathname, '..', '..', 'skills-bundled'),
    ];
    for (const c of candidates)
        if (fs.existsSync(c))
            return c;
    return candidates[1];
}
//# sourceMappingURL=storage.js.map