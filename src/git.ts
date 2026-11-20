import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { paths } from './storage.js';

function git(args: string[], cwd: string): { ok: boolean; out: string } {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return { ok: r.status === 0, out: (r.stdout || '') + (r.stderr || '') };
}

export function ensureGitRepo(): void {
  const dir = paths().skills;
  if (!fs.existsSync(path.join(dir, '.git'))) {
    git(['init'], dir);
    git(['config', 'user.email', 'curse-spike@local'], dir);
    git(['config', 'user.name', 'curse-spike'], dir);
    // initial commit if any files
    git(['add', '-A'], dir);
    git(['commit', '-m', 'init'], dir);
  }
}

export function gitCommit(message: string): string {
  const dir = paths().skills;
  git(['add', '-A'], dir);
  const r = git(['commit', '-m', message], dir);
  // get sha
  const sha = git(['rev-parse', 'HEAD'], dir);
  return sha.ok ? sha.out.trim() : '';
}

export function rollbackSkill(name: string, commit?: string): { ok: boolean; out: string } {
  const dir = paths().skills;
  const target = commit || 'HEAD~1';
  // revert a single path
  const r = git(['checkout', target, '--', name], dir);
  if (r.ok) gitCommit(`rollback ${name} to ${target}`);
  return r;
}

export function gitLog(name?: string): string {
  const dir = paths().skills;
  const args = name ? ['log', '--oneline', '--', name] : ['log', '--oneline', '-20'];
  return git(args, dir).out;
}