import {
  createAccessToken,
  verifyAccessToken,
  hashRefreshToken,
  createRefreshToken,
} from './token.util';

describe('token.util', () => {
  describe('createAccessToken / verifyAccessToken', () => {
    const userIdCases = [1, 42, 999];

    userIdCases.forEach((userId) => {
      it(`createAccessToken(${userId}) then verifyAccessToken returns ${userId}`, () => {
        const token = createAccessToken(userId);
        expect(typeof token).toBe('string');
        expect(token).toContain('.');
        const decoded = verifyAccessToken(token);
        expect(decoded).toBe(userId);
      });
    });
  });

  describe('verifyAccessToken', () => {
    const invalidCases: { name: string; token: string; expectError: boolean }[] = [
      { name: 'empty string', token: '', expectError: true },
      { name: 'no dot', token: 'nodot', expectError: true },
      { name: 'wrong signature', token: createAccessToken(1).split('.')[0] + '.wrong', expectError: true },
    ];

    invalidCases.forEach(({ name, token, expectError }) => {
      it(`${name} throws or returns false`, () => {
        if (expectError) {
          expect(() => verifyAccessToken(token)).toThrow();
        }
      });
    });
  });

  describe('hashRefreshToken', () => {
    const cases: { token: string; sameTokenSameHash: boolean }[] = [
      { token: 'abc123', sameTokenSameHash: true },
      { token: 'xyz', sameTokenSameHash: true },
    ];

    cases.forEach(({ token }, i) => {
      it(`case ${i + 1}: hashRefreshToken is deterministic`, () => {
        const h1 = hashRefreshToken(token);
        const h2 = hashRefreshToken(token);
        expect(h1).toBe(h2);
        expect(h1).toMatch(/^[0-9a-f]{64}$/);
      });
    });

    it('different tokens produce different hashes', () => {
      const h1 = hashRefreshToken('token1');
      const h2 = hashRefreshToken('token2');
      expect(h1).not.toBe(h2);
    });
  });

  describe('createRefreshToken', () => {
    it('returns token, hash, and expiresAt', () => {
      const result = createRefreshToken();
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('expiresAt');
      expect(typeof result.token).toBe('string');
      expect(result.token.length).toBeGreaterThan(0);
      expect(hashRefreshToken(result.token)).toBe(result.hash);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
