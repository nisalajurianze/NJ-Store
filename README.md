<div align="center">

<img src="nj_store_banner.png" alt="NJ Store Banner" width="100%">

<br/>
<br/>

# 🛒 NJ Store

### A Modern Full-Stack E-Commerce Platform

[![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)](https://playwright.dev/)

🚀 **[Live Customer Storefront](https://njstore-project.vercel.app)** &nbsp; | &nbsp; ⚙️ **[Live Admin Dashboard](https://project-first-admin.vercel.app)**

<br/>

**NJ Store** is a production-ready, full-stack e-commerce platform built as a TypeScript monorepo.  
It features a **customer storefront** (PWA with i18n), an **admin dashboard** with analytics, and a **REST API** —  
all powered by modern technologies including AI-driven shopping assistance, real-time notifications,  
multi-language support, and seamless deployment pipelines.

<br/>

[Live Demo](#-live-demo) •
[Getting Started](#-getting-started) •
[Features](#-features) •
[Tech Stack](#-tech-stack) •
[Architecture](#-architecture) •
[Deployment](#-deployment) •
[API Docs](#-api-documentation)

</div>

<br/>

---

## 🌐 Live Demo

Experience the platform live:

- **🏪 Customer Storefront:** [https://njstore-project.vercel.app](https://njstore-project.vercel.app)
- **🛠️ Admin Dashboard:** [https://project-first-admin.vercel.app](https://project-first-admin.vercel.app)

### 🔑 Demo Credentials

To explore the admin panel and shopper features, you can log in using the pre-configured administrator credentials:

| Role | Email Address | Password |
|---|---|---|
| **System Administrator** | `admin@njstore.com` | `Admin@123` |

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🏪 Customer Storefront
- 🔍 Product browsing with advanced filters, sorting & search
- 🛒 Shopping cart with coupon codes
- 📦 Multi-step checkout flow (bank transfer support)
- 📜 Order history with live status tracking
- ⭐ Product reviews, ratings & Q&A
- ❤️ Wishlist management
- 🔄 Product comparison grid
- 📍 Saved address management
- 🏆 Loyalty program & rewards
- 🌐 Multi-language (English 🇬🇧 + සිංහල 🇱🇰)
- 📱 Progressive Web App (PWA) with offline support
- 🔐 Google One Tap sign-in + 2FA
- 🔔 Real-time stock & order updates
- 🎉 Delightful animations & micro-interactions
- 🔎 SEO optimized (sitemap, meta tags, structured data)

</td>
<td width="50%">

### 🛠️ Admin Dashboard
- 📊 Analytics dashboard with interactive charts
- 📦 Full product CRUD with drag-and-drop image sorting
- 🏷️ Category & brand management
- 🎟️ Coupon & discount management
- 📋 Order management & status workflow
- 👥 Customer management & behavior analytics
- ⭐ Review moderation (approve/reject)
- 📦 Inventory tracking & low-stock alerts
- 🔄 Return request handling
- 🖼️ Homepage banner management
- 📢 Broadcast notifications
- ❓ Product Q&A management
- 📝 Audit log viewer
- 📊 Sales & customer analytics
- ⚙️ Store settings & configuration
- 📤 Excel & CSV export

</td>
</tr>
</table>

### 🔧 Platform Capabilities

| Feature | Description |
|---|---|
| **🔑 Auth** | JWT access/refresh tokens with rotation, Google OAuth, email verification, password recovery, 2FA (TOTP) |
| **🤖 AI** | Gemini-powered shopping assistant & admin insights via Vercel AI SDK |
| **⚡ Real-time** | Socket.IO for live stock updates, order status changes & notifications |
| **🌐 i18n** | Multi-language support — English & Sinhala with i18next |
| **📱 PWA** | Installable progressive web app with service worker & offline support |
| **☁️ Cloud Storage** | Cloudinary for product images, avatars & generated assets |
| **📧 Email** | Transactional emails via Resend, SMTP (Gmail, SendGrid, etc.) |
| **📄 PDF** | Server-side invoice & quotation generation with PDFKit |
| **📊 CSV/Excel** | Data import (CSV) and export (Excel, CSV) for products & orders |
| **🛡️ Security** | Helmet, CORS, CSRF protection, HPP, input sanitization, rate limiting (Redis-backed), Zod validation |
| **📈 Monitoring** | Structured logging (Winston + Morgan), performance monitoring, health checks |
| **🧪 Testing** | Unit tests (Vitest), E2E tests (Playwright — Chromium, Firefox, WebKit), coverage reports |
| **🔄 CI/CD** | GitHub Actions — typecheck → audit → test:coverage → build → E2E |
| **🔎 SEO** | Sitemaps, meta tags, react-helmet-async, robots.txt, structured URLs |

---

## 🧰 Tech Stack

<table>
<tr>
<td align="center" width="33%">

### 🖥️ Frontend
**React 18** · **Vite 6** · **TypeScript 5.8**  
**Tailwind CSS 3** · **Framer Motion**  
**React Query** · **React Hook Form**  
**Zod** · **React Router 6**  
**i18next** · **Lucide Icons**  
**Recharts** · **@dnd-kit**  
**Embla Carousel** · **Lottie**  
**react-helmet-async** (SEO)  
**Inter** + **JetBrains Mono** fonts

</td>
<td align="center" width="33%">

### ⚙️ Backend
**Express 5** · **TypeScript 5.8**  
**Mongoose 8** · **ioredis**  
**Socket.IO** · **JWT** · **Speakeasy** (2FA)  
**Cloudinary** · **Multer**  
**Nodemailer** · **Resend**  
**PDFKit** · **csv-parse/stringify**  
**Winston** · **Morgan**  
**Swagger** · **Zod** · **Envalid**  
**Helmet** · **HPP** · **sanitize-html**

</td>
<td align="center" width="33%">

### 🏗️ Infrastructure
**Docker** · **Docker Compose**  
**MongoDB 7** (Replica Set + Auth)  
**Redis 7**  
**Vercel** (Frontends)  
**Render / Railway** (API)  
**GitHub Actions** (CI/CD)  
**Playwright** (E2E)  
**Vitest** (Unit + Coverage)

</td>
</tr>
</table>

---

## 🏗️ Architecture

```
NJ Store
├── 📁 .github/workflows/       # CI pipeline (typecheck → audit → test → build → E2E)
├── 📁 docs/                     # Project documentation & proposals
├── 🐳 Dockerfile                # Multi-stage production build for API
├── ⚙️ railway.toml               # Railway deployment config
├── ⚙️ render.yaml                # Render Blueprint (API + Redis)
│
└── 📁 ecommerce/                # Monorepo root (npm workspaces)
    │
    ├── 📁 apps/
    │   ├── 📁 store-client/     # 🏪 Customer storefront (React + Vite + PWA)
    │   │   ├── 📁 src/pages/    #    Home, Shop, ProductDetail, Cart, Checkout,
    │   │   │                    #    Compare, Quotation, Auth, Dashboard, Static
    │   │   └── 📁 src/pwa/     #    Service worker & PWA registration
    │   │
    │   ├── 📁 admin-client/     # 🛠️ Admin dashboard (React + Vite)
    │   │   └── 📁 src/pages/    #    Dashboard, Products, Orders, Categories,
    │   │                        #    Brands, Coupons, Inventory, Users, Reviews,
    │   │                        #    Returns, Banners, Settings, Analytics, Audit
    │   │
    │   └── 📁 server/           # ⚙️ REST API (Express 5 + MongoDB + Redis)
    │       ├── 📁 src/routes/   #    17 public + 7 admin route modules
    │       ├── 📁 src/models/   #    31 Mongoose models
    │       ├── 📁 src/services/ #    33+ service modules
    │       └── 📁 src/middleware/#    11 middleware modules
    │
    ├── 📁 packages/
    │   ├── 📁 types/            # 📝 48+ shared TypeScript type definitions
    │   ├── 📁 utils/            # 🔧 Shared utilities, validation & constants
    │   └── 📁 ui/               # 🎨 Shared React UI component library
    │
    ├── 📁 e2e/                  # 🧪 Playwright E2E tests (6 spec suites)
    ├── 📁 scripts/              # 🔨 Dev & deployment scripts
    ├── 🐳 docker-compose.yml    # Dev services (Mongo + Redis + Server)
    ├── 🐳 docker-compose.prod.yml # Production overlay
    └── ⚙️ vercel.json            # SPA deployment + PWA caching config
```

### Monorepo Packages

| Package | Scope | Description |
|---|---|---|
| `@njstore/store-client` | `apps/store-client` | Customer-facing storefront SPA (PWA, i18n, SEO) |
| `@njstore/admin-client` | `apps/admin-client` | Admin dashboard with analytics & Excel export |
| `@njstore/server` | `apps/server` | Express 5 REST API with WebSocket, 2FA, PDF, CSV |
| `@njstore/types` | `packages/types` | 48+ shared TypeScript type definitions & DTOs |
| `@njstore/utils` | `packages/utils` | LKR formatting, validation, `cn()` helper & constants |
| `@njstore/ui` | `packages/ui` | Shared React UI primitives (Framer Motion + Tailwind) |

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version |
|---|---|
| **Node.js** | 22 LTS |
| **npm** | 10+ |
| **Docker** | Latest (for local MongoDB & Redis) |

### 1️⃣ Clone & Install

```bash
git clone https://github.com/nisalajurianze/NJ-Store.git
cd NJ-Store/ecommerce
npm install
```

### 2️⃣ Set Up Environment

Copy the example environment files:

```bash
# Server
cp apps/server/.env.example apps/server/.env

# Store client (optional for local dev)
cp apps/store-client/.env.example apps/store-client/.env

# Admin client (optional for local dev)
cp apps/admin-client/.env.example apps/admin-client/.env
```

> **💡 Tip:** The API boots in development with built-in defaults. Frontend `.env` files are optional — if you create them, keep `VITE_API_URL=/api/v1` so Vite proxies API and Socket.IO traffic correctly.

### 3️⃣ Start Database Services

```bash
npm run docker:mongo:up
```

This brings up:
- **MongoDB 7** — Authenticated single-node replica set (`rs0`) with keyfile auth
- **Redis 7** — Password-protected key-value store

> Default local MongoDB URI:  
> `mongodb://njstore:njstore-dev-mongo-password@127.0.0.1:27017/njstore?authSource=admin&replicaSet=rs0`

### 4️⃣ Start Development

```bash
npm run dev
```

This launches all three apps concurrently:

| Service | URL |
|---|---|
| 🏪 Storefront | http://localhost:5173 |
| 🛠️ Admin Panel | http://localhost:5174 |
| ⚙️ API Server | http://localhost:5000 |
| 📚 API Docs (Swagger) | http://localhost:5000/api/v1/docs |
| 💚 Health Check | http://localhost:5000/api/v1/health |

### 5️⃣ Seed Demo Data

```bash
npm run seed
```

> Set `SEED_ADMIN_PASSWORD` and `SEED_CUSTOMER_PASSWORD` in `apps/server/.env` before seeding for stable demo credentials.

<details>
<summary>📋 <strong>Seeded Data Overview</strong></summary>

| Data | Details |
|---|---|
| 👤 Admin | `admin@njstore.com` (password: `Admin@123` or custom from `SEED_ADMIN_PASSWORD`) |
| 👥 Customers | 5 demo customers (shared password from `SEED_CUSTOMER_PASSWORD` or printed) |
| 📂 Categories | 8 electronics categories |
| 📦 Products | 20 electronics products |
| 🎟️ Coupons | `SAVE10`, `TECH500`, `FREESHIP` |
| 📋 Orders | Sample orders across multiple statuses |
| ⭐ Reviews | Approved verified-buyer reviews |

</details>

---

## 🪟 Windows One-Command Startup

If you're on Windows with Docker Desktop, the fastest way to get everything running:

```powershell
npm run dev:windows
```

This automatically:
- ✅ Starts Docker Desktop if needed
- ✅ Brings up MongoDB container with replica set initialization
- ✅ Seeds demo data when the database is empty
- ✅ Launches API, storefront & admin dev servers

To stop all background processes:

```powershell
npm run dev:windows:stop
```

> Runtime logs are written to `%LOCALAPPDATA%\NJStore`

---

## 📜 Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start all apps concurrently |
| `npm run dev:windows` | One-command Windows startup (Docker + seed + dev) |
| `npm run dev:windows:stop` | Stop Windows background processes |
| `npm run dev:server` | Start API server only |
| `npm run dev:store` | Start storefront only |
| `npm run dev:admin` | Start admin dashboard only |
| `npm run build` | Build all packages and apps |
| `npm run typecheck` | TypeScript type checking across all packages |
| `npm run lint` | ESLint across all apps |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:coverage` | Run tests with coverage reports |
| `npm run e2e` | Run E2E tests (Playwright) |
| `npm run seed` | Seed demo data |
| `npm run seed:reset` | Reset & re-seed data |
| `npm run docker:mongo:up` | Start MongoDB & Redis containers |
| `npm run docker:mongo:down` | Stop MongoDB & Redis containers |
| `npm run analyze:store` | Bundle analysis for storefront |
| `npm run analyze:admin` | Bundle analysis for admin |

---

## 🌐 Deployment

### Architecture Overview

```
                        ┌─────────────────┐
                        │    Internet     │
                        └────────┬────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
       ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
       │   Vercel    │   │   Vercel    │   │   Render /  │
       │ Storefront  │   │   Admin     │   │   Railway   │
       │  (PWA SPA)  │   │ (React SPA) │   │  (Express)  │
       └──────┬──────┘   └──────┬──────┘   └──┬───────┬──┘
              │                 │              │       │
              └────────┬────────┘       ┌──────▼┐ ┌───▼──────┐
                       │                │MongoDB│ │  Redis   │
                       └────────────────│(Atlas)│ │(Managed) │
                          REST + WS     └───────┘ └──────────┘
```

### Platform Configuration

| Component | Platform | Config File |
|---|---|---|
| Storefront (PWA) | Vercel | `vercel.json` — SPA routing, PWA caching, service worker |
| Admin Panel | Vercel | `vercel.json` — SPA routing, asset caching |
| API Server | Render | `render.yaml` — Blueprint with managed Redis |
| API Server (alt) | Railway | `railway.toml` — Dockerfile build, health checks |
| Full Stack | Docker | `Dockerfile` + `docker-compose.prod.yml` |

### Vercel Configuration Highlights

- **Asset caching:** Immutable, 1-year cache for hashed assets
- **PWA files:** 1-day cache with `stale-while-revalidate`
- **Service Worker:** `no-cache` (always fresh)
- **SEO files:** 1-hour cache for `sitemap.xml` & `robots.txt`
- **SPA routing:** All non-asset routes rewrite to `/index.html`

### Production Domains

The auth system uses HttpOnly cookies designed for same-site first-party domains:
- `www.njstore.com` — Storefront
- `admin.njstore.com` — Admin Dashboard
- `api.njstore.com` — API Server

---

## 📧 Email Configuration

The API sends real emails only when SMTP credentials are configured. Without credentials, it falls back to a development preview transport.

<details>
<summary><strong>📨 Resend (Recommended for Production)</strong></summary>

```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=your-resend-api-key
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=no-reply@yourdomain.com
EMAIL_FROM_NAME=NJ Store
```

> `RESEND_API_KEY` is the preferred delivery path (HTTPS API). Keep `SMTP_PASS` set as a compatibility fallback.
> `EMAIL_FROM` must be an address on a verified Resend domain.

</details>

<details>
<summary><strong>📧 Gmail (Local Development)</strong></summary>

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourgmail@gmail.com
SMTP_PASS=your-16-char-app-password
EMAIL_FROM=yourgmail@gmail.com
EMAIL_FROM_NAME=NJ Store
```

> Requires 2-Step Verification enabled with an App Password.

</details>

<details>
<summary><strong>📬 SendGrid</strong></summary>

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
EMAIL_FROM=no-reply@yourdomain.com
EMAIL_FROM_NAME=NJ Store
```

</details>

---

## 🔐 Google Sign-In

The storefront supports Google Identity Services for both button and One Tap sign-in.

**Required environment variables:**

```env
# apps/store-client/.env
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# apps/server/.env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=optional-for-future-flows
```

**Google Cloud Console setup:**
- Add authorized JavaScript origins for `http://localhost:5173` and your production domain
- Use the same web client ID in both frontend and API
- The implementation posts the Google ID token to `/api/v1/auth/google`

---

## 📚 API Documentation

Interactive API documentation is available via Swagger UI:

| Endpoint | Description |
|---|---|
| `GET /api/v1/docs` | Swagger UI (interactive) |
| `GET /api/v1/docs.json` | OpenAPI specification (JSON) |
| `GET /api/v1/health` | Health check |

### API Routes

<details>
<summary><strong>🔓 Public Routes (17 modules)</strong></summary>

| Module | Description |
|---|---|
| **Auth** | Register, login, Google OAuth, token refresh, logout, email verification, password reset, 2FA (TOTP) |
| **Products** | Listing, search, filtering, sorting, pagination, product detail |
| **Categories** | Category tree browsing |
| **Brands** | Brand browsing |
| **Cart** | Add, update, remove items, apply coupons |
| **Orders** | Place orders, track status, order history |
| **Reviews** | Submit reviews & ratings |
| **Coupons** | Validate & apply discount codes |
| **Banners** | Homepage hero banners |
| **Home Feed** | Curated homepage content feed |
| **Contact** | Contact form submission |
| **Newsletter** | Newsletter subscription |
| **Notifications** | User notification feed |
| **Analytics** | Client-side analytics events |
| **Site Config** | Public site configuration |
| **Footer** | Footer content & links |

</details>

<details>
<summary><strong>🔒 Admin Routes (7 modules)</strong></summary>

| Module | Description |
|---|---|
| **Analytics** | Sales revenue, customer behavior, top products, trends |
| **Catalog** | Product / category / brand / banner CRUD, image uploads, inventory |
| **Coupons** | Coupon CRUD, usage tracking |
| **Orders** | Order management, status workflow, PDF invoices, CSV export |
| **Users** | Customer management, roles, permissions |
| **Settings** | Store settings, site configuration, email templates |
| **Notifications** | Admin broadcast notifications |

</details>

### Data Models

The API uses **31 Mongoose models** including: User, Product, Order, Cart, Review, Brand, Category, Banner, Coupon, CouponUsage, Wishlist, CompareList, Notification, NewsletterSubscriber, AuditLog, LoyaltyTransaction, ReturnRequest, ProductQuestion, ProductVersion, RefreshSession, BackInStockSubscription, CustomerBehaviorEvent, EmailTemplate, SiteConfig, StoreSetting, and more.

---

## 🧪 Testing

### Unit Tests

```bash
# Run all unit tests
npm run test

# Run with coverage reports
npm run test:coverage
```

Tests use **Vitest** with `@testing-library/react` for component tests and **mongodb-memory-server** for server integration tests.

### E2E Tests

```bash
# Run Playwright tests (auto-starts API on port 5010)
npm run e2e
```

**6 E2E test suites:**

| Spec | Coverage |
|---|---|
| `admin-smoke.spec.ts` | Admin dashboard smoke tests |
| `api-infra.spec.ts` | API infrastructure & health checks |
| `auth.spec.ts` | Authentication flows |
| `cart.spec.ts` | Shopping cart operations |
| `checkout.spec.ts` | Checkout flow |
| `products.spec.ts` | Product browsing & interaction |

Tests run across **Chromium**, **Firefox**, and **WebKit** browsers with screenshot, trace, and video capture on failure.

> Set `PLAYWRIGHT_BASE_URL` to override the target, or `PLAYWRIGHT_REUSE_SERVER=true` to test against an already-running server.

### CI/CD Pipeline

The GitHub Actions pipeline runs on every push to `main` and all PRs:

```
Checkout → Node.js 22 Setup → Install → TypeScript Check → Audit
→ Test with Coverage → Upload Coverage → Build → Playwright E2E
→ Upload Playwright Report
```

---

## 🐳 Docker

### Development (Database Services)

```bash
# Start MongoDB (replica set + auth) & Redis
npm run docker:mongo:up

# Stop services
npm run docker:mongo:down
```

### Full Stack (Docker Compose)

```bash
docker compose up
```

Includes MongoDB 7.0 (authenticated replica set), Redis 7.2-alpine, and the API server with health-check dependencies.

### Production Build

```bash
docker build -t njstore-api .
docker run -p 5000:5000 njstore-api
```

The Dockerfile uses a **multi-stage build** (`node:22-bookworm-slim`):
1. **Build stage** — Install, compile TypeScript (types → utils → server), prune dev deps
2. **Runtime stage** — Minimal production image, port 5000

For hardened production, use `docker-compose.prod.yml` overlay with keyfile auth and no exposed ports.

---

## 📁 Environment Variables

<details>
<summary><strong>⚙️ Server Environment Variables</strong></summary>

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | ✅ | `development` or `production` |
| `PORT` | ❌ | Server port (default: 5000) |
| `MONGO_URI` | ✅ | MongoDB connection string |
| `REDIS_URL` | ❌ | Redis connection string |
| `JWT_ACCESS_SECRET` | ✅ | JWT access token secret |
| `JWT_REFRESH_SECRET` | ✅ | JWT refresh token secret |
| `JWT_EMAIL_SECRET` | ✅ | JWT email verification secret |
| `JWT_ACCESS_EXPIRES` | ❌ | Access token expiry (default: 15m) |
| `JWT_REFRESH_EXPIRES` | ❌ | Refresh token expiry (default: 7d) |
| `CLIENT_URL` | ✅ | Storefront URL |
| `ADMIN_URL` | ✅ | Admin dashboard URL |
| `COOKIE_DOMAIN` | ✅ | Cookie domain for auth |
| `CLOUDINARY_CLOUD_NAME` | ❌ | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | ❌ | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | ❌ | Cloudinary API secret |
| `SMTP_HOST` | ❌ | SMTP server host |
| `SMTP_PORT` | ❌ | SMTP server port |
| `SMTP_USER` | ❌ | SMTP username |
| `SMTP_PASS` | ❌ | SMTP password |
| `RESEND_API_KEY` | ❌ | Resend API key (preferred email delivery) |
| `EMAIL_FROM` | ❌ | Sender email address |
| `EMAIL_FROM_NAME` | ❌ | Sender display name |
| `GOOGLE_CLIENT_ID` | ❌ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ❌ | Google OAuth client secret |
| `FREE_SHIPPING_THRESHOLD` | ❌ | Free shipping amount in LKR (default: 15000) |
| `LOW_STOCK_THRESHOLD` | ❌ | Low stock alert threshold (default: 5) |
| `LOG_LEVEL` | ❌ | Winston log level (default: info) |
| `LOG_FILE_ENABLED` | ❌ | Enable file logging |
| `LOG_FILE_DIR` | ❌ | Log file directory |
| `LOG_FILE_MAX_SIZE` | ❌ | Max log file size (default: 10m) |
| `LOG_FILE_MAX_FILES` | ❌ | Max number of log files (default: 5) |
| `SEED_ADMIN_PASSWORD` | ❌ | Stable admin password for seeding |
| `SEED_CUSTOMER_PASSWORD` | ❌ | Stable customer password for seeding |

</details>

<details>
<summary><strong>🏪 Store Client Environment Variables</strong></summary>

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | ❌ | API base URL (default: `/api/v1`) |
| `VITE_GOOGLE_CLIENT_ID` | ❌ | Google OAuth web client ID |

</details>

<details>
<summary><strong>🛠️ Admin Client Environment Variables</strong></summary>

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | ❌ | API base URL (default: `/api/v1`) |

</details>

---

## 📂 Documentation

Additional documentation is available in `ecommerce/docs/`:

| Document | Description |
|---|---|
| `DEPLOYMENT_RAILWAY_VERCEL.md` | Detailed deployment guide for Railway + Vercel |
| `SECURITY_STATUS.md` | Security audit & status report |
| `WEBSITE_AUDIT_REPORT.md` | Website audit with screenshots |
| `WEB_PROJECT_QUALITY_PLAYBOOK.md` | Quality standards & best practices |

---

## 🤝 Contributing
Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, development workflow, and the process for submitting pull requests.

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ using TypeScript**

*NJ Store — Modern E-Commerce Platform for Sri Lanka 🇱🇰*

</div>
