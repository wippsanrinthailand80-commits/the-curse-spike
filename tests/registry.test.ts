import { describe, it, expect, beforeEach } from 'vitest';
import { makeHome } from './setup.js';
import { Registry } from '../src/registry.js';
import fs from 'node:fs';
import path from 'node:path';

describe('registry', () => {
  beforeEach(() => makeHome());

  it('loads bundled skills', () => {
    const r = new Registry();
    r.loadAll();
    expect(r.get('hello-world')).toBeTruthy();
    expect(r.get('skill-creator')).toBeTruthy();
  });

  it('list_sorted A-Z, prefix, pagination, pending hidden', () => {
    const home = process.env.CURSE_SPIKE_HOME!;
    const skillDir = path.join(home, 'skills', 'zebra-skill');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), `---\nname: zebra-skill\ndescription: "z"\npermissions:\n  - read\nstatus: pending\ntests: []\n---\nbody\n`);
    const r = new Registry();
    r.loadAll();
    const all = r.listSorted(undefined, false);
    expect(all.map(s => s.name)).toEqual([...all.map(s => s.name)].sort());
    expect(all.find(s => s.name === 'zebra-skill')).toBeUndefined(); // pending hidden
    const withPending = r.listSorted(undefined, true);
    expect(withPending.find(s => s.name === 'zebra-skill')).toBeTruthy();
    const prefixed = r.listSorted('hello', false);
    expect(prefixed.map(s => s.name)).toEqual(['hello-world']);
    // pagination sanity
    const page = r.listSorted(undefined, false).slice(0, 1);
    expect(page.length).toBe(1);
  });
});