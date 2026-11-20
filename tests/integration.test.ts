import { describe, it, expect, beforeEach } from 'vitest';
import { makeHome } from './setup.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createApp } from '../src/app.js';
import { registerTools } from '../src/tools.js';

async function setup() {
  const home = makeHome();
  const app = createApp();
  const server = new McpServer({ name: 't', version: '0' });
  registerTools(server, app);
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await server.connect(st);
  const client = new Client({ name: 'c', version: '0' });
  await client.connect(ct);
  return { home, app, client };
}

function text(r: any): string { return r?.content?.[0]?.text ?? ''; }

describe('integration', () => {
  it('list_skills stable A-Z, pending hidden', async () => {
    const { client } = await setup();
    const r = await client.callTool({ name: 'list_skills', arguments: {} });
    const lines = text(r).split('\n').slice(1).filter(Boolean);
    const names = lines.map(l => l.split(' | ')[0]);
    expect(names).toEqual([...names].sort());
  });

  it('spray rejects pending/unknown; auto-select active only; max_skills', async () => {
    const { client } = await setup();
    await client.callTool({ name: 'create_skill', arguments: { name: 'pending-x', description: 'p', files: [] } });
    let r = await client.callTool({ name: 'spray', arguments: { task: 'x', skills: ['pending-x'] } });
    expect(text(r)).toContain('not active');
    r = await client.callTool({ name: 'spray', arguments: { task: 'x', skills: ['nope'] } });
    expect(text(r)).toContain('unknown skill');
    r = await client.callTool({ name: 'spray', arguments: { task: 'greet', max_skills: 1 } });
    const obj = JSON.parse(text(r));
    expect(obj.suggested_skills.length).toBeLessThanOrEqual(1);
    expect(obj.suggested_skills).not.toContain('pending-x');
  });

  it('scope enforcement', async () => {
    const { client } = await setup();
    const r = await client.callTool({ name: 'spray', arguments: { task: 'greet', skills: ['hello-world'], max_skills: 1 } });
    const bid = JSON.parse(text(r)).briefing_id;
    let rr = await client.callTool({ name: 'list_skills', arguments: { briefing_id: bid } });
    expect(text(rr)).toContain('hello-world');
    expect(text(rr)).not.toContain('skill-creator');
    rr = await client.callTool({ name: 'get_skill', arguments: { name: 'skill-creator', briefing_id: bid } });
    expect(text(rr)).toContain('not found');
    rr = await client.callTool({ name: 'run_skill', arguments: { name: 'skill-creator', briefing_id: bid, args: {} } });
    expect(text(rr)).toContain('not found');
  });

  it('child permissions and depth limit', async () => {
    const { client } = await setup();
    const r = await client.callTool({ name: 'spray', arguments: { task: 't', skills: ['hello-world'], max_skills: 1 } });
    const pid = JSON.parse(text(r)).briefing_id;
    const r2 = await client.callTool({ name: 'spray', arguments: { task: 'c', skills: ['hello-world'], briefing_id: pid, max_skills: 1 } });
    const cid = JSON.parse(text(r2)).briefing_id;
    const gb = await client.callTool({ name: 'get_briefing', arguments: { briefing_id: cid } });
    const obj = JSON.parse(text(gb));
    expect(obj.permissions).toEqual(['read']);
    const r3 = await client.callTool({ name: 'spray', arguments: { task: 'g', skills: ['hello-world'], briefing_id: cid, max_skills: 1 } });
    expect(text(r3)).toContain('depth limit');
  });

  it('TTL expiry module', async () => {
    makeHome();
    const { newBriefingId, saveBriefingFile, isExpired } = await import('../src/briefing.js');
    const b: any = { id: newBriefingId(), task: 't', skills: [], summary: '', untrusted: false, permissions: [], depth: 1, createdAt: Date.now(), expiresAt: Date.now() + 1, skillDescriptions: {} };
    saveBriefingFile(b);
    await new Promise(res => setTimeout(res, 10));
    expect(isExpired(b)).toBe(true);
  });

  it('provenance untrusted', async () => {
    const { client } = await setup();
    await client.callTool({ name: 'create_skill', arguments: { name: 'writer-x', description: 'w', files: [], untrusted_content: true } });
    const r = await client.callTool({ name: 'get_skill', arguments: { name: 'writer-x' } });
    expect(text(r)).toContain('status: pending');
    const sp = await client.callTool({ name: 'spray', arguments: { task: 't', skills: ['hello-world'], untrusted_content: true } });
    const bid = JSON.parse(text(sp)).briefing_id;
    const tmpl = JSON.parse(text(sp)).template;
    expect(tmpl).toContain('UNTRUSTED CONTENT');
    await client.callTool({ name: 'save_briefing', arguments: { briefing_id: bid, summary: 'hi' } });
    const gb = await client.callTool({ name: 'get_briefing', arguments: { briefing_id: bid } });
    expect(text(gb)).toContain('UNTRUSTED CONTENT');
  });

  it('secret redaction in run output', async () => {
    const home = makeHome();
    const fs = await import('node:fs');
    const path = await import('node:path');
    fs.writeFileSync(home + '/secrets.json', JSON.stringify({ API_KEY: 'supersecret' }));
    fs.chmodSync(home + '/secrets.json', 0o600);
    const skillDir = path.join(home, 'skills', 'sec-printer');
    fs.mkdirSync(skillDir + '/scripts', { recursive: true });
    fs.writeFileSync(skillDir + '/scripts/main.py', 'import os\nprint(os.environ.get("API_KEY"))\n');
    fs.writeFileSync(skillDir + '/SKILL.md', '---\nname: sec-printer\ndescription: p\npermissions:\n  - read\n  - exec\nstatus: active\nsecrets:\n  - API_KEY\ntests: []\n---\nbody\n');
    const app = (await import('../src/app.js')).createApp();
    const server = new McpServer({ name: 't2', version: '0' });
    registerTools(server, app);
    const [ct, st] = InMemoryTransport.createLinkedPair();
    await server.connect(st);
    const client = new Client({ name: 'c2', version: '0' });
    await client.connect(ct);
    const r = await client.callTool({ name: 'run_skill', arguments: { name: 'sec-printer', args: {} } });
    expect(text(r)).toContain('[REDACTED]');
    expect(text(r)).not.toContain('supersecret');
  });

  it('path traversal blocked', async () => {
    const { client } = await setup();
    const r = await client.callTool({ name: 'create_skill', arguments: { name: 'evil', description: 'x', files: [{ path: '../escape.txt', content: 'pwned' }] } });
    expect(text(r)).toContain('path traversal blocked');
  });
});