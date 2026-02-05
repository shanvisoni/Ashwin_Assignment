/**
 * Access and refresh token helpers using Node's built-in crypto.
 * We use crypto (HMAC, random bytes) instead of a JWT library so we avoid
 * extra npm dependencies and keep the implementation under our control.
 */
import * as crypto from 'crypto';

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET || '';
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || '';
const ACCESS_TTL_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function parseTtl(envKey: string, defaultMs: number): number {
  const v = process.env[envKey];
  if (!v) return defaultMs;
  const match = v.match(/^(\d+)(m|h|d)$/i);
  if (!match) return defaultMs;
  const n = parseInt(match[1], 10);
  const u = match[2].toLowerCase();
  if (u === 'm') return n * 60 * 1000;
  if (u === 'h') return n * 60 * 60 * 1000;
  if (u === 'd') return n * 24 * 60 * 60 * 1000;
  return defaultMs;
}

function getAccessTtlMs(): number {
  return parseTtl('ACCESS_TOKEN_TTL', ACCESS_TTL_MS);
}

function getRefreshTtlMs(): number {
  return parseTtl('REFRESH_TOKEN_TTL', REFRESH_TTL_MS);
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Buffer {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  if (pad) b64 += '='.repeat(4 - pad);
  return Buffer.from(b64, 'base64');
}

/**
 * Create a signed access token for the given user id.
 * Format: base64url(payload).base64url(signature).
 */
export function createAccessToken(userId: number): string {
  if (!ACCESS_SECRET) throw new Error('ACCESS_TOKEN_SECRET is not set');
  const exp = Date.now() + getAccessTtlMs();
  const payload = JSON.stringify({ userId, exp });
  const payloadB64 = base64UrlEncode(Buffer.from(payload, 'utf8'));
  const signature = crypto
    .createHmac('sha256', ACCESS_SECRET)
    .update(payloadB64)
    .digest();
  const sigB64 = base64UrlEncode(signature);
  return `${payloadB64}.${sigB64}`;
}

/**
 * Verify access token and return userId. Throws if invalid or expired.
 */
export function verifyAccessToken(token: string): number {
  if (!ACCESS_SECRET) throw new Error('ACCESS_TOKEN_SECRET is not set');
  const parts = token.split('.');
  if (parts.length !== 2) throw new Error('Invalid token format');
  const [payloadB64, sigB64] = parts;
  const signature = crypto
    .createHmac('sha256', ACCESS_SECRET)
    .update(payloadB64)
    .digest();
  const expectedSig = base64UrlEncode(signature);
  if (sigB64 !== expectedSig) throw new Error('Invalid signature');
  const payload = JSON.parse(
    base64UrlDecode(payloadB64).toString('utf8'),
  ) as { userId: number; exp: number };
  if (Date.now() > payload.exp) throw new Error('Token expired');
  return payload.userId;
}

/**
 * Create a refresh token: returns { token, hash, expiresAt }.
 * Store hash in refresh_tokens table; send token in cookie.
 */
export function createRefreshToken(): {
  token: string;
  hash: string;
  expiresAt: Date;
} {
  const raw = crypto.randomBytes(32).toString('hex');
  const hash = hashRefreshToken(raw);
  const expiresAt = new Date(Date.now() + getRefreshTtlMs());
  return { token: raw, hash, expiresAt };
}

/**
 * Hash a refresh token for DB storage / lookup.
 */
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
