import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { paths } from './storage.js';
import { redact } from './secrets.js';
const BRIEFINGS_DIR = () => paths().briefings;
export function newBriefingId() {
    return crypto.randomBytes(16).toString('hex');
}
export function loadBriefing(id) {
    const file = path.join(BRIEFINGS_DIR(), id + '.json');
    if (!fs.existsSync(file))
        return null;
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    catch {
        return null;
    }
}
export function saveBriefingFile(b) {
    fs.writeFileSync(path.join(BRIEFINGS_DIR(), b.id + '.json'), JSON.stringify(b, null, 2));
}
export function deleteBriefing(id) {
    const file = path.join(BRIEFINGS_DIR(), id + '.json');
    try {
        fs.unlinkSync(file);
    }
    catch { }
}
export function isExpired(b) {
    return Date.now() > b.expiresAt;
}
export function purgeExpired() {
    let n = 0;
    const dir = BRIEFINGS_DIR();
    if (!fs.existsSync(dir))
        return 0;
    for (const f of fs.readdirSync(dir)) {
        if (!f.endsWith('.json'))
            continue;
        const id = f.replace(/\.json$/, '');
        const b = loadBriefing(id);
        if (!b || isExpired(b)) {
            deleteBriefing(id);
            n++;
        }
    }
    return n;
}
export function countRecentBriefings(hours = 1) {
    const dir = BRIEFINGS_DIR();
    if (!fs.existsSync(dir))
        return 0;
    const cutoff = Date.now() - hours * 3600000;
    let n = 0;
    for (const f of fs.readdirSync(dir)) {
        if (!f.endsWith('.json'))
            continue;
        const b = loadBriefing(f.replace(/\.json$/, ''));
        if (b && b.createdAt >= cutoff)
            n++;
    }
    return n;
}
export function intersectPerms(a, b) {
    return a.filter(p => b.includes(p));
}
export function redactSummary(text) {
    return redact(text);
}
//# sourceMappingURL=briefing.js.map