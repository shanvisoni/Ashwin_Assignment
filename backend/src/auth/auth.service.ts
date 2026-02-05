import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UsersService } from '../users/users.service';
import { hashPassword, verifyPassword } from '../common/password.util';
import {
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
  verifyAccessToken,
} from '../common/token.util';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function validateEmail(email: string): void {
  if (!email || typeof email !== 'string') {
    throw new BadRequestException('Email is required');
  }
  const trimmed = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(trimmed)) {
    throw new BadRequestException('Invalid email format');
  }
}

function validatePassword(password: string): void {
  if (!password || typeof password !== 'string') {
    throw new BadRequestException('Password is required');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new BadRequestException(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    );
  }
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export interface AuthUser {
  id: number;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly db: DatabaseService,
  ) {}

  async signup(email: string, password: string): Promise<AuthUser & { tokens: AuthTokens }> {
    validateEmail(email);
    validatePassword(password);
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.usersService.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = hashPassword(password);
    const user = await this.usersService.create(normalizedEmail, passwordHash);
    const tokens = await this.issueTokens(user.id);
    return { id: user.id, email: user.email, tokens };
  }

  async signin(email: string, password: string): Promise<AuthUser & { tokens: AuthTokens }> {
    validateEmail(email);
    validatePassword(password);
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!verifyPassword(password, user.password_hash)) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const tokens = await this.issueTokens(user.id);
    return { id: user.id, email: user.email, tokens };
  }

  private async issueTokens(userId: number): Promise<AuthTokens> {
    const accessToken = createAccessToken(userId);
    const { token: refreshToken, hash, expiresAt } = createRefreshToken();
    await this.db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, hash, expiresAt],
    );
    return { accessToken, refreshToken, refreshExpiresAt: expiresAt };
  }

  async refresh(refreshToken: string): Promise<AuthTokens | null> {
    if (!refreshToken) return null;
    const tokenHash = hashRefreshToken(refreshToken);
    const { rows } = await this.db.query<{ user_id: number }>(
      `SELECT user_id FROM refresh_tokens
       WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()
       LIMIT 1`,
      [tokenHash],
    );
    const row = rows[0];
    if (!row) return null;
    const accessToken = createAccessToken(row.user_id);
    const { token: newRefresh, hash, expiresAt } = createRefreshToken();
    await this.db.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`,
      [tokenHash],
    );
    await this.db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [row.user_id, hash, expiresAt],
    );
    return {
      accessToken,
      refreshToken: newRefresh,
      refreshExpiresAt: expiresAt,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    if (!refreshToken) return;
    const tokenHash = hashRefreshToken(refreshToken);
    await this.db.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`,
      [tokenHash],
    );
  }

  getUserIdFromAccessToken(accessToken: string): number {
    return verifyAccessToken(accessToken);
  }

  async getUserById(userId: number): Promise<AuthUser | null> {
    const user = await this.usersService.findById(userId);
    if (!user) return null;
    return { id: user.id, email: user.email };
  }
}
