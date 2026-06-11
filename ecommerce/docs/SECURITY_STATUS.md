# NJ Store Security Status

Last updated: 2026-03-24

## Done

- Access tokens are short-lived and handled in memory on the clients.
- Refresh tokens are stored in HttpOnly cookies with rotation and server-side session revocation.
- Email verification is implemented.
- Forgot/reset password uses expiring one-time tokens.
- Repeated failed logins trigger cooldown/lockout logic.
- Role-based and ownership-based authorization are enforced.
- Sensitive customer actions require a verified email address.
- HTTPS is enforced in production mode.
- Helmet, CSP, HSTS, frame protection, referrer policy, and `nosniff` are enabled.
- CORS uses an explicit allowlist for store and admin origins.
- Global and route-level rate limiters are enabled for auth, uploads, search, coupons, and admin writes.
- Request body size limits are enforced.
- Zod validation is applied server-side for bodies, params, and queries.
- Mongo query sanitization, XSS cleaning, HPP protection, compression, and cookie parsing are active.
- Product, avatar, and receipt uploads use extension-independent file-signature validation.
- Receipts are stored privately in local development and delivered through protected routes.
- Customer receipts, quotations, and invoices are now opened through protected order endpoints instead of raw asset URLs.
- Admin receipt access is now delivered through a protected admin route.
- Server-side stock, pricing, and coupon validation run during quotation confirmation and order processing.
- Verified-purchase review enforcement is implemented.
- Audit logs persist authentication, admin, coupon, review, and order workflow events.
- Audit logs are visible in the admin dashboard.

## Partial

- Cloudinary is supported, but private/authenticated Cloudinary delivery is not fully configured for all sensitive document flows yet. Local development protects receipts; hosted environments should still prefer authenticated/private delivery.
- Audit coverage is strong for auth, admin actions, and order/payment flow, but it is not yet a full forensic event stream for every settings/profile/address mutation.
- Secrets are environment-driven, but operational rotation policy depends on deployment tooling rather than repo code.
- Rate limiting is implemented in-process. Redis-backed distributed throttling is not enabled yet.

## Missing

- Malware scanning or quarantine for uploaded files.
- Automatic anomaly detection for suspicious auth/payment behavior.
- Web Application Firewall or upstream bot-management policy.
- Centralized SIEM export for audit events.
- Formal key-rotation automation for JWT, SMTP, OAuth, and media credentials.

## Recommended Next Production Steps

1. Move sensitive Cloudinary assets to authenticated/private delivery.
2. Add Redis-backed rate limiting and session helper storage.
3. Add malware scanning for uploaded receipts and future admin media uploads.
4. Wire audit logs into external monitoring or SIEM.
5. Document and rehearse secret rotation and incident response.
