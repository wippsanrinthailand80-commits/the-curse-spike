import { describe, it, expect } from 'vitest';
import { validateName } from '../src/skillparse.js';

describe('naming', () => {
  it('invalid chars fail', () => expect(validateName('Bad_Name').ok).toBe(false));
  it('missing prefix warns? validate requires hyphen', () => expect(validateName('foobar').ok).toBe(false));
  it('valid passes', () => expect(validateName('git-commit').ok).toBe(true));
});