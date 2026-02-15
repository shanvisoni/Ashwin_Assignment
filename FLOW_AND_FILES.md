# How the auth flow works & what each file does

## 1. Access token vs refresh token (why two?)

### Access token
- **What it is:** A short-lived, **signed** string that means “this request is for user X.” It contains `userId` and an expiry time (`exp`), signed with a secret so the server can trust it.
- **Lifetime:** Short (e.g. 15 minutes). If someone steals it, they can only act as you for a limited time.
- **Where it lives:** In an **HTTP-only cookie** named `access_token`. The browser sends it automatically with every request to your backend; **JavaScript cannot read it** (good for security).
- **Used for:** Proving “I am user X” on **every API call** (e.g. `GET /auth/me`). The backend reads the cookie, verifies the signature and expiry, and gets `userId`.

### Refresh token
- **What it is:** A long-lived **random string** that means “allow this session to get a **new** access token.” We don’t put user data in it; we store a **hash** of it in the database and link it to a user.
- **Lifetime:** Long (e.g. 7 days). Used only to get new access tokens, not for every request.
- **Where it lives:** In an **HTTP-only cookie** named `refresh_token`. Also stored in the DB as a **hash** in the `refresh_tokens` table (with `user_id`, `expires_at`, `revoked_at`).
- **Used for:** When the **access token expires**, the frontend calls `POST /auth/refresh`. The backend reads the refresh token from the cookie, checks it in the DB (hash, not expired, not revoked), then issues a **new** access token (and optionally a new refresh token) and sets new cookies.

### Why not only one token?
- One long-lived token: if stolen, the attacker has access for a long time.
- One short-lived token: user would have to log in again every 15 minutes.
- **Two tokens:** Short-lived access token limits damage if stolen; refresh token is used rarely and can be revoked in the DB (e.g. on logout or “log out all devices”).

---

## 2. End-to-end flow

### Sign up
1. User submits email + password on **frontend** (`/signup`).
2. Frontend calls `POST /auth/signup` with `credentials: 'include'` (so cookies can be set).
3. **Backend** validates email/password, checks email not already used, hashes password (PBKDF2), inserts user into `users`, then:
   - Creates **access token** (signed `userId` + `exp`).
   - Creates **refresh token** (random string), stores its **hash** in `refresh_tokens`, links to `user_id`.
4. Backend **sets two HTTP-only cookies**: `access_token`, `refresh_token`, and returns `{ user: { id, email } }`.
5. Frontend redirects to home; browser will send those cookies on the next request.

### Sign in
1. User submits email + password on **frontend** (`/signin`).
2. Frontend calls `POST /auth/signin` with `credentials: 'include'`.
3. **Backend** finds user by email, verifies password with the stored hash, then:
   - Creates access token + refresh token (same as signup), stores refresh hash in DB.
4. Backend **sets** `access_token` and `refresh_token` cookies, returns `{ user }`.
5. Frontend redirects to home.

### Calling a protected route (e.g. GET /auth/me)
1. Frontend calls `GET /auth/me` with `credentials: 'include'` (sends cookies).
2. **AuthGuard** runs first: reads `access_token` from the cookie, calls `verifyAccessToken(token)` (check signature + expiry), gets `userId`, attaches `req.user = { userId }`.
3. Controller returns user info from DB (e.g. id, email). Frontend uses this to show “logged in as …”.

### When access token expires
1. Frontend calls some API; backend sees invalid/expired access token → 401.
2. Frontend can call `POST /auth/refresh` with `credentials: 'include'` (sends `refresh_token` cookie).
3. **Backend** reads refresh token from cookie, hashes it, looks up in `refresh_tokens` (same hash, not expired, not revoked). If valid: creates **new** access token (and optionally new refresh token), revokes old refresh token in DB, **sets new cookies**.
4. Frontend retries the original request; now the new access token is in the cookie.

### Logout
1. Frontend calls `POST /auth/logout` with `credentials: 'include'`.
2. **Backend** reads refresh token from cookie, hashes it, sets `revoked_at = NOW()` for that row in `refresh_tokens`, then **clears** both auth cookies.
3. Frontend can redirect to sign-in; no valid tokens left.

---

## 3. What each file does

### Backend – entry & config
| File | Role |
|------|------|
| `main.ts` | Starts Nest app, loads `.env` (dotenv), enables cookie-parser and CORS (with credentials). Listens on `PORT`. |
| `app.module.ts` | Imports `DatabaseModule`, `UsersModule`, `AuthModule`. |
| `.env` / `.env.example` | Backend config: `DATABASE_URL`, `PORT`, `CORS_ORIGIN`, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, TTLs. |

### Backend – database
| File | Role |
|------|------|
| `database/database.module.ts` | Global module that provides `DatabaseService`. |
| `database/database.service.ts` | Creates a Postgres pool from `DATABASE_URL`, exposes `query(text, params)`. Used by users and auth. |
| `db/init.sql` | Run once when Postgres starts (e.g. in Docker). Creates `users` and `refresh_tokens` tables and indexes. |

### Backend – users
| File | Role |
|------|------|
| `users/users.module.ts` | Declares and exports `UsersService`. |
| `users/users.service.ts` | `findByEmail`, `create`, `findById` – all talk to `users` table via `DatabaseService`. |

### Backend – password & tokens (no extra libs)
| File | Role |
|------|------|
| `common/password.util.ts` | `hashPassword(password)` → `"salt:hash"` (PBKDF2). `verifyPassword(password, stored)` → true/false. Used on signup/signin. |
| `common/token.util.ts` | **Access:** `createAccessToken(userId)` → signed string; `verifyAccessToken(token)` → `userId` or throw. **Refresh:** `createRefreshToken()` → `{ token, hash, expiresAt }`; `hashRefreshToken(token)` for DB lookup. TTLs from env (`15m`, `7d`). |

### Backend – auth logic
| File | Role |
|------|------|
| `auth/auth.module.ts` | Imports `UsersModule`; registers `AuthController`, `AuthService`. |
| `auth/auth.service.ts` | **signup:** validate → check duplicate email → hash password → create user → `issueTokens` (access + refresh, store refresh hash in DB). **signin:** find user → verify password → `issueTokens`. **refresh:** validate refresh token in DB → new access (and optionally refresh) → revoke old refresh. **logout:** revoke refresh token in DB. **getUserById:** for `/me`. Uses `password.util` and `token.util`. |
| `auth/auth.controller.ts` | **POST /auth/signup**, **POST /auth/signin:** call service, then **set** `access_token` and `refresh_token` cookies (httpOnly, secure, sameSite, maxAge). **POST /auth/refresh:** read refresh cookie → service → set new cookies. **POST /auth/logout:** service revoke + **clear** cookies. **GET /auth/me:** protected by `AuthGuard`, returns current user. |
| `auth/auth.guard.ts` | Runs before protected routes. Reads `access_token` from cookie, calls `verifyAccessToken`, attaches `req.user = { userId }`. Throws 401 if missing/invalid. |
| `auth/dto/signup.dto.ts`, `signin.dto.ts` | Plain DTOs: `email`, `password` for request body. |

### Backend – tests
| File | Role |
|------|------|
| `common/password.util.spec.ts` | Table-driven tests: hash format, verify (correct/wrong/bad format). |
| `common/token.util.spec.ts` | Table-driven tests: create/verify access token, hash refresh token, createRefreshToken shape. |
| `auth/auth.service.spec.ts` | Table-driven: signup validation (email/password), duplicate email, signin wrong password / user not found. |
| `jest-setup.ts` | Sets `ACCESS_TOKEN_SECRET` (and refresh) before tests so `token.util` can load. |

### Frontend
| File | Role |
|------|------|
| `lib/api.ts` | Builds API URL from `NEXT_PUBLIC_API_URL`. `apiFetch(path, options)` – fetch with **credentials: 'include'** and JSON headers; returns `{ ok, data, error }`. Exposes `signup`, `signin`, `logout`, `getMe`. |
| `app/page.tsx` | Home. On load calls `getMe()`; if OK shows user email + Sign out; else shows Sign in / Sign up links. Sign out calls `logout()` then clears state. |
| `app/signup/page.tsx` | Sign-up form (email, password, confirm). Client-side validation; on submit calls `signup()`; on success redirects to `/`. |
| `app/signin/page.tsx` | Sign-in form (email, password). Client-side validation; on submit calls `signin()`; on success redirects to `/`. |
| `.env.local` / `.env.example` | `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:3001`) so the browser knows where to send API requests. |

### Docker & DB
| File | Role |
|------|------|
| `docker-compose.yml` | Defines `db` (Postgres, runs `init.sql`), `backend` (Nest, uses `DATABASE_URL` and token secrets), `frontend` (Next, uses `NEXT_PUBLIC_API_URL`). |
| `backend/Dockerfile`, `frontend/Dockerfile` | Build and run backend and frontend in containers. |

---

## 4. One picture (flow in short)

```
Sign up/Sign in
  → Frontend POST /auth/signup or /auth/signin with body { email, password }
  → Backend: validate → DB (create user or verify password) → create access + refresh tokens
  → Backend: set cookies (access_token, refresh_token) + return { user }

Every protected request (e.g. GET /auth/me)
  → Browser sends cookies automatically (credentials: 'include')
  → AuthGuard: read access_token cookie → verifyAccessToken → req.user = { userId }
  → Controller returns user data

When access token expires
  → Frontend: POST /auth/refresh (sends refresh_token cookie)
  → Backend: check refresh token in DB → issue new access (and maybe refresh) → set new cookies

Logout
  → Frontend: POST /auth/logout
  → Backend: revoke refresh token in DB, clear both cookies
```

Access token = “who am I” for each request (short-lived, signed).  
Refresh token = “allow this session to get a new access token” (long-lived, stored in DB, used only for refresh).  
All tokens live in **HTTP-only cookies**; the frontend never sees or stores the token strings themselves.
