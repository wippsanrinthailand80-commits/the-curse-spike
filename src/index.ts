#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import fs from 'node:fs';
import { createApp } from './app.js';
import { paths } from './storage.js';
import { approveSkillCli, rollbackSkillCli } from './cli.js';
import { registerTools } from './tools.js';
import { purgeExpired } from './briefing.js';

const argv = process.argv.slice(2);
if (argv[0] === 'approve') {
  approveSkillCli(argv[1]).then((r) => { console.log(r); process.exit(r.startsWith('OK') ? 0 : 1); });
} else if (argv[0] === 'rollback') {
  rollbackSkillCli(argv[1], argv[2]).then((r) => { console.log(r); process.exit(0); });
} else if (argv[0] === 'purge') {
  const { purgeExpired } = await import('./briefing.js');
  console.log('purged', purgeExpired());
  process.exit(0);
} else {
  const app = createApp();
  const server = new McpServer({ name: 'the-curse-spike', version: '0.1.0' });
  registerTools(server, app);
  // periodic purge
  setInterval(() => { try { purgeExpired(); } catch {} }, 600000);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}