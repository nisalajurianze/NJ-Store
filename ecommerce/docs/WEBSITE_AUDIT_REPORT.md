# NJ Store Website Audit Report

Date: 2026-05-12

## Scope

Audited the `ecommerce` monorepo as a production website project:

- Customer storefront: `apps/store-client`
- Admin dashboard: `apps/admin-client`
- API/server: `apps/server`
- Shared packages: `packages/types`, `packages/utils`, `packages/ui`
- Deployment/config: Docker, Render, Railway, Vercel, PWA, sitemap, tests

## Verification Summary

| Check | Result | Notes |
| --- | --- | --- |
| `npm run typecheck` | Pass | All workspaces typechecked. |
| `npm run test` | Pass | 466 tests passed across packages, server, store, and admin. |
| `npm run audit` | Pass | `found 0 vulnerabilities`. |
| `npm run build` | Pass with warning | Store/admin/server build succeeded. Store sitemap generated only static URLs because no absolute API URL was configured. |
| `npm run e2e` default port | Mixed | 8/9 passed; checkout failed once with `ECONNRESET` against existing/reused `127.0.0.1:5000` server. |
| `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5010 npm run e2e` | Pass | 9/9 passed on a clean Playwright-managed port. |
| Local visual smoke | Pass with issues | Storefront rendered desktop/mobile without horizontal overflow, but console warning and content-readiness issues were observed. |

Screenshots captured:

- `audit-screenshots/home-desktop.png`
- `audit-screenshots/home-mobile.png`

## Overall Verdict

This is a strong, production-oriented e-commerce project. It already has a real feature set, good TypeScript coverage, security middleware, admin operations, SEO components, PWA support, API documentation, and broad automated tests.

The biggest gaps are not basic functionality. The main problems are production polish and long-term maintainability:

- Some visible live/demo content is not ready for a professional public website.
- The catalog page lacks a real `h1`.
- The store is still a client-rendered SPA, so product/category SEO depends heavily on runtime JS and the sitemap build.
- Very large UI/service files increase regression risk.
- The "lint" command is not a real lint/static-quality pass.
- Upload temp files appear not to be cleaned after disk-based multer uploads.
- Local e2e can accidentally reuse a stale server and produce misleading failures.

## Strengths

1. Strong domain coverage

The storefront supports home merchandising, shop filters, product detail, cart, quotation checkout, compare, wishlist, account dashboard, returns/static pages, Google login, newsletter, and PWA/offline basics.

2. Admin system is mature

The admin app includes dashboard, products, inventory, orders, returns, users, coupons, reviews, categories, banners, settings, broadcasts, audit logs, sales analysis, and permissions.

3. Security baseline is good

The server uses Helmet CSP/HSTS, CORS allow-listing, rate limiters, Mongo payload sanitization, XSS sanitizer, HPP, JWT access/refresh sessions, HttpOnly refresh cookies, upload MIME signature verification, and audit logging.

4. SEO foundations exist

The store has route-level Helmet metadata, canonical handling, product JSON-LD, OpenGraph/Twitter tags, robots/sitemap generation, noindex on private/cart/checkout routes, and product/category sitemap support when API URL is configured.

5. Test coverage is broad

Unit/integration tests cover server business rules, store flows, admin flows, UI primitives, auth, cart, checkout, product variants, security headers, sanitization, rate limits, and admin operations.

6. Deployment work is already present

There are Docker, Render, Railway, Vercel, environment examples, health checks, and workspace build scripts.

## Priority Findings

### P1 - Public content is not production ready

Observed on the local storefront home page:

- `Your hero headline preview will appear here.`
- `Add supporting copy to show how the compact hero should appear on the storefront.`
- Product/copy typos such as `I Phone 17 pro`, `CAMARA`, and `STOREGE`.

Why it matters:

This is the first viewport. Even if the code is solid, placeholder headline text and spelling mistakes make the site look unfinished and reduce trust.

Recommendation:

- Add a pre-launch content QA checklist for admin-managed homepage/banner/product copy.
- Add validation or warnings in the admin home-banner editor when required hero title/subtitle are empty or still default placeholders.
- Add optional spellcheck/editor review for product feature rows.

### P1 - Shop page has no real page `h1`

Evidence:

- `apps/store-client/src/pages/Shop.tsx` renders `SeoHead` and breadcrumbs, then a toolbar where the visual headline is a `<p>`, not an `h1`.
- Browser smoke check found no `h1` on `/shop`.

Why it matters:

Catalog pages are important SEO landing pages. A missing `h1` weakens semantic structure and accessibility.

Recommendation:

- Add a visible or visually-hidden `h1` near the top of `Shop.tsx`, e.g. `Shop Electronics`.
- If filters/search are active, keep the `h1` stable and use secondary text for result counts.

### P1 - Dynamic sitemap can silently degrade to only 8 static URLs

Evidence:

- Production build succeeded, but emitted:
  - `SITEMAP_API_URL or an absolute VITE_API_URL was not provided. Generated a static-route sitemap only.`
  - `Generated 8 URLs.`
- `apps/store-client/scripts/generate-sitemap.mjs` only fetches products/categories when `SITEMAP_API_URL` or absolute `VITE_API_URL` is available.

Why it matters:

Without product/category URLs in `sitemap.xml`, search engines may discover catalog pages more slowly. For an e-commerce site, this is a major SEO gap.

Recommendation:

- Set `SITEMAP_API_URL=https://api-domain/api/v1` during storefront production builds.
- Fail the production build if dynamic sitemap generation is expected but unavailable.
- Include category slug/canonical category pages if those are added later.

### P1 - Upload temp files are not visibly cleaned up

Evidence:

- `apps/server/src/middleware/upload.ts` uses `multer.diskStorage` with `os.tmpdir()`.
- `apps/server/src/services/uploadService.ts` reads/copies/uploads `file.path`, but no `unlink`/temp cleanup was found.

Why it matters:

Receipt/product/avatar/admin uploads can leave temp files behind. On long-running servers this can waste disk space and eventually cause failures.

Recommendation:

- Add a `finally` cleanup after every disk-backed upload path.
- Or switch to memory storage with strict file-size limits where practical.
- Add a test that verifies temp files are removed after success and failure.

### P2 - The lint command is only TypeScript

Evidence:

- Root `lint` delegates to workspace `lint`.
- Store/admin/server/package lint scripts run `tsc --noEmit` or equivalent.
- No ESLint/Prettier/static accessibility lint pass is configured.

Why it matters:

TypeScript will not catch unused UI props, hook dependency issues, unsafe accessibility patterns, inconsistent formatting, or many React anti-patterns.

Recommendation:

- Add ESLint with TypeScript, React hooks, jsx-a11y, import rules, and testing-library rules.
- Add Prettier or formatting enforcement.
- Keep `typecheck` separate from `lint`.

### P2 - React console warning from `fetchPriority`

Evidence:

Local visual smoke on `/` logged:

`React does not recognize the fetchPriority prop on a DOM element...`

Occurrences:

- `apps/store-client/src/components/home/HeroSection.tsx`
- `apps/store-client/src/components/product/ProductTile.tsx`

Why it matters:

Console warnings make debugging real production issues harder and may indicate React/browser attribute mismatch.

Recommendation:

- Use the attribute form supported by the current React/browser setup, or extend typings and verify no warning in development.
- Add a lightweight Playwright console-error check for key public pages.

### P2 - Very large files make changes risky

Largest files observed:

- `apps/store-client/src/components/product/ProductCard.tsx`: 2252 lines
- `apps/server/src/services/orderService.ts`: 2378 lines
- `apps/server/src/services/adminService.ts`: 1990 lines
- `apps/store-client/src/pages/Shop.tsx`: 1498 lines
- `apps/store-client/src/components/home/HeroSection.tsx`: 1256 lines
- `apps/admin-client/src/pages/admin/Settings.tsx`: 1115 lines

Why it matters:

These files mix many concerns and are harder to review, test, and safely extend. The risk is future regression, not current failure.

Recommendation:

- Split by behavior, not just by JSX chunks.
- Suggested first targets:
  - `ProductCard`: media preview, variant/options drawer, action buttons, analytics/navigation.
  - `Shop`: URL-state/filter model, toolbar, search suggestions, results virtualization.
  - `orderService`: quotation creation, confirmation, receipts, admin status transitions, inventory effects.

### P2 - Storefront SEO is runtime-rendered, not server-rendered

Evidence:

- Storefront is a Vite/React SPA.
- Route metadata is injected with `react-helmet-async` at runtime.

Why it matters:

Modern search crawlers can execute JS, but product SEO and social previews are more reliable with pre-rendering/SSR/SSG, especially for product detail pages.

Recommendation:

- At minimum, ensure sitemap generation always includes products and categories.
- Consider pre-rendering top product/category pages or moving storefront to SSR/SSG if organic search is a major channel.
- Add a build-time smoke check for product route metadata.

### P2 - Admin build imports broad font subsets

Evidence:

- Store client imports latin-only fonts.
- Admin client imports `@fontsource/inter/400.css`, etc., which caused many Greek/Cyrillic/Vietnamese/Latin-ext font files in build output.

Why it matters:

Admin is internal, so this is not a public SEO issue, but it increases build output and first-load work.

Recommendation:

- Change admin font imports to latin-specific files as already done in the storefront.

### P2 - Local e2e can reuse stale servers

Evidence:

- `playwright.config.ts` has `reuseExistingServer: !process.env.CI`.
- Default `npm run e2e` on port 5000 produced one `ECONNRESET` failure in checkout.
- Re-running on clean port 5010 passed all 9 tests.

Why it matters:

Developers can get false failures or false passes if an old API server is still listening locally.

Recommendation:

- Use a dedicated e2e port by default.
- Consider `reuseExistingServer: false` for local e2e unless explicitly opted in.
- Add startup logging that prints the actual base URL and DB mode.

### P3 - Test output has avoidable noise

Observed:

- Repeated i18next Locize promotional console output.
- Repeated `--localstorage-file was provided without a valid path` warnings.
- Expected CartContext warnings appear in test output.

Why it matters:

Noisy CI logs make real warnings easier to miss.

Recommendation:

- Suppress known third-party banners in test setup.
- Fix the invalid localstorage-file flag/source.
- Mock or assert expected warnings explicitly.

### P3 - Storefront viewport disables user zoom

Evidence:

`apps/store-client/index.html` contains:

`maximum-scale=1.0, user-scalable=no`

Why it matters:

This hurts accessibility for low-vision users and is generally not recommended for production websites.

Recommendation:

- Remove `maximum-scale=1.0` and `user-scalable=no`.

### P3 - Hard-coded preconnect host in storefront HTML

Evidence:

`apps/store-client/index.html` preconnects to a specific Railway API host.

Why it matters:

If production API moves to another domain, the preconnect becomes stale and can waste connection work.

Recommendation:

- Make this environment-driven or remove it until the final API domain is stable.

## Good Things Already Present

- Good route-level code splitting with `lazy`/`Suspense`.
- Product cards and home hero have image fallback handling.
- React Query is configured with sensible stale times.
- API client has timeout handling, refresh-token retry, and CSRF token handling.
- Server has health, Swagger UI, OpenAPI JSON, and structured error handling.
- Admin permissions are enforced in both routes and UI.
- PWA manifest and service worker exist.
- Static pages for privacy, terms, returns, FAQ, contact, about exist.
- Product structured data includes price, availability, brand, ratings, breadcrumbs.
- Cart/checkout/quotation flows have strong test coverage.

## Recommended Next Steps

1. Fix public content and spelling in admin-managed homepage/product data.
2. Add `h1` to `/shop`.
3. Configure `SITEMAP_API_URL` in production and make missing dynamic sitemap a build failure.
4. Add upload temp-file cleanup.
5. Add real ESLint/Prettier/a11y linting.
6. Fix `fetchPriority` console warning.
7. Make e2e use a clean dedicated port by default.
8. Split `ProductCard`, `Shop`, and `orderService` into smaller modules.
9. Remove user-zoom disabling from storefront viewport.
10. Add visual/console smoke tests for home, shop, product, cart, checkout, login, and admin login.

