/**
 * Password hashing using Node's built-in crypto (PBKDF2).
 * We use crypto instead of bcrypt because the assignment asks to avoid
 * extra npm libraries and write logic ourselves; crypto is built into Node.
 */
import * as crypto from 'crypto';

const PBKDF2_ITERATIONS = 100000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;
const DIGEST = 'sha256';

/**
 * Hash a password with a random salt using PBKDF2.
 * Returns a string "salt:hash" (both hex) to store in password_hash column.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_BYTES).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, HASH_BYTES, DIGEST)
    .toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a plain password against a stored "salt:hash" value.
 */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const computed = crypto
    .pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, HASH_BYTES, DIGEST)
    .toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computed, 'hex'));
}
