import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface User {
  id: number;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Find a user by email.
   * Returns undefined if no user exists.
   */
  async findByEmail(email: string): Promise<User | undefined> {
    const { rows } = await this.db.query<User>(
      'SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email = $1 LIMIT 1',
      [email],
    );
    return rows[0];
  }

  /**
   * Create a new user with the given email and password hash.
   * Returns the created user row.
   */
  async create(email: string, passwordHash: string): Promise<User> {
    const { rows } = await this.db.query<User>(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, password_hash, created_at, updated_at`,
      [email, passwordHash],
    );
    return rows[0];
  }

  /**
   * Find a user by id.
   * Returns undefined if no user exists.
   */
  async findById(id: number): Promise<User | undefined> {
    const { rows } = await this.db.query<User>(
      'SELECT id, email, password_hash, created_at, updated_at FROM users WHERE id = $1 LIMIT 1',
      [id],
    );
    return rows[0];
  }
}
