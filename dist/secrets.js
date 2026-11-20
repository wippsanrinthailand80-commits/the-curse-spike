import fs from 'node:fs';
import { paths, readJson, writeJson } from './storage.js';
export function loadSecrets() {
    return readJson(paths().secrets, {});
}
export function setSecret(name, value) {
    const s = loadSecrets();
    s[name] = value;
    writeJson(paths().secrets, s);
    try {
        fs.chmodSync(paths().secrets, 0o600);
    }
    catch { }
}
export function getSecretNames() {
    return Object.keys(loadSecrets());
}
export function resolveSecrets(names) {
    const s = loadSecrets();
    const out = {};
    for (const n of names)
        if (s[n] !== undefined)
            out[n] = s[n];
    return out;
}
export function redact(text) {
    const s = loadSecrets();
    let out = text;
    for (const v of Object.values(s)) {
        if (v && v.length > 0)
            out = out.split(v).join('[REDACTED]');
    }
    return out;
}
export function containsSecret(text) {
    const s = loadSecrets();
    return Object.values(s).some(v => v && v.length > 0 && text.includes(v));
}
//# sourceMappingURL=secrets.js.map