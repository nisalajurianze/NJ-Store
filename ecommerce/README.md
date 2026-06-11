# NJ Store Monorepo

NJ Store is a production-oriented e-commerce monorepo with three separately deployable apps:

- `apps/store-client`: customer storefront
- `apps/admin-client`: separate admin dashboard
- `apps/server`: shared Express + MongoDB API

Shared packages:

- `packages/types`: DTOs, enums, response contracts
- `packages/utils`: formatting, validation helpers, shared constants
- `packages/ui`: reusable React UI primitives for both frontends

## Stack

- React 18 + TypeScript + Vite for both frontends
- Express + TypeScript + Mongoose 8 for the API
- JWT access/refresh auth with rotation
- Tailwind CSS, React Query, React Hook Form, Zod, Framer Motion
- Cloudinary uploads, Nodemailer email, PDFKit quotation/invoice generation

## Monorepo Layout

```text
ecommerce/
  apps/
    admin-client/
    server/
    store-client/
  packages/
    types/
    ui/
    utils/
```

## Environment Files

Copy the example files when you need to customize local or production settings:

- [`apps/server/.env.example`](/D:/Project%20First/ecommerce/apps/server/.env.example)
- [`apps/server/.env.production.example`](/D:/Project%20First/ecommerce/apps/server/.env.production.example)
- [`apps/store-client/.env.example`](/D:/Project%20First/ecommerce/apps/store-client/.env.example)
- [`apps/store-client/.env.production.example`](/D:/Project%20First/ecommerce/apps/store-client/.env.production.example)
- [`apps/admin-client/.env.example`](/D:/Project%20First/ecommerce/apps/admin-client/.env.example)
- [`apps/admin-client/.env.production.example`](/D:/Project%20First/ecommerce/apps/admin-client/.env.production.example)

## Root Scripts

- `npm run dev`
- `npm run dev:windows`
- `npm run dev:windows:stop`
- `npm run dev:server`
- `npm run dev:store`
- `npm run dev:admin`
- `npm run docker:mongo:up`
- `npm run docker:mongo:down`
- `npm run build`
- `npm run typecheck`
- `npm run test`
- `npm run test:coverage`
- `npm run lint`
- `npm run audit`
- `npm run e2e`
- `npm run seed`

`npm run e2e` starts the API on a dedicated Playwright port (`5010`) by default so old local dev servers on `5000` cannot produce stale false results. Set `PLAYWRIGHT_BASE_URL` to override the target, or set `PLAYWRIGHT_REUSE_SERVER=true` when you intentionally want to test against an already-running server.

## Local Setup

1. Install Node.js 22 LTS and npm.
2. Install dependencies from the repo root:

```bash
npm install
```

3. The API can boot in development with built-in defaults, but copying [`apps/server/.env.example`](/D:/Project%20First/ecommerce/apps/server/.env.example) to `.env` is still recommended when you want to customize secrets or services.
4. Frontend `.env` files are optional for local development. If you create them, keep `VITE_API_URL=/api/v1` so Vite can proxy API and Socket.IO traffic to the local server.
5. Start MongoDB locally, use the included Docker Compose services, or provide an Atlas connection string in `apps/server/.env`.
   The repo-local Docker setup runs authenticated MongoDB as a single-node replica set, brings up Redis with a password, and can start the API only after MongoDB is healthy and the replica set is writable.
   If you previously used the older unauthenticated local volumes, reset them once with `docker compose down -v` before switching to the secured compose setup.
   The default local MongoDB URI is `mongodb://njstore:njstore-dev-mongo-password@127.0.0.1:27017/njstore?authSource=admin&replicaSet=rs0`.
6. Start the apps:

```bash
npm run dev
```

7. Seed demo data when you want a fresh local catalog:

```bash
npm run seed
```

If you want stable demo credentials instead of one-time generated passwords in the seed output, set `SEED_ADMIN_PASSWORD` and `SEED_CUSTOMER_PASSWORD` in `apps/server/.env` before running the seed script.

## Windows One-Command Startup

If you are working on Windows with Docker Desktop, the fastest local boot path is:

```bash
npm run dev:windows
```

That script will:

- start Docker Desktop if needed
- bring up the repo-local MongoDB container (`njstore-mongo`)
- initialize the local MongoDB replica set (`rs0`) if needed
- seed demo data only when the local database is empty
- launch the API, storefront, and admin dev servers in the background

To stop the background dev processes later:

```bash
npm run dev:windows:stop
```

Runtime logs are written to `%LOCALAPPDATA%\\NJStore`.

## Real Email Setup

The API sends real emails only when SMTP credentials are configured in [`apps/server/.env`](/D:/Project%20First/ecommerce/apps/server/.env). If `SMTP_USER` or `SMTP_PASS` is blank, the app falls back to a development preview transport and does not deliver to real inboxes.

### Resend SMTP

1. Create a Resend API key.
2. Verify your sending domain in Resend.
3. Set these server env vars:

```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=your-resend-api-key
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=no-reply@yourdomain.com
EMAIL_FROM_NAME=NJ Store
```

`RESEND_API_KEY` is the preferred delivery path because it uses Resend's HTTPS API. Keep `SMTP_PASS` set to the same key as a compatibility fallback while older deployments roll forward.

`EMAIL_FROM` must be an address on a verified Resend domain for customer delivery. `onboarding@resend.dev` is only suitable for Resend test sends and should not be used for production order, password reset, or verification emails. After changing email settings, restart or redeploy the server.

### Gmail for Local Development

Use a Gmail account with 2-Step Verification enabled and create an App Password. Then set:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourgmail@gmail.com
SMTP_PASS=your-16-char-app-password
EMAIL_FROM=yourgmail@gmail.com
EMAIL_FROM_NAME=NJ Store
```

### Other SMTP Providers

You can still use another SMTP provider by overriding the same variables. For example, SendGrid uses:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
EMAIL_FROM=no-reply@yourdomain.com
EMAIL_FROM_NAME=NJ Store
```

## Auth and Deployment Notes

- Refresh tokens are issued as HttpOnly cookies and are designed for same-site first-party domains such as:
  - `www.njstore.com`
  - `admin.njstore.com`
  - `api.njstore.com`
- Storefront and admin clients are intended for Vercel.
- The server is intended for Render, with the root `render.yaml` provisioning a Render Key Value/Redis service for shared cache and production rate-limit state. Railway remains possible if you mirror the same env vars.
- Cloudinary is used for product images, avatars, receipts, and generated document assets when credentials are configured.
- In development, uploads can fall back to the local `public/uploads` directory.

## Google Sign-In

The storefront auth pages use Google Identity Services for both the button and browser-assisted One Tap sign-in. When the shopper is already signed into Google in the same browser, Google can offer a direct account choice or auto-select flow without retyping email and password.

Required environment values:

```env
# apps/store-client/.env
VITE_GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com

# apps/server/.env
GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=optional-for-future-server-oauth-flows
```

Google Cloud Console setup for the web client:

- Add authorized JavaScript origins for local and production storefronts such as `http://localhost:5173` and your live store domain.
- Use the same web client ID in both the storefront and the API so the server can verify the ID token issued by Google.
- The current implementation posts the Google ID token to `/api/v1/auth/google`, so traditional OAuth redirect URIs are not required for this button/One Tap flow.

## Seeded Data

The seed script creates:

- 1 admin user: `admin@njstore.com` with a password from `SEED_ADMIN_PASSWORD` or a generated password printed during seeding
- 5 demo customers
- 8 categories
- 20 electronics products
- active coupons (`SAVE10`, `TECH500`, `FREESHIP`)
- sample orders across multiple statuses
- approved verified-buyer reviews

The demo customer accounts share the `SEED_CUSTOMER_PASSWORD` value when it is set; otherwise the seed script generates one shared demo-customer password for that run and prints it to the console.

## Health Check

- `GET /api/v1/health`

## API Docs

- Swagger UI: `GET /api/v1/docs`
- OpenAPI JSON: `GET /api/v1/docs.json`

## Local URLs

- Storefront: `http://localhost:5173`
- Admin: `http://localhost:5174`
- API health: `http://localhost:5000/api/v1/health`
- API docs: `http://localhost:5000/api/v1/docs`
