import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { DatabaseService } from '../database/database.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/users.service';
import { hashPassword } from '../common/password.util';

const validStoredHash = hashPassword('correctpassword');

const mockUser: User = {
  id: 1,
  email: 'user@example.com',
  password_hash: validStoredHash,
  created_at: new Date(),
  updated_at: new Date(),
};

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: UsersService;
  let db: DatabaseService;

  beforeEach(async () => {
    const mockUsersService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
    };
    const mockDb = {
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: DatabaseService, useValue: mockDb },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    db = module.get<DatabaseService>(DatabaseService);
    jest.clearAllMocks();
  });

  describe('signup validation (table-driven)', () => {
    const cases: { email: string; password: string; expectError: string | null }[] = [
      { email: '', password: 'password123', expectError: 'Email is required' },
      { email: 'invalid', password: 'password123', expectError: 'Invalid email format' },
      { email: 'a@b', password: 'password123', expectError: 'Invalid email format' },
      { email: 'user@example.com', password: '', expectError: 'Password is required' },
      { email: 'user@example.com', password: 'short', expectError: 'at least 8' },
      { email: 'user@example.com', password: 'validpass123', expectError: null },
    ];

    cases.forEach(({ email, password, expectError }, i) => {
      it(`case ${i + 1}: email="${email}", password="${password.replace(/./g, '*')}" => ${expectError ?? 'ok'}`, async () => {
        (usersService.findByEmail as jest.Mock).mockResolvedValue(undefined);
        (usersService.create as jest.Mock).mockResolvedValue({
          ...mockUser,
          email: email.trim().toLowerCase(),
          password_hash: 'stored',
        });
        (db.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 1 });

        if (expectError) {
          await expect(authService.signup(email, password)).rejects.toThrow(
            expectError === 'Invalid email format'
              ? BadRequestException
              : expectError === 'Email is required' || expectError === 'Password is required' || expectError?.includes('at least')
                ? BadRequestException
                : Error,
          );
        } else {
          const result = await authService.signup(email, password);
          expect(result).toHaveProperty('id');
          expect(result).toHaveProperty('email');
          expect(result).toHaveProperty('tokens');
        }
      });
    });
  });

  describe('signup duplicate email', () => {
    it('throws ConflictException when email already exists', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        authService.signup('user@example.com', 'password123'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('signin validation (table-driven)', () => {
    const cases: { name: string; email: string; password: string; userExists: boolean }[] = [
      { name: 'wrong password', email: 'user@example.com', password: 'wrongpass123', userExists: true },
      { name: 'user not found', email: 'nonexistent@example.com', password: 'anypassword', userExists: false },
    ];

    cases.forEach(({ name, email, password, userExists }, i) => {
      it(`case ${i + 1}: ${name} => UnauthorizedException`, async () => {
        (usersService.findByEmail as jest.Mock).mockResolvedValue(userExists ? mockUser : undefined);
        await expect(authService.signin(email, password)).rejects.toThrow(UnauthorizedException);
      });
    });
  });
});
