# Backend – NestJS API

Auth API: sign up, sign in, refresh, logout. Tokens are stored in HTTP-only cookies.

## Environment

Copy `.env.example` to `.env` and set values:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres connection string, e.g. `postgres://authuser:authpass@localhost:5432/authdb` |
| `PORT` | Server port (default `3001` for local; use `3000` inside Docker) |
| `CORS_ORIGIN` | Allowed origin for CORS (e.g. `http://localhost:3000`) |
| `ACCESS_TOKEN_SECRET` | Secret to sign access tokens |
| `REFRESH_TOKEN_SECRET` | Used for refresh token handling |
| `ACCESS_TOKEN_TTL` | Optional, e.g. `15m` |
| `REFRESH_TOKEN_TTL` | Optional, e.g. `7d` |

Do not commit `.env`. Use strong secrets in production.

## Setup

```bash
npm install
```

## Run

```bash
# Development (watch mode)
npm run start:dev

# Production build
npm run build
npm run start:prod
```

Default port is 3001 when running locally (see `PORT` in `.env`).

## Tests

```bash
# Unit tests
npm test

# Coverage
npm run test:cov

# E2E
npm run test:e2e
```

Table-driven unit tests cover password hashing, token helpers, and auth validation.

## API (auth)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/signup` | Body: `{ "email", "password" }`. Sets cookies, returns `{ user }`. |
| POST | `/auth/signin` | Body: `{ "email", "password" }`. Sets cookies, returns `{ user }`. |
| POST | `/auth/refresh` | Reads refresh cookie, issues new tokens, sets cookies. |
| POST | `/auth/logout` | Revokes refresh token, clears auth cookies. |
| GET | `/auth/me` | Protected. Returns `{ user: { id, email } }`. |

All auth responses use HTTP-only secure cookies; no token in response body for storage.

## Docker

Built and run via root `docker compose up --build`. Backend service gets env from `docker-compose.yml` (e.g. `DATABASE_URL`, `PORT=3000`, secrets).
