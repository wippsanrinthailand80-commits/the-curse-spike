import { describe, it, expect, beforeEach } from 'vitest';
import { makeHome } from './setup.js';
import { setSecret, redact, loadSecrets } from '../src/secrets.js';

describe('secrets', () => {
  beforeEach(() => makeHome());
  it('redacts secret values', () => {
    setSecret('TOKEN', 'supersecret');
    expect(redact('value supersecret end')).toBe('value [REDACTED] end');
    expect(loadSecrets().TOKEN).toBe('supersecret');
  });
});