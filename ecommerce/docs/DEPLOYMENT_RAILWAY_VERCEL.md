# Render + Vercel Deployment

The current backend deployment target is Render through the root-level `render.yaml` Blueprint. Railway remains a Docker-based alternative if you add Railway project config and keep the same production environment variables, but Render is the documented path.

This repo is prepared for:

- Backend API on Render
- Redis-compatible Render Key Value for rate limits and shared cache helpers
- Storefront on Vercel
- Admin frontend on Vercel

Production-ready env templates live in:

- `apps/server/.env.production.example`
- `apps/store-client/.env.production.example`
- `apps/admin-client/.env.production.example`

## Backend: Render

Render should deploy from the repository root using:

- `render.yaml` at the repo root
- `rootDir: ecommerce`
- `buildCommand: npm install && npm run build --workspace @njstore/server`
- `startCommand: npm run start --workspace @njstore/server`

Render settings:

- Service source repo: this repository
- Public health check: `/api/v1/health`
- The Blueprint provisions `njstore-redis` and wires its connection string into `REDIS_URL`.

Required backend env vars:

```env
NODE_ENV=production
LOG_LEVEL=info
PORT=5000

MONGO_URI=mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority&appName=<app>

CLIENT_URL=https://www.example.com
ADMIN_URL=https://admin.example.com
COOKIE_DOMAIN=.example.com

JWT_ACCESS_SECRET=<random-secret>
JWT_REFRESH_SECRET=<random-secret>
JWT_EMAIL_SECRET=<random-secret>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>

SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=<resend-api-key>
RESEND_API_KEY=<resend-api-key>
EMAIL_FROM=<verified-from-email>
EMAIL_FROM_NAME=NJ Store

GOOGLE_CLIENT_ID=<google-web-client-id>
GOOGLE_CLIENT_SECRET=

APP_NAME=NJ Store
FREE_SHIPPING_THRESHOLD=15000
LOW_STOCK_THRESHOLD=5
REDIS_URL=rediss://:<password>@<render-keyvalue-host>:<port>
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
```

Notes:

- `REDIS_URL` should be set in production. If it is blank, the API falls back to in-memory cache/rate-limit state, which is acceptable only for local development or a temporary degraded mode.
- `RESEND_API_KEY` is preferred for email delivery; keep `SMTP_PASS` set to the same key as a fallback. `EMAIL_FROM` must be on your verified Resend domain before sending customer emails.
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER` are optional. Leave them blank unless you want production SMS delivery.
- `GOOGLE_CLIENT_SECRET` can stay blank unless you add a future server-side OAuth exchange flow.

## Storefront: Vercel

Create a Vercel project with:

- Root Directory: `ecommerce`
- Build Command: `npm run build:vercel:store`
- Output Directory: `apps/store-client/dist`

If the Vercel project is accidentally pointed at the repository root, the root `package.json` forwards the same build command into `ecommerce`. The preferred setting is still `Root Directory: ecommerce` because that keeps installs and build output paths simple.

Required store env vars:

```env
VITE_API_URL=https://api.example.com/api/v1
VITE_API_TIMEOUT_MS=30000
VITE_GOOGLE_CLIENT_ID=<google-web-client-id>
VITE_SITE_URL=https://www.example.com
SITEMAP_API_URL=https://api.example.com/api/v1
VITE_ANALYTICS_ENDPOINT=
```

Notes:

- `VITE_SITE_URL` is used by the sitemap generator during the build.
- `SITEMAP_API_URL` lets the storefront build include live catalog URLs in `sitemap.xml`.
- `VITE_GOOGLE_CLIENT_ID` should match the backend `GOOGLE_CLIENT_ID`.
- `VITE_ANALYTICS_ENDPOINT` is optional and can stay blank until analytics ingestion is ready.
- `vercel.json` in this folder enables SPA deep-link refreshes for BrowserRouter routes.

## Admin: Vercel

Create a second Vercel project with:

- Root Directory: `ecommerce`
- Build Command: `npm run build:vercel:admin`
- Output Directory: `apps/admin-client/dist`

Keep production deployments on `master`. Do not promote generated `railway/code-change-*` branches unless their diff has been reviewed against `master`; those branches can be scaffold-only snapshots and may omit the real frontend workspaces.

Required admin env vars:

```env
VITE_API_URL=https://api.example.com/api/v1
VITE_API_TIMEOUT_MS=30000
```

Notes:

- The admin app uses the same backend base URL as the storefront, but it should point at the admin-safe production API origin rather than a relative `/api/v1` path.

The same `vercel.json` rewrite works for the admin app because it is also a Vite SPA using BrowserRouter.

## Domains

Recommended production domains:

- `www.example.com` -> storefront Vercel project
- `admin.example.com` -> admin Vercel project
- `api.example.com` -> Render backend

## Pre-deploy checks

Before deploying, verify locally from `ecommerce`:

```bash
npm run typecheck
npm test
npm run audit
npm run build
npm run build:railway:server
npm run build:vercel:store
npm run build:vercel:admin
```
