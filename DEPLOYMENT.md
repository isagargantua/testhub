# TestHub Production Deployment

## Render

Use `render.yaml` as a Render Blueprint from the repository root.

Create Neon PostgreSQL and Upstash Redis first, then set these secret env vars in the Blueprint prompt:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `REDIS_URL`
- `FRONTEND_URL`
- `CORS_ORIGIN`

The gateway receives `AUTH_SERVICE_URL` and `CORE_SERVICE_URL` from the Render service hostports.

## Vercel

Deploy the `frontend` directory as the Vercel project root.

- Build command: `npm run build`
- Output directory: `dist`
- Environment: `VITE_API_URL=https://testhub-gateway.onrender.com`

Update `VITE_API_URL` to the actual Render gateway URL if Render assigns a different hostname.

## Prisma

`core-service` owns database deployment:

```sh
npm run deploy
```

`auth-service` only runs `prisma generate` so it does not try to reconcile its smaller schema against the shared database.
