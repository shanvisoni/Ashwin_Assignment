# Frontend – Next.js Auth App

Sign up, sign in, and home page. Uses the backend API with credentials (cookies); no tokens in `localStorage`.

## Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL, e.g. `http://localhost:3001` (no trailing slash) |

The browser calls this URL for API requests. When using Docker, the app is served from the container but the browser runs on your machine, so use `http://localhost:3001` so the backend is reachable.

Do not commit `.env.local`.

## Setup

```bash
npm install
```

## Run

```bash
# Development
npm run dev
```

Open http://localhost:3000 (or the port shown in the terminal).

```bash
# Production build
npm run build
npm start
```

## Pages

| Path | Description |
|------|-------------|
| `/` | Home. Shows sign in / sign up links when logged out, or user email and sign out when logged in. |
| `/signup` | Sign up form (email, password, confirm password). |
| `/signin` | Sign in form (email, password). |

All API calls use `credentials: 'include'` so HTTP-only cookies are sent and received.

## Docker

Built and run via root `docker compose up --build`. Frontend container gets `NEXT_PUBLIC_API_URL=http://localhost:3001` from `docker-compose.yml` so the browser can call the backend on the host.
