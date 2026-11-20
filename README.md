# The Curse Spike

A local MCP (stdio) skill hub. Instead of exposing every skill as a separate tool, it exposes a small set of meta-tools and loads skills on demand. Safe enough to let agents write their own skills.

## Research notes (Step 0)

Borrowed ideas:
- Progressive Skills MCP / AgentSkill MCP / skills-server (ivanenev): progressive disclosure (`search_skills`, `get_skill`), folder-based SKILL.md compatible with Anthropic's format.
- SkillForge (skillforge-mcp): on-demand loading, usage stats for ranking.
- Caduceus governance for Hermes: provenance-based holding of skill writes (new/modified skills start `pending`, held for human review when untrusted content involved).

What differs:
- Single hub with meta-tools only (no tool-per-skill bloat).
- Scoped "Spray" briefings for subagents with permission subset, depth limits, TTL.
- Security-first: path traversal protection, secrets vault, restricted subprocess env, redaction.
- Agents can author skills but cannot self-approve; human confirmation required.

Name check: `the-curse-spike` is available on npm (404 at time of creation).

## Install

```bash
npx -y the-curse-spike
```

Or from GitHub:
```bash
npx github:wippsanrinthailand80-commits/the-curse-spike
```

Or:
```bash
curl -fsSL <raw github url>/install.sh | bash
```

Pin a version: `npx the-curse-spike@0.1.0`.

MCP client config:
```json
{ "mcpServers": { "the-curse-spike": { "command": "npx", "args": ["-y", "the-curse-spike"] } } }
```

## Storage

`~/.curse-spike/` (override with `CURSE_SPIKE_HOME`):
- `skills/` (git-initialized on first run)
- `logs/`, `stats.json`, `briefings/`
- `secrets.json` (chmod 600)
- `config.json`

Bundled starter skills are read-only inside the package.

## Skill format

Folder: `<name>/SKILL.md` + optional scripts/resources. YAML frontmatter:
- `name`, `description` (short, specific, says WHEN to use)
- `permissions`: any of `read`, `write`, `network`, `exec`
- `status`: `pending` | `active` (managed by hub only)
- optional `secrets`: env var names
- optional `tests`: example input/expected output

Body = full instructions.

Naming: lowercase kebab-case with category prefix `<category>-<action>` (e.g. `git-commit`). `create_skill` warns on missing prefix, fails on invalid chars or duplicates.

## Security model

- New/modified skills start `pending`; cannot run until human approves (`approve_skill` via MCP elicitation, or CLI `curse-spike approve <name>` which the agent cannot call).
- Per-skill permissions enforced; confirmation before side effects.
- Path traversal protection: writes confined to skills folder.
- Secrets vault: injected as env vars at run time; never returned; redacted from logs/briefings.
- Scripts run with timeout, output size limit, restricted env (no inherited env except injected).
- Provenance: if `untrusted_content: true`, skill writes held for human review, summaries labeled, exec/write skills cannot be sprayed without confirmation.
- Briefings: unguessable IDs, TTL, purged periodically, rate/scope limits, permission subset, depth limit, no pending skills.

## Spray flow

1. Agent calls `spray(task, skills?, max_skills, untrusted_content?)` -> `{briefing_id, suggested_skills, template, expires_at}`.
2. Agent fills summary and calls `save_briefing(briefing_id, summary)`.
3. Subagent calls `get_briefing(briefing_id)` to receive task, summary, granted skills, permissions, expiry.
4. Scope enforcement: with `briefing_id`, only granted skills visible/runnable.

## CLI

- `curse-spike approve <name>`
- `curse-spike rollback <name> [commit]`

## Comparison

See research notes above. Progressive disclosure is table stakes; the selling point is safe agent-authored skills + scoped briefings.

## What is untested

- MCP elicitation flows in automated environments (clients may not support).
- Semantic search (interface present, keyword only).
- MCP proxy and hub-side LLM (intentionally not built).
