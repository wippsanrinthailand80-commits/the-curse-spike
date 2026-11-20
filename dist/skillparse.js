import * as yaml from 'js-yaml';
import fs from 'node:fs';
import path from 'node:path';
export function parseFrontmatter(content) {
    const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m)
        throw new Error('missing frontmatter');
    const fm = yaml.load(m[1]);
    return { fm, body: m[2] };
}
export function serializeSkill(fm, body) {
    const yamlStr = yaml.dump(fm, { lineWidth: 1000 });
    return `---\n${yamlStr}---\n${body}`;
}
export function loadSkillFromDir(dir, bundled) {
    const skillMd = path.join(dir, 'SKILL.md');
    if (!fs.existsSync(skillMd))
        return null;
    const raw = fs.readFileSync(skillMd, 'utf8');
    let fm, body;
    try {
        ({ fm, body } = parseFrontmatter(raw));
    }
    catch {
        return null;
    }
    const name = fm.name || path.basename(dir);
    return {
        name,
        description: fm.description || '',
        permissions: (fm.permissions || []),
        status: (fm.status || (bundled ? 'active' : 'pending')),
        secrets: fm.secrets || [],
        tests: fm.tests || [],
        body,
        dir,
        bundled,
        raw,
    };
}
export function validateName(name) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name))
        return { ok: false, reason: 'invalid characters; use lowercase kebab-case' };
    if (!name.includes('-'))
        return { ok: false, reason: 'missing category prefix (category-action)' };
    return { ok: true };
}
//# sourceMappingURL=skillparse.js.map