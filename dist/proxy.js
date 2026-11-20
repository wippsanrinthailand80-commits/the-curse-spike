// Extension point for proxying other MCP servers listed in config.json (mcpServers).
// Not implemented in Phase 6 (intentionally minimal). Implement by connecting
// to each configured server and re-registering its tools with a prefix.
export async function initProxy(_config) {
    // no-op extension point
    return;
}
//# sourceMappingURL=proxy.js.map