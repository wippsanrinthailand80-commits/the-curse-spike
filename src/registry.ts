import fs from 'node:fs';
import path from 'node:path';
import chokidar from 'chokidar';
import { Skill, SkillStats, StatsFile } from './types.js';
import { paths, readJson, writeJson, bundledSkillsDir } from './storage.js';
import { loadSkillFromDir } from './skillparse.js';

export class Registry {
  skills = new Map<string, Skill>();
  stats: StatsFile = { skills: {}, sprays: 0, briefingsCreated: 0 };
  private watcher?: any;

  loadAll(): void {
    this.skills.clear();
    const bundled = bundledSkillsDirSafe();
    if (fs.existsSync(bundled)) loadDir(bundled, true, this.skills);
    const user = paths().skills;
    if (fs.existsSync(user)) loadDir(user, false, this.skills);
    this.stats = readJson<StatsFile>(paths().stats, { skills: {}, sprays: 0, briefingsCreated: 0 });
  }

  startWatch(): void {
    const dirs = [paths().skills];
    const b = bundledSkillsDirSafe();
    // don't watch bundled (read-only)
    this.watcher = chokidar.watch(dirs, { ignoreInitial: true, depth: 3 });
    this.watcher.on('all', () => this.loadAll());
  }

  stopWatch(): void { this.watcher?.close(); }

  get(name: string): Skill | undefined { return this.skills.get(name); }

  listSorted(prefix?: string, includePending = false): Skill[] {
    let arr = [...this.skills.values()];
    if (!includePending) arr = arr.filter(s => s.status === 'active');
    if (prefix) arr = arr.filter(s => s.name.startsWith(prefix));
    arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }

  search(query: string): Skill[] {
    const q = query.toLowerCase().trim();
    const terms = q.split(/\s+/).filter(Boolean);
    const scored: { skill: Skill; score: number }[] = [];
    for (const s of this.skills.values()) {
      if (s.status !== 'active') continue; // search default active? search_skills probably all? spec says scope enforcement. We'll filter active in search tool optionally. Keep base search active-only.
      const hay = (s.name + ' ' + s.description).toLowerCase();
      let rel = 0;
      for (const t of terms) if (hay.includes(t)) rel += 1;
      if (terms.length === 0) rel = 1;
      if (rel === 0 && terms.length > 0) continue;
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
  rank(query: string, limit?: number): Skill[] {
    return this.search(query).slice(0, limit);
  }

  recordRun(name: string, success: boolean): void {
    if (!this.stats.skills[name]) this.stats.skills[name] = { runs: 0, successes: 0, failures: 0 };
    const st = this.stats.skills[name];
    st.runs += 1;
    if (success) st.successes += 1; else st.failures += 1;
    st.lastUsed = new Date().toISOString();
    writeJson(paths().stats, this.stats);
  }

  recordSpray(): void { this.stats.sprays = (this.stats.sprays || 0) + 1; writeJson(paths().stats, this.stats); }
  recordBriefing(): void { this.stats.briefingsCreated = (this.stats.briefingsCreated || 0) + 1; writeJson(paths().stats, this.stats); }

  failures(): { name: string; stats: SkillStats }[] {
    const out: { name: string; stats: SkillStats }[] = [];
    for (const [name, st] of Object.entries(this.stats.skills)) {
      if (st.failures >= 2 || (st.runs >= 3 && st.successes / Math.max(1, st.runs) < 0.5)) {
        out.push({ name, stats: st });
      }
    }
    out.sort((a, b) => b.stats.failures - a.stats.failures);
    return out;
  }
}

function bundledSkillsDirSafe(): string {
  return bundledSkillsDir();
}

function loadDir(dir: string, bundled: boolean, map: Map<string, Skill>): void {
  let entries: string[] = [];
  try { entries = fs.readdirSync(dir); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e);
    let st; try { st = fs.statSync(full); } catch { continue; }
    if (!st.isDirectory()) continue;
    if (e.startsWith('.')) continue;
    const skill = loadSkillFromDir(full, bundled);
    if (skill) map.set(skill.name, skill);
  }
}