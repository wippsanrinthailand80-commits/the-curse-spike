import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Skill } from './types.js';
import { paths } from './storage.js';
import { resolveSecrets } from './secrets.js';
import { Registry } from './registry.js';

export interface RunResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
  timedOut: boolean;
  truncated: boolean;
}

function findEntrypoint(skill: Skill): string | null {
  const dir = skill.dir;
  // frontmatter entrypoint
  const fm = skill as any;
  // check common
  const candidates: string[] = [];
  if ((skill as any).entrypoint) candidates.push(path.join(dir, (skill as any).entrypoint));
  for (const sub of ['scripts', '']) {
    for (const name of ['main', 'index', 'run']) {
      for (const ext of ['.ts', '.js', '.py', '.sh']) {
        candidates.push(path.join(dir, sub, name + ext));
      }
    }
  }
  // also any single file in scripts
  const scriptsDir = path.join(dir, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    const files = fs.readdirSync(scriptsDir).filter(f => !f.startsWith('.'));
    for (const f of files) candidates.push(path.join(scriptsDir, f));
  }
  // root files
  for (const f of fs.readdirSync(dir)) {
    if (f === 'SKILL.md') continue;
    const full = path.join(dir, f);
    try { if (fs.statSync(full).isFile()) candidates.push(full); } catch {}
  }
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

function interpreter(file: string): { cmd: string; args: string[] } {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.py') return { cmd: 'python3', args: [file] };
  if (ext === '.sh') return { cmd: 'bash', args: [file] };
  if (ext === '.ts') {
    const tsx = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
    // try resolve from package
    let tsxCli = tsx;
    try {
      // resolve relative to this module's package
      const req = (globalThis as any).require;
    } catch {}
    // fallback search
    const candidates = [
      path.resolve(new URL('.', import.meta.url).pathname, '..', 'node_modules', 'tsx', 'dist', 'cli.mjs'),
      path.resolve(new URL('.', import.meta.url).pathname, '..', '..', 'node_modules', 'tsx', 'dist', 'cli.mjs'),
      '/root/the-curse-spike/node_modules/tsx/dist/cli.mjs',
    ];
    for (const c of candidates) if (fs.existsSync(c)) { tsxCli = c; break; }
    return { cmd: process.execPath, args: [tsxCli, file] };
  }
  return { cmd: process.execPath, args: [file] };
}

export async function runSkill(skill: Skill, args: unknown, opts: { timeoutMs: number; maxOutputBytes: number; secrets: Record<string, string>; env?: Record<string, string> }): Promise<RunResult> {
  const entry = findEntrypoint(skill);
  if (!entry) {
    return { success: false, stdout: '', stderr: 'no entrypoint script found', exitCode: null, durationMs: 0, timedOut: false, truncated: false };
  }
  const { cmd, args: baseArgs } = interpreter(entry);
  const fullArgs = [...baseArgs];
  // pass args as env? We'll pass JSON via stdin and env SKILL_ARGS
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    LANG: process.env.LANG,
    ...opts.secrets,
    ...(opts.env || {}),
    SKILL_ARGS: JSON.stringify(args ?? {}),
    SKILL_NAME: skill.name,
    SKILL_DIR: skill.dir,
  };
  // restricted: no inherited env except above
  const start = Date.now();
  return new Promise((resolve) => {
    const child = spawn(cmd, fullArgs, { cwd: skill.dir, env, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let truncated = false;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, opts.timeoutMs);
    child.stdout.on('data', (d: Buffer) => {
      const s = d.toString();
      if (stdout.length + s.length > opts.maxOutputBytes) { truncated = true; stdout += s.slice(0, opts.maxOutputBytes - stdout.length); } else stdout += s;
    });
    child.stderr.on('data', (d: Buffer) => {
      const s = d.toString();
      if (stderr.length + s.length > opts.maxOutputBytes) { truncated = true; stderr += s.slice(0, opts.maxOutputBytes - stderr.length); } else stderr += s;
    });
    child.stdin.write(JSON.stringify(args ?? {}));
    child.stdin.end();
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ success: code === 0 && !timedOut, stdout, stderr, exitCode: code, durationMs: Date.now() - start, timedOut, truncated });
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ success: false, stdout, stderr: stderr + '\n' + String(err), exitCode: null, durationMs: Date.now() - start, timedOut, truncated });
    });
  });
}