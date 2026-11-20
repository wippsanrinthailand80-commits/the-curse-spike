export { approveSkillCli, rollbackSkillCli } from './approve.js';
import { createApp } from './app.js';
import { resolveSecrets } from './secrets.js';
import { runSkill } from './runner.js';
import { redact } from './secrets.js';
import { logRun } from './logging.js';
export async function runSkillCli(name, argsJson) {
    if (!name)
        return 'usage: curse-spike run-skill <name> [json-args]';
    const app = createApp();
    const skill = app.registry.get(name);
    if (!skill)
        return 'not found: ' + name;
    if (skill.status !== 'active')
        return 'skill not active: ' + name;
    const depth = parseInt(process.env.CURSE_SPIKE_DEPTH || '0', 10);
    const max = app.config?.chainMaxDepth ?? 3;
    if (depth > max)
        return 'chain depth limit exceeded';
    const args = argsJson ? JSON.parse(argsJson) : {};
    const secrets = resolveSecrets(skill.secrets || []);
    const result = await runSkill(skill, args, {
        timeoutMs: app.config?.runTimeoutMs ?? 30000,
        maxOutputBytes: app.config?.runMaxOutputBytes ?? 65536,
        secrets,
        env: { CURSE_SPIKE_DEPTH: String(depth + 1) },
    });
    app.registry.recordRun(skill.name, result.success);
    logRun({ skill: skill.name, args, durationMs: result.durationMs, success: result.success });
    const out = redact(result.stdout);
    return `success=${result.success} exit=${result.exitCode}\n${out}${result.stderr ? '\nSTDERR: ' + redact(result.stderr) : ''}`;
}
//# sourceMappingURL=cli.js.map