# Cloudflare deployment

System behavior, operations, security notes, and account transfer procedures are
documented in `docs/HANDOVER_SPEC.md`.

Cloudflare's current Pages deployment runs on Workers with Static Assets. The
React frontend and API are deployed together as one Worker backed by D1.

## 1. Create and configure D1

From the `cloudflare` directory:

```powershell
npm install
npx wrangler login
npx wrangler d1 create venture-platform-db
```

Copy the returned database ID into `cloudflare/wrangler.toml`, then apply the
schema and indexes:

```powershell
npm run db:migrate:remote
```

## 2. Configure Worker secrets

```powershell
npx wrangler secret put APP_ACCESS_CODE
npx wrangler secret put JOB_INFO_ADMIN_KEY
npm run deploy
```

Update `ALLOWED_ORIGINS` in `cloudflare/wrangler.toml` with the final Worker
domain before the production deploy. Do not put either secret in the file.

## 3. Build and deploy

Build the frontend, then deploy the Worker and its static assets:

```powershell
cd ..\frontend
npm install
npm run build
cd ..\cloudflare
npm run deploy
```

The existing URLs remain available:

- Customer view: `/`
- Store monitor: `/?view=store-monitor`
- Store tablet: `/?view=store-tablet`

The Worker runs the daily checkout reset at 21:00 Japan time using the cron
trigger in `wrangler.toml`.

## Local development

Apply the local D1 migration and start the API:

```powershell
cd cloudflare
npm install
npm run db:migrate:local
npm run dev
```

Create `frontend/.env.local` with the local Worker URL when running Vite and
the Worker separately:

```text
VITE_API_BASE_URL=http://localhost:8787
```
