# Web Project Quality Playbook

Reusable guide for building fast, polished, production-ready websites like NJ Store. Use this for pharmacy, restaurant, ecommerce, service business, portfolio, booking, and admin-dashboard projects.

## How To Use This

1. Copy this checklist into the new project planning docs.
2. Pick only the sections that match the project.
3. During development, keep ticking items off.
4. Before deployment, run the final verification checklist.
5. After launch, use the monitoring checklist every few weeks.

Recommended goal: site eka beautiful wenna with fast first load, smooth mobile scrolling, clean SEO, secure APIs, and easy admin management.

## Default Tech Stack

Use the simplest stack that can fully handle the product.

### Frontend

- React with TypeScript.
- Vite for SPA projects, or Next.js for SEO-heavy sites and server rendering.
- Tailwind CSS for styling.
- React Query or SWR for data fetching and cache behavior.
- Zod for form/API validation.
- React Hook Form for forms.
- Framer Motion only for small, meaningful animations.
- Lucide React for icons.
- Playwright for end-to-end testing.

### Backend

- Node.js + Express/Nest/Fastify for API-heavy projects.
- MongoDB + Mongoose for flexible catalog/content systems.
- Postgres + Prisma/Drizzle for relational booking, orders, payments, and reporting.
- Redis/Upstash Redis for cache, rate limits, sessions, OTP, and hot reads.
- Cloudinary/Vercel Blob/S3 for uploaded media.

### Deployment

- Vercel for frontend.
- Render/Railway/Fly/Vercel Functions for API depending on backend shape.
- MongoDB Atlas or Neon/Supabase for database.
- Upstash Redis for serverless-friendly cache.
- GitHub Actions for CI where needed.

## Project Architecture

Good projects usually have these parts:

- Customer website: public pages, product/menu/catalog, cart/order/booking/contact.
- Admin dashboard: login, products/content/orders/bookings/users/settings.
- API server: public read endpoints, authenticated admin endpoints, uploads, payments, webhooks.
- Shared package: types, validators, constants, formatting helpers.
- Docs: setup, deployment, env vars, test plan, roadmap.

Recommended folder pattern:

```text
apps/
  storefront/
  admin/
  api/
packages/
  shared/
  ui/
docs/
  WEB_PROJECT_QUALITY_PLAYBOOK.md
  DEPLOYMENT.md
  TEST_PLAN.md
```

For smaller projects, one app is fine. Do not force a monorepo unless admin/API/shared code will benefit.

## Planning Checklist

Before coding:

- Define target users: customer, admin, owner, staff.
- Define top 3 user flows.
- Define data model: products, categories, orders, reservations, users, settings.
- Define admin permissions.
- Define SEO pages.
- Define deployment target.
- Define performance budget.
- Define legal/compliance needs.
- Define backup/export needs.

Minimum performance budget:

- Homepage mobile Lighthouse Performance: 85+.
- SEO/Accessibility/Best Practices: 90+ where practical.
- Initial JS should stay small.
- Largest images must be responsive and compressed.
- No console errors in production.
- Smooth scroll on mid-range mobile devices.

## Full Web App Build Flow

Use this flow when building a complete project from zero.

### 1. Product Spec

Write this before coding:

- Business type.
- Main customer problem.
- Main conversion action: buy, order, book, contact, subscribe, upload prescription.
- Target audience.
- Pages needed.
- Admin features needed.
- Data models needed.
- Payment/delivery/booking rules.
- SEO pages needed.
- Legal/compliance requirements.
- Launch deadline.

Good spec template:

```text
Project type:
Business name:
Target users:
Main user actions:
Public pages:
Admin pages:
Data models:
Third-party services:
Payment/delivery/booking rules:
SEO goals:
Security/compliance notes:
Performance target:
Deployment target:
```

### 2. Design System

Create these early:

- Color palette.
- Font scale.
- Button variants.
- Input/select/textarea styles.
- Card styles.
- Modal/drawer styles.
- Toast/alert styles.
- Table/list styles.
- Empty/loading/error states.
- Mobile navigation pattern.

Rules:

- Reuse components instead of re-styling every page.
- Keep mobile tap targets comfortable.
- Keep dense admin UI separate from public marketing UI.
- Make important actions visible without scrolling too much.

### 3. Data Model

Design data before screens:

- Entity names are clear.
- Required fields are known.
- Optional fields are intentional.
- Status values are enums.
- Slugs are unique.
- Timestamps exist.
- Audit fields exist for admin changes.
- Soft delete is used where data should not disappear.
- Indexes exist for search/filter/sort fields.
- Relations are clear.
- Seed data exists for local testing.

Common fields:

```ts
{
  id: string;
  slug: string;
  status: "draft" | "active" | "archived";
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}
```

### 4. API Contract

Define API behavior before wiring UI:

- Stable route names.
- Input validation.
- Output shape.
- Error shape.
- Pagination.
- Filtering.
- Sorting.
- Auth rules.
- Rate limits.
- Cache rules.
- Webhook rules if payments are used.

Recommended response pattern:

```json
{
  "data": {},
  "meta": {
    "page": 1,
    "limit": 24,
    "total": 120
  }
}
```

Recommended error pattern:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check the form and try again.",
    "fields": {
      "email": "Email is required"
    }
  }
}
```

### 5. Public App

Build public flows in this order:

- Layout/nav/footer.
- Homepage.
- Listing page.
- Detail page.
- Search/filter.
- Cart/booking/contact/order flow.
- Success/confirmation page.
- Policy/help pages.
- SEO metadata.
- Loading/empty/error states.
- Mobile polish.

### 6. Admin App

Build admin flows in this order:

- Admin auth.
- Dashboard summary.
- List pages.
- Create/edit forms.
- Image/file upload.
- Status changes.
- Search/filter/pagination.
- Settings.
- Audit logs.
- Role permissions if needed.

### 7. Quality Passes

Do these after core features work:

- Performance pass.
- Mobile smoothness pass.
- SEO pass.
- Accessibility pass.
- Security pass.
- Error handling pass.
- Empty/loading states pass.
- Content/spelling pass.
- Browser verification pass.

## Feature Module Checklist

Use this to avoid forgetting common full-app features.

### Auth And Roles

- Login.
- Logout.
- Session restore.
- Forgot password or admin reset process.
- Role checks in backend.
- Role checks in frontend.
- Protected admin routes.
- Account lock/rate limit for repeated failures.

### Catalog Or Menu

- Categories.
- Tags/labels.
- Search.
- Filters.
- Sort.
- Pagination or infinite load.
- Featured items.
- Related items.
- Availability/stock.
- Image gallery.
- Draft/active/archive status.

### Cart, Order, Booking, Or Lead Flow

- Persistent cart/draft state.
- Quantity changes.
- Variant/options support.
- Notes/instructions.
- Delivery/pickup/table time selection.
- Customer details.
- Validation.
- Confirmation screen.
- Admin status workflow.
- Customer notification.

### Payments

- Use hosted checkout where possible.
- Never trust frontend prices.
- Recalculate totals on backend.
- Use idempotency keys.
- Verify webhook signatures.
- Store payment status separately from order status.
- Handle paid, failed, cancelled, refunded states.
- Do not expose secret keys.
- Test with sandbox cards/accounts.

### Email, SMS, And Notifications

- Order/booking confirmation.
- Admin new order alert.
- Customer status update.
- Password/reset email if used.
- Delivery/pickup reminder if needed.
- Unsubscribe rules for marketing emails.
- Retry failed sends safely.
- Log notification delivery status.

### File Uploads

- Validate file type.
- Validate file size.
- Use signed upload or backend-controlled upload.
- Store metadata in database.
- Restrict private file access.
- Generate thumbnails where useful.
- Clean up unused uploads.
- Never execute uploaded files.

### Search

- Start with database search for simple projects.
- Use indexed fields.
- Debounce frontend search input.
- Show empty state.
- Keep recent/filter state in URL where useful.
- Upgrade to a search service only when needed.

### Settings And CMS Content

- Site name.
- Logo.
- Contact details.
- Social links.
- Opening hours.
- Delivery settings.
- Tax/service charge settings.
- Homepage featured sections.
- SEO defaults.

### Analytics And Observability

- Track page views.
- Track main conversion action.
- Track checkout/order/booking failures.
- Track API errors.
- Track slow endpoints.
- Track frontend errors.
- Add health check endpoint.
- Keep logs searchable.

## Form Quality Checklist

Every important form needs:

- Label for every input.
- Placeholder only as helper, not as label.
- Client validation.
- Server validation.
- Field-level errors.
- Submit loading state.
- Submit disabled only when useful.
- Duplicate submit protection.
- Success message.
- Safe retry after failure.
- Unsaved changes warning for long admin forms.
- Draft persistence for long customer flows where useful.

## URL And State Checklist

Good web apps use URLs well:

- Search query can be shared when useful.
- Category/filter/sort state can be represented in URL.
- Detail pages use clean slugs.
- Admin edit pages use stable IDs.
- Pagination state is preserved.
- Back button works naturally.
- Redirects are intentional.
- 404 page is useful.
- Old URLs redirect after slug changes.

## UI And UX Quality

General rules:

- Build the real usable app first, not a marketing-only landing page.
- Mobile layout must be designed first for shopping/ordering flows.
- Navigation must be simple: Home, Shop/Menu, Categories, About, Contact, Cart/Booking.
- Buttons must clearly show primary actions.
- Forms must have labels, validation, loading state, error state, and success state.
- Empty states must explain what happened and give the next action.
- Loading states should use skeletons for product/menu grids.
- Avoid layout shift when data loads.
- Keep text readable at all screen sizes.
- Do not place important controls only on hover.
- Avoid heavy background blur and large fixed effects on mobile.

Visual polish checklist:

- Consistent spacing scale.
- Consistent border radius.
- Consistent button sizes.
- Consistent card image aspect ratios.
- Good color contrast.
- Product/menu cards align cleanly in grid.
- Price, availability, and CTA are easy to scan.
- Mobile bottom spacing handles browser UI and safe areas.

## Performance Passes

### 1. Image Performance

Image rules:

- Use real image dimensions.
- Serve optimized images from Cloudinary/Vercel image optimization/CDN.
- Use `srcset` and `sizes` for responsive images.
- Use `loading="lazy"` for below-the-fold images.
- Use eager/high priority only for the main hero or first visible product image.
- Use `decoding="async"` for non-critical images.
- Use fixed aspect ratio containers to prevent layout shift.
- Use modern formats where possible: AVIF/WebP.
- Keep thumbnails small.
- Avoid huge background images on mobile.

Example image policy:

```tsx
<img
  src={imageUrl}
  srcSet={responsiveSrcSet}
  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
  loading={isAboveFold ? "eager" : "lazy"}
  decoding={isAboveFold ? "sync" : "async"}
  alt={name}
/>
```

### 2. React Render Performance

Rules:

- Do not update React state on every scroll event.
- Use CSS for hover/scroll visuals where possible.
- Use `requestAnimationFrame` for unavoidable scroll work.
- Use `requestIdleCallback` or idle timers for non-urgent preview work.
- Memoize heavy cards and derived values.
- Keep product/menu card props stable.
- Avoid passing freshly created objects/functions into large lists.
- Split large components.
- Lazy-load modals, admin-only tools, charts, maps, editors, and rich previews.
- Use virtualization for very long lists.

Mobile smoothness rules:

- Reduce Framer Motion layout measurement on mobile.
- Avoid large animated shadows/backdrop blur.
- Avoid sticky elements with expensive blur on scroll.
- Keep card hover transforms disabled or lighter on touch devices.
- Prefer opacity/transform animations over layout animations.

### 3. Data Fetching

Use React Query/SWR:

- Set useful `staleTime` for public catalog/menu data.
- Use `placeholderData` to avoid layout jumps.
- Prefetch next likely pages/categories.
- Do not refetch everything on every focus unless data needs it.
- Keep query keys stable.
- Invalidate only affected namespaces after admin mutations.
- Slice payloads for public pages.

Example cache behavior:

```ts
useQuery({
  queryKey: ["products", filters],
  queryFn: fetchProducts,
  staleTime: 60_000,
  gcTime: 10 * 60_000,
  placeholderData: keepPreviousData,
});
```

### 4. Bundle Size

Checklist:

- Run bundle analyzer before launch.
- Lazy-load heavy routes.
- Lazy-load admin dashboard charts.
- Replace heavy packages if used for small tasks.
- Import icons one by one, not whole icon packs.
- Avoid putting admin libraries in storefront bundle.
- Keep shared package browser-safe.
- Remove unused dependencies.

Commands:

```bash
npm run build
npm run analyze
npm audit --audit-level=moderate
```

### 5. Fonts

Rules:

- Use 1-2 font families only.
- Use `font-display: swap`.
- Preload only the main above-the-fold font file.
- Prefer variable fonts when appropriate.
- Avoid loading many weights.
- Keep fallback font metrics close to reduce layout shift.

### 6. CSS And Paint Cost

Rules:

- Avoid expensive blur/shadow on large scrolling lists.
- Do not animate width, height, top, left, margin, or grid layout.
- Avoid nested glass cards.
- Keep card borders/shadows simple.
- Use `content-visibility: auto` for long below-the-fold sections when safe.
- Use `contain` for repeated cards where safe.
- Avoid one huge CSS file full of unused classes.

### 7. Service Worker And Offline Cache

Use a service worker when the project benefits from:

- Static asset caching.
- Product/menu data fallback.
- Offline browsing of recently viewed items.
- Faster repeat visits.

Rules:

- Cache version must change when app version changes.
- Do not cache authenticated admin responses.
- Do not cache payment or private user endpoints.
- Expire old caches.
- Handle service worker update safely.

### 8. Backend Read Performance

Public endpoints should be lean:

- Use `.select()` to return only needed fields.
- Use `.lean()` in Mongoose reads where document methods are not needed.
- Paginate product/menu/order lists.
- Use indexes for slug, category, status, createdAt, search fields.
- Avoid N+1 queries.
- Keep public payloads small.
- Cache hot endpoints.
- Add compression.

Example Mongo read:

```ts
Product.find({ isActive: true })
  .select("name slug price images category rating stock")
  .sort({ createdAt: -1 })
  .limit(24)
  .lean();
```

### 9. Cache Strategy

Cache targets:

- Home page featured products/menu.
- Category list.
- Product/menu detail by slug.
- Public settings.
- SEO sitemap data.

Invalidation:

- Product changed: invalidate `products`, `product:{slug}`, `sitemap`.
- Category changed: invalidate `categories`, `products`, `sitemap`.
- Settings changed: invalidate `settings`, `home`.
- Menu item changed: invalidate `menu`, `menu:{slug}`, `sitemap`.

Use Redis in production. Use in-memory fallback only for local/dev or simple deployments.

## SEO Checklist

Every serious public website needs:

- Unique title and description per page.
- Canonical URL.
- Open Graph image and Twitter card.
- One clear H1 per page.
- Clean slugs.
- `robots.txt`.
- `sitemap.xml`.
- Product/menu/category pages in sitemap.
- JSON-LD schema where useful.
- Useful alt text.
- Good internal links.
- Fast mobile performance.

Useful schema types:

- Ecommerce: `Product`, `Offer`, `BreadcrumbList`, `Organization`.
- Restaurant: `Restaurant`, `Menu`, `MenuItem`, `LocalBusiness`.
- Pharmacy: `Pharmacy`, `LocalBusiness`, `Product`, `FAQPage` when appropriate.

Sitemap rules:

- Use production public URL for sitemap links.
- Do not include admin/private routes.
- Include active public items only.
- Cache sitemap but invalidate after catalog/menu changes.
- Verify after deploy: `/sitemap.xml` and `/robots.txt`.

## Security Checklist

Minimum security:

- Never commit real secrets.
- Keep `.env.example` updated with placeholder values.
- Validate all API input with Zod/Joi/class-validator.
- Sanitize rich text or avoid rich text.
- Use HTTP-only cookies for sensitive auth where possible.
- Use secure cookie settings in production.
- Configure CORS tightly.
- Add rate limits for login, OTP, contact, upload, checkout.
- Add Helmet/security headers.
- Protect admin routes on frontend and backend.
- Check admin role on every admin API call.
- Limit upload file types and size.
- Scan uploaded files where needed.
- Store uploaded files outside app server disk or in cloud storage.
- Add audit logs for admin mutations.
- Use dependency audit before deploy.

Never expose:

- Database URL.
- JWT secret.
- Payment secret keys.
- Cloudinary API secret.
- Admin reset tokens.
- User private data.

## Accessibility Checklist

- Use semantic HTML.
- Buttons are buttons, links are links.
- All inputs have labels.
- Images have meaningful alt text or empty alt for decoration.
- Keyboard navigation works.
- Focus state is visible.
- Color contrast is readable.
- Error messages are connected to inputs.
- Modals trap focus and close with Escape.
- Do not block browser zoom.
- Do not rely only on color for status.

## Testing Checklist

Run before every important release:

```bash
npm run typecheck
npm run test
npm run build
npm audit --audit-level=moderate
```

For web apps:

```bash
npm run e2e
```

Browser smoke test:

- Homepage loads.
- Shop/menu page loads.
- Product/menu detail loads.
- Cart/order/booking flow starts.
- Admin login page loads.
- Admin list page loads.
- Create/edit flow works in admin.
- No console errors.
- No failed API/image requests.
- Mobile viewport looks correct.
- Desktop viewport looks correct.

Performance smoke test:

- Scroll product/menu grid on mobile viewport.
- Open and close filters.
- Search/filter without jank.
- Navigate between product/menu detail pages.
- Refresh page and confirm auth restore does not flicker badly.

## Deployment Checklist

Before deploy:

- `.env.example` updated.
- Production env vars set.
- Database indexes created.
- Admin account bootstrap path decided.
- Storage bucket/cloud configured.
- API health check works.
- CORS production origin set.
- Sitemap production URL set.
- Build passes locally.
- Migration/seed script tested.

After deploy:

- Check homepage.
- Check `/robots.txt`.
- Check `/sitemap.xml`.
- Check one detail page.
- Check admin login.
- Check API health.
- Check logs for errors.
- Check mobile viewport.
- Check canonical URLs.
- Check analytics/monitoring.

## Monitoring And Maintenance

Weekly or after content changes:

- Check production logs.
- Check error rate.
- Check failed image requests.
- Check slow API endpoints.
- Check dependency audit.
- Check database size and indexes.
- Check cache hit behavior.
- Check sitemap still includes new public items.
- Check real mobile behavior after big UI changes.

Monthly:

- Update dependencies safely.
- Remove unused packages.
- Review admin user access.
- Backup database.
- Test restore/export path.
- Review SEO pages.
- Compress old uploaded images if needed.

## Pharmacy Website Checklist

Important note: pharmacy sites must avoid unsafe medical advice and must respect local laws. Do not build flows that allow restricted medicine sales without proper verification.

Core pages:

- Home.
- Medicine/products catalog.
- Categories.
- Product detail.
- Prescription upload.
- Contact/pharmacist support.
- Branch/location page.
- Delivery information.
- Privacy policy.
- Terms.

Core features:

- Medicine search.
- Category filters.
- Availability status.
- Prescription-required badge.
- Upload prescription image/PDF.
- Pharmacist/admin approval workflow.
- Order status tracking.
- Delivery/pickup options.
- Customer contact verification.
- Admin inventory management.
- Expiry date and batch tracking if needed.
- Low-stock alerts.

Safety/compliance:

- Clear "consult a pharmacist/doctor" copy where needed.
- No dosage recommendations unless reviewed and legally safe.
- Do not show controlled/restricted medicine as normal add-to-cart if not allowed.
- Protect prescription uploads as private data.
- Limit who can view prescription files in admin.
- Audit log for prescription/order decisions.
- Delete old sensitive uploads based on policy.

Pharmacy SEO:

- Location pages for branches.
- Category pages for general medicine categories.
- FAQ pages for delivery, prescription upload, opening hours.
- LocalBusiness/Pharmacy schema.

## Restaurant Website Checklist

Core pages:

- Home.
- Menu.
- Menu category pages.
- Menu item detail if needed.
- Order online.
- Reservations/table booking.
- About.
- Gallery.
- Contact/location.
- Offers/events.

Core features:

- Menu categories.
- Availability by time/day.
- Item options/add-ons.
- Spice level/custom notes.
- Allergen labels.
- Pickup/delivery mode.
- Cart.
- Checkout/order request.
- Table booking.
- Admin order management.
- Admin menu management.
- Opening hours and holiday closures.
- Promo codes if needed.

Restaurant performance:

- Menu pages must load very fast on mobile.
- Use compressed food images with fixed aspect ratios.
- Lazy-load lower menu sections.
- Keep cart state local and resilient.
- Avoid huge gallery loading on first page.

Restaurant SEO:

- Restaurant schema.
- Menu schema where practical.
- LocalBusiness schema.
- Location and opening hours.
- Rich social sharing image.
- Clean menu/category URLs.

## Ecommerce Website Checklist

Core pages:

- Home.
- Shop.
- Category.
- Product detail.
- Cart.
- Checkout.
- Account/orders.
- Contact.
- Policies.

Core features:

- Product search.
- Filters and sort.
- Product variants.
- Stock status.
- Cart persistence.
- Checkout.
- Order confirmation.
- Admin products/categories/orders.
- Image upload/reorder.
- Inventory updates.
- Coupons if needed.

Performance focus:

- Product card grid smoothness.
- Product image optimization.
- Detail page prefetch from card click/hover.
- Lean public API payloads.
- Cache category and product detail pages.

## Admin Dashboard Checklist

Admin UX:

- Fast login restore.
- Clear sidebar/navigation.
- Search and filters in list pages.
- Pagination for large lists.
- Image upload progress.
- Save/loading/error states.
- Confirm destructive actions.
- Audit important admin changes.
- Role-based access where needed.

Admin performance:

- Lazy-load charts and heavy editors.
- Do not fetch all orders/products at once.
- Use server-side pagination.
- Keep forms split into small components.
- Use optimistic updates only where safe.

## Content Quality Checklist

Before launch:

- Fix spelling mistakes.
- Make button labels clear.
- Keep product/menu names consistent.
- Use proper casing.
- Replace placeholder images.
- Replace placeholder phone/email/address.
- Check currency formatting.
- Check stock/availability labels.
- Check policy pages.
- Check social preview image.

## Environment Variables Template

Common frontend:

```env
VITE_API_URL=https://api.example.com
VITE_PUBLIC_SITE_URL=https://example.com
VITE_SITEMAP_API_URL=https://api.example.com
```

Common backend:

```env
NODE_ENV=production
PORT=5000
CLIENT_ORIGIN=https://example.com
DATABASE_URL=
JWT_SECRET=
REDIS_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Project-specific:

```env
PAYMENT_SECRET_KEY=
PAYMENT_WEBHOOK_SECRET=
EMAIL_API_KEY=
SMS_API_KEY=
ADMIN_BOOTSTRAP_EMAIL=
```

Rules:

- `.env.example` gets placeholders only.
- Production values go into hosting provider env settings.
- Local `.env` files stay ignored by git.
- Rotate secrets if accidentally exposed.

## Definition Of Done

A website is production-ready when:

- Main user flows work end to end.
- Admin flows work end to end.
- Mobile layout is polished.
- Desktop layout is polished.
- Typecheck passes.
- Tests pass.
- Build passes.
- Audit has no high/critical issues.
- Browser console has no unexpected errors.
- Public pages have good metadata.
- Sitemap and robots work.
- Images are optimized and responsive.
- API endpoints use validation.
- Private routes are protected.
- Rate limits exist for risky endpoints.
- Env docs are updated.
- Deployment docs are updated.
- Rollback path is known.

## AI Agent Operating Guide

Use this section when giving work to Codex or another AI coding agent.

Agent rules:

- Read the project files before changing code.
- Understand existing stack, folder structure, scripts, and conventions.
- Preserve existing working behavior.
- Do not rewrite the whole app unless explicitly asked.
- Implement in small safe steps.
- Prefer existing helpers and patterns.
- Keep frontend, backend, and shared types consistent.
- Do not commit or push unless the user explicitly asks.
- Never force-push or rewrite history unless explicitly asked.
- Do not edit production secrets.
- If a task needs env vars or credentials, document what is missing.
- Run relevant verification before saying done.
- Use browser verification for UI changes.
- Mention any remaining risk clearly.

Agent implementation order:

1. Inspect repo structure and scripts.
2. Read related files.
3. Identify the exact feature/fix scope.
4. Implement the smallest complete version.
5. Add validation and error handling.
6. Add loading/empty states.
7. Add responsive/mobile polish.
8. Add performance improvements.
9. Add or update tests where useful.
10. Run typecheck/tests/build.
11. Browser-check the main flow.
12. Summarize changed files and verification.

Agent quality priorities:

- Correctness first.
- Security second.
- Mobile user experience third.
- Performance fourth.
- Clean code fifth.
- Visual polish throughout.

## Personal Codex Prompt For Future Projects

Use this prompt when starting a new project with Codex:

```text
You are my senior full-stack AI agent. Build this project using the standards in
ecommerce/docs/WEB_PROJECT_QUALITY_PLAYBOOK.md.

First inspect the repo, package scripts, app structure, existing conventions, and docs.
Then implement the project end to end. Do not stop at only a plan unless I ask for a plan.

Prioritize:
- mobile smoothness
- SEO
- secure API validation
- optimized responsive images
- lean backend reads
- cache behavior
- polished loading/empty/error states
- clean admin flows
- full verification

Important rules:
- Do not commit or push unless I explicitly ask.
- Do not change real production secrets.
- Do not remove user changes.
- Keep UI visually polished and responsive.
- Run typecheck, tests, build, and browser verification when possible.
- If something is blocked by missing credentials or external access, document the exact blocker and continue with what can be completed locally.

At the end, tell me:
- what you changed
- what files matter most
- what verification passed
- what still needs manual production/env setup
```

## AI Agent Task Template

Copy this and fill it for any pharmacy, restaurant, ecommerce, or booking project:

```text
Project:
Business type:
Target customers:
Main goal:

Public pages:
- Home
- Listing/catalog/menu
- Detail page
- Cart/order/booking/contact
- About/contact/policies

Admin pages:
- Dashboard
- Manage catalog/menu/content
- Manage orders/bookings/leads
- Settings

Important features:
- Search/filter
- Responsive images
- SEO sitemap/robots
- Admin auth
- Uploads
- Notifications
- Payments/bookings if needed

Quality requirements:
- Mobile-first
- Fast scroll
- No console errors
- Typecheck/test/build pass
- Browser check desktop and mobile
- No commit/push unless I ask

Use the playbook:
ecommerce/docs/WEB_PROJECT_QUALITY_PLAYBOOK.md
```

## Local-Only Work Rule

When this guide is used for personal experiments:

- Local file edits are okay.
- Running tests/build is okay.
- Starting dev servers is okay.
- Creating temporary notes is okay.
- Do not commit unless asked.
- Do not push unless asked.
- Do not deploy unless asked.
- Keep a short final summary so the user can decide the next step.

## Quick Final Release Command List

```bash
npm install
npm run typecheck
npm run test
npm run build
npm audit --audit-level=moderate
npm run e2e
```

Then manually check:

- Production homepage.
- Production catalog/menu page.
- Production detail page.
- Production admin login.
- `/robots.txt`.
- `/sitemap.xml`.
- Mobile viewport.
- Browser console.
