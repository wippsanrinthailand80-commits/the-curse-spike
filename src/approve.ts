import fs from 'node:fs';
import path from 'node:path';
import { App } from './app.js';
import { Skill } from './types.js';
import { parseFrontmatter, serializeSkill } from './skillparse.js';
import { runSkill } from './runner.js';
import { resolveSecrets } from './secrets.js';
import { gitCommit } from './git.js';
import { createApp } from './app.js';
import { rollbackSkill } from './git.js';

export interface TestResult { passed: boolean; details: string; }

export async function runTests(skill: Skill): Promise<TestResult> {
  if (!skill.tests || skill.tests.length === 0) {
    return { passed: true, details: 'no tests declared' };
  }
  const secrets = resolveSecrets(skill.secrets || []);
  let allPassed = true;
  const details: string[] = [];
  for (const t of skill.tests) {
    let input: unknown = {};
    let expected: unknown = undefined;
    if (typeof t === 'string') { details.push('string test skipped'); continue; }
    if (t && typeof t === 'object') {
      input = (t as any).input ?? {};
      expected = (t as any).expected;
    }
    const res = await runSkill(skill, input, { timeoutMs: 15000, maxOutputBytes: 65536, secrets });
    if (!res.success) { allPassed = false; details.push(`FAIL run: ${res.stderr || res.stdout}`); continue; }
    // compare
    const out = res.stdout.trim();
    let ok = false;
    if (expected === undefined) ok = true;
    else if (typeof expected === 'string') ok = out === expected.trim() || out.includes(expected);
    else {
      try { ok = JSON.stringify(JSON.parse(out)) === JSON.stringify(expected); } catch { ok = out === String(expected); }
    }
    if (!ok) allPassed = false;
    details.push(ok ? `PASS` : `FAIL expected=${JSON.stringify(expected)} got=${out.slice(0,200)}`);
  }
  return { passed: allPassed, details: details.join('; ') };
}

export async function performApprove(skill: Skill, app: App): Promise<{ ok: boolean; message: string }> {
  // tests
  const tr = await runTests(skill);
  if (!tr.passed) return { ok: false, message: `tests failed: ${tr.details}` };
  // update status in SKILL.md
  const raw = fs.readFileSync(path.join(skill.dir, 'SKILL.md'), 'utf8');
  const { fm, body } = parseFrontmatter(raw);
  fm.status = 'active';
  if (fm.provenance === 'untrusted') {
    // keep provenance marker
  }
  fs.writeFileSync(path.join(skill.dir, 'SKILL.md'), serializeSkill(fm, body));
  gitCommit(`approve ${skill.name}`);
  app.registry.loadAll();
  return { ok: true, message: `approved ${skill.name}` };
}

export function approveSkillCli(name?: string): Promise<string> {
  if (!name) return Promise.resolve('usage: curse-spike approve <name>');
  const app = createApp();
  const skill = app.registry.get(name);
  if (!skill) return Promise.resolve('not found: ' + name);
  if (skill.bundled) return Promise.resolve('cannot approve bundled skill');
  return performApprove(skill, app).then(r => r.ok ? 'OK ' + r.message : 'FAIL ' + r.message);
}

export function rollbackSkillCli(name?: string, commit?: string): Promise<string> {
  if (!name) return Promise.resolve('usage: curse-spike rollback <name> [commit]');
  const r = rollbackSkill(name, commit);
  return Promise.resolve(r.ok ? 'OK rolled back ' + name : 'FAIL ' + r.out);
}