# Auth App – Sign up & Sign in

Next.js frontend + NestJS backend + PostgreSQL, with Docker support. Tokens are stored in HTTP-only cookies (access + refresh flow).

## Tech stack

- **Frontend:** Next.js (App Router)
- **Backend:** NestJS
- **Database:** PostgreSQL
- **Run all:** Docker & Docker Compose

## Quick start with Docker

From the project root:

```bash
docker compose up --build
```

- **Frontend:** http://localhost:3000  
- **Backend API:** http://localhost:3001  
- **PostgreSQL:** localhost:5432 (user `authuser`, database `authdb`)

## Environment files

| Location        | Purpose |
|----------------|---------|
| `backend/.env` | Backend config (DB, port, secrets). Copy from `backend/.env.example`. Not committed. |
| `frontend/.env.local` | Frontend config (`NEXT_PUBLIC_API_URL`). Copy from `frontend/.env.example`. Not committed. |

Docker Compose injects its own env for `db`, `backend`, and `frontend` when you run `docker compose up`. For **local runs** (without Docker), copy the `.env.example` files and fill in values.

## Run without Docker (local dev)

1. **Database:** Start Postgres (e.g. local install or a Postgres container) with user `authuser`, password `authpass`, database `authdb`, port 5432. Run `db/init.sql` to create tables.

2. **Backend:**
   ```bash
   cd backend
   cp .env.example .env   # edit if needed
   npm install
   npm run start:dev
   ```
   Backend: http://localhost:3001

3. **Frontend:**
   ```bash
   cd frontend
   cp .env.example .env.local
   npm install
   npm run dev
   ```
   Frontend: http://localhost:3000

Set `NEXT_PUBLIC_API_URL=http://localhost:3001` in `frontend/.env.local` so the app talks to your local backend.

## Project structure

```
├── backend/          # NestJS API (auth, users, DB)
├── frontend/         # Next.js app (signup, signin, home)
├── db/
│   └── init.sql      # PostgreSQL schema (users, refresh_tokens)
└── docker-compose.yml
```

## Auth flow

- **Sign up / Sign in:** Backend sets HTTP-only cookies (`access_token`, `refresh_token`). No tokens in `localStorage`.
- **Protected route:** `GET /auth/me` reads the access token from the cookie.
- **Refresh:** Frontend can call `POST /auth/refresh` when the access token expires; backend issues new tokens and sets cookies again.

See `backend/README.md` and `frontend/README.md` for more detail.
