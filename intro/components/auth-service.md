# Component: auth-service

**Path:** `auth-service/` · **Runtime:** Node + Express 4 + Prisma · **Port:** 3001

Owns identity: user accounts, password hashing, JWT issuing/refreshing, and admin
user management. It is the only service that holds the `User` table.

## Endpoints (`/api/auth`)
| Method & path | Auth | Purpose |
|---|---|---|
| `POST /register` | public | Create user. **First user becomes ADMIN**, rest are TESTER. |
| `POST /login` | public | Verify bcrypt hash, return `{user, accessToken, refreshToken}`. |
| `GET /me` | Bearer | Current user from the access token. |
| `POST /refresh` | public | Exchange a valid refresh token for a new access token. |
| `POST /logout` | Bearer | Best-effort blacklist of the token in Redis. |
| `GET /users` | ADMIN | Paginated, searchable user list. |
| `PATCH /users/:id/reset-password` | ADMIN | Set a new password for a user. |
| `DELETE /users/:id` | ADMIN | Delete a user (won't delete self / last admin). |

## Tokens (`src/utils/jwt.js`)
- **Access token**: payload `{id, email, role}`, `JWT_ACCESS_SECRET`, expires `8h`.
- **Refresh token**: payload `{id}`, `JWT_REFRESH_SECRET`, expires `30d`.
- The same `JWT_ACCESS_SECRET` is configured in core-service so it can verify
  tokens locally — **no inter-service auth call**.

## Rate limiting (`src/middleware/rateLimiter.js`)
- **Opt-in, OFF by default.** Enable with `ENABLE_AUTH_RATE_LIMIT=true`.
- When disabled, every limiter is a no-op pass-through — the historical
  "Too many login attempts" lockout is structurally impossible.
- When enabled, generous limits keyed by the real client IP (first
  `X-Forwarded-For` entry), since traffic arrives via the gateway proxy.

## Key files
| File | What it does |
|---|---|
| `src/routes/auth.js` | All endpoints above; validation via express-validator. |
| `src/middleware/auth.js` | `verifyToken`, `requireRole`, `getBearerToken`. |
| `src/utils/prisma.js` | Shared `PrismaClient` singleton (one pool per process). |
| `src/utils/redis.js` | Optional ioredis client; all use is best-effort/fails open. |

## Env vars
`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `REDIS_URL` (optional),
`ENABLE_AUTH_RATE_LIMIT` (optional), `PORT` (default 3001),
`JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` (optional overrides).

## Gotchas
- `app.set("trust proxy", 1)` so client IPs resolve correctly behind the gateway.
- Redis is entirely optional; if `REDIS_URL` is unset, logout still succeeds and
  token-revocation checks simply return "not revoked".
