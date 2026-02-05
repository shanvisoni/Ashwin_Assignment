import { hashPassword, verifyPassword } from './password.util';

describe('password.util', () => {
  describe('hashPassword', () => {
    it('returns a string in salt:hash format (two hex parts)', () => {
      const stored = hashPassword('mypassword');
      const parts = stored.split(':');
      expect(parts).toHaveLength(2);
      expect(parts[0]).toMatch(/^[0-9a-f]+$/);
      expect(parts[1]).toMatch(/^[0-9a-f]+$/);
    });

    it('produces different hashes for same password (random salt)', () => {
      const a = hashPassword('same');
      const b = hashPassword('same');
      expect(a).not.toBe(b);
      expect(verifyPassword('same', a)).toBe(true);
      expect(verifyPassword('same', b)).toBe(true);
    });
  });

  describe('verifyPassword', () => {
    const cases: { password: string; stored: string; expected: boolean }[] = [
      { password: 'correct', stored: hashPassword('correct'), expected: true },
      { password: 'wrong', stored: hashPassword('correct'), expected: false },
      { password: '', stored: hashPassword('x'), expected: false },
      { password: 'x', stored: 'badformat', expected: false },
      { password: 'x', stored: '', expected: false },
      { password: 'x', stored: 'onlyone:', expected: false },
      { password: 'x', stored: ':onlyhash', expected: false },
    ];

    cases.forEach(({ password, stored, expected }, i) => {
      it(`case ${i + 1}: verifyPassword("${password.replace(/"/g, '')}", stored) === ${expected}`, () => {
        expect(verifyPassword(password, stored)).toBe(expected);
      });
    });
  });
});
