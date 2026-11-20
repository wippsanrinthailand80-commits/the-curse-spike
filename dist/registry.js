import fs from 'node:fs';
import path from 'node:path';
import chokidar from 'chokidar';
import { paths, readJson, writeJson, bundledSkillsDir } from './storage.js';
import { loadSkillFromDir } from './skillparse.js';
import { KeywordSearchProvider } from './search.js';
export class Registry {
    skills = new Map();
    stats = { skills: {}, sprays: 0, briefingsCreated: 0 };
    searchProvider = new KeywordSearchProvider();
    watcher;
    loadAll() {
        this.skills.clear();
        const bundled = bundledSkillsDirSafe();
        if (fs.existsSync(bundled))
            loadDir(bundled, true, this.skills);
        const user = paths().skills;
        if (fs.existsSync(user))
            loadDir(user, false, this.skills);
        this.stats = readJson(paths().stats, { skills: {}, sprays: 0, briefingsCreated: 0 });
    }
    startWatch() {
        const dirs = [paths().skills];
        const b = bundledSkillsDirSafe();
        // don't watch bundled (read-only)
        this.watcher = chokidar.watch(dirs, { ignoreInitial: true, depth: 3 });
        this.watcher.on('all', () => this.loadAll());
    }
    stopWatch() { this.watcher?.close(); }
    get(name) { return this.skills.get(name); }
    listSorted(prefix, includePending = false) {
        let arr = [...this.skills.values()];
        if (!includePending)
            arr = arr.filter(s => s.status === 'active');
        if (prefix)
            arr = arr.filter(s => s.name.startsWith(prefix));
        arr.sort((a, b) => a.name.localeCompare(b.name));
        return arr;
    }
    search(query) {
        const q = query.toLowerCase().trim();
        const terms = q.split(/\s+/).filter(Boolean);
        const scored = [];
        for (const s of this.skills.values()) {
            if (s.status !== 'active')
                continue; // search default active? search_skills probably all? spec says scope enforcement. We'll filter active in search tool optionally. Keep base search active-only.
            const hay = (s.name + ' ' + s.description).toLowerCase();
            let rel = 0;
            for (const t of terms)
                if (hay.includes(t))
                    rel += 1;
            if (terms.length === 0)
                rel = 1;
            if (rel === 0 && terms.length > 0)
                continue;
            const st = this.stats.skills[s.name] || { runs: 0, successes: 0, failures: 0 };
            const total = st.successes + st.failures;
            const successRate = total > 0 ? st.successes / total : 0.5;
            const usageBoost = Math.log1p(st.runs) * 0.5;
            const score = rel + usageBoost + successRate * 0.5;
            scored.push({ skill: s, score });
        }
        scored.sort((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name));
        return scored.map(x => x.skill);
    }
    // ranking interface for semantic plug-in later
    rank(query, limit) {
        return this.search(query).slice(0, limit);
    }
    async searchAsync(query) {
        const active = [...this.skills.values()].filter(s => s.status === 'active');
        const ranked = await this.searchProvider.rank(query || '', active, this.stats.skills || {});
        return ranked;
    }
    recordRun(name, success) {
        if (!this.stats.skills[name])
            this.stats.skills[name] = { runs: 0, successes: 0, failures: 0 };
        const st = this.stats.skills[name];
        st.runs += 1;
        if (success)
            st.successes += 1;
        else
            st.failures += 1;
        st.lastUsed = new Date().toISOString();
        writeJson(paths().stats, this.stats);
    }
    recordSpray() { this.stats.sprays = (this.stats.sprays || 0) + 1; writeJson(paths().stats, this.stats); }
    recordBriefing() { this.stats.briefingsCreated = (this.stats.briefingsCreated || 0) + 1; writeJson(paths().stats, this.stats); }
    failures() {
        const out = [];
        for (const [name, st] of Object.entries(this.stats.skills)) {
            if (st.failures >= 2 || (st.runs >= 3 && st.successes / Math.max(1, st.runs) < 0.5)) {
                out.push({ name, stats: st });
            }
        }
        out.sort((a, b) => b.stats.failures - a.stats.failures);
        return out;
    }
}
function bundledSkillsDirSafe() {
    return bundledSkillsDir();
}
function loadDir(dir, bundled, map) {
    let entries = [];
    try {
        entries = fs.readdirSync(dir);
    }
    catch {
        return;
    }
    for (const e of entries) {
        const full = path.join(dir, e);
        let st;
        try {
            st = fs.statSync(full);
        }
        catch {
            continue;
        }
        if (!st.isDirectory())
            continue;
        if (e.startsWith('.'))
            continue;
        const skill = loadSkillFromDir(full, bundled);
        if (skill)
            map.set(skill.name, skill);
    }
}
//# sourceMappingURL=registry.js.map