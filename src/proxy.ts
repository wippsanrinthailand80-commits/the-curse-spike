// Extension point for proxying other MCP servers listed in config.json (mcpServers).
// Not implemented in Phase 6 (intentionally minimal). Implement by connecting
// to each configured server and re-registering its tools with a prefix.

export interface McpProxyConfig {
  servers?: Record<string, { command: string; args?: string[] }>;
}

export async function initProxy(_config: McpProxyConfig): Promise<void> {
  // no-op extension point
  return;
}