# NJ Store: The Ultimate Full-Stack Engineering Showcase

<div align="center">
  <b>🌐 Live Customer Storefront:</b> <a href="https://nj-store-gamma.vercel.app">https://nj-store-gamma.vercel.app</a><br/>
  <b>🛠️ Live Admin Dashboard:</b> <a href="https://nj-store-admin.vercel.app">https://nj-store-admin.vercel.app</a><br/>
  <b>💻 GitHub Repository:</b> <a href="https://github.com/nisalajurianze/NJ-Store">https://github.com/nisalajurianze/NJ-Store</a>
</div>

<br/>

## 1. Executive Summary & Vision
NJ Store is an enterprise-grade, high-performance E-Commerce platform architected to deliver an uncompromised, premium User Experience (UX) while maintaining robust, scalable, and secure backend operations. Built from the ground up, this project bridges a dynamic, consumer-facing storefront with a highly secure, restricted administrative operating system. 

The core philosophy behind NJ Store was to discard generic templates and build a **production-ready Monorepo** that prioritizes 120fps fluid animations, impenetrable security, and scalable data models.

---

## 2. The Architectural Paradigm: Turborepo Monorepo
Instead of decoupling the frontend and backend into scattered, hard-to-maintain repositories, NJ Store adopts a strict **Monorepo Architecture** powered by **Turborepo** (npm workspaces). 

### Workspace Structure
The project is divided into highly isolated yet cooperative workspaces:
* **`@njstore/store-client`**: The public-facing e-commerce UI.
* **`@njstore/admin-client`**: The secure, internal management dashboard for catalog and order operations.
* **`@njstore/server`**: The central Node.js REST API serving both clients.
* **`@njstore/ui`**: A shared library of custom React components.
* **`@njstore/utils`**: Shared utilities, validation schemas, and configurations.
* **`@njstore/types`**: Shared TypeScript definitions ensuring end-to-end type safety.

This structure allows a single source of truth for dependencies while ensuring that a change in a backend API interface immediately triggers a type error in the frontend clients during the build process.

---

## 3. Frontend Engineering & UX (React 18 + Vite)
Both the Storefront and the Admin clients are built using **React 18** and bundled with **Vite** for lightning-fast Hot Module Replacement (HMR) and optimized production builds.

### 3.1. Premium Aesthetics & 120fps Micro-interactions
The UI is built with a custom dark-theme design system using **TailwindCSS** (Navy Blue & Gold accents). Heavy, opinionated UI libraries were avoided to ensure peak performance.
* **Framer Motion** was integrated to choreograph every transition, hover state, and page load. The UI feels native, fluid, and operates at a perceived 120fps.
* **Custom Suspense Loaders**: Standard jarring page loads were replaced with a custom pulsing `LogoLoader` that serves as a seamless fallback during code-splitting and data-fetching.

### 3.2. Performance: Progressive Image Hydration
To solve Cumulative Layout Shifts (CLS) and slow loading times on product grids, a custom **Progressive Image Swapping Mechanism** was engineered.
* The UI instantly loads ultra-lightweight placeholders.
* Behind the scenes, the browser preloads the high-resolution imagery.
* Once fully loaded, the high-res image seamlessly cross-fades over the placeholder.
* Users never see a blank screen or a jerky layout shift, even on low-bandwidth connections.

### 3.3. Advanced Features & State Management
* **Multi-language (i18n)**: Seamless switching between English and Sinhala via `i18next`.
* **Server State**: Managed via `@tanstack/react-query` with custom hooks for caching, pagination, and optimistic UI updates.
* **Form State & Validation**: Managed via `react-hook-form` heavily integrated with `zod` for strict client-side payload validation before API submission.

---

## 4. Backend Engineering (Node.js + Express)
The core engine is a highly optimized REST API serving **24 distinct modules** (17 Public, 7 Admin) designed for high concurrency.

### 4.1. Database & Caching Layer
* **MongoDB (Mongoose)**: Handles complex relational product catalogs, variations, user histories, and order workflows. The system utilizes **31 complex Mongoose models** including User, Product, Order, Cart, Coupon, Wishlist, CompareList, AuditLog, and LoyaltyTransaction.
* **Redis (ioredis)**: Implemented for high-speed caching of frequent queries (like the homepage feed) and strict rate-limiting.

### 4.2. Advanced Authentication & Security
Security is a first-class citizen in NJ Store:
* **Google OAuth & JWT**: Users and Admins can authenticate seamlessly via Google One-Tap. Implements short-lived access tokens (15m) and HTTP-only, secure, long-lived refresh tokens (7d) with token rotation.
* **Multi-Factor Authentication (2FA)**: Time-based One-Time Password (TOTP) support implemented securely via `speakeasy`.
* **Strict Role-Based Access Control (RBAC)**: The Admin workspace automatically denies standard users, granting access only to verified organizational emails with specific administrative scopes.
* **Security Middleware**: Powered by `helmet`, `hpp` (HTTP Parameter Pollution prevention), `cors`, `express-rate-limit`, `csrf-csrf`, and `sanitize-html`.

### 4.3. Rich Media, Real-time & Third-Party Integrations
* **Real-time WebSockets**: Built on `Socket.IO` to power live stock updates, order status changes, and instant notifications.
* **Cloudinary & Multer**: Dynamic image optimization, automatic format conversion (WebP), and blazing-fast CDN delivery.
* **Automated Emails**: Transactional emails for order confirmations, password resets, and promotions handled securely via **Resend** and **Nodemailer**.
* **PDF Invoicing**: Server-side generation of dynamic PDF invoices and quotations using `PDFKit`.
* **Data Export**: Full CSV and Excel export pipelines for the Admin panel.

---

## 5. DevOps, CI/CD, and Code Quality
Reliability and deployment safety are guaranteed through rigorous automation.

### 5.1. Automated CI/CD Pipeline (GitHub Actions)
Every push and Pull Request triggers a strict 7-step GitHub Actions pipeline:
1. **Checkout & Node Setup**
2. **Dependency Installation & Audit**
3. **Strict TypeScript Checking** (`npm run typecheck`)
4. **Unit Testing with Coverage** (`npm run test:coverage` via **Vitest**)
5. **Build Compilation**
6. **End-to-End (E2E) Testing** (`npm run e2e` via **Playwright**)
7. **Artifact Upload** (Test reports and Coverage)

### 5.2. Playwright E2E Testing
The project features **6 comprehensive E2E test suites** running across Chromium, Firefox, and WebKit:
* `admin-smoke.spec.ts`: Validates admin dashboard operations.
* `auth.spec.ts`: Tests complete authentication flows (Login, Register, Reset).
* `checkout.spec.ts` & `cart.spec.ts`: Ensures the critical e-commerce funnel is unbreakable.

### 5.3. Docker Containerization
For infrastructure scalability, the project includes a **multi-stage Docker build**.
* **Development**: `docker compose up` spins up an authenticated MongoDB replica set and Redis instance.
* **Production**: A minimal `node:22-bookworm-slim` production image is generated, heavily pruned for security and size, ready for deployment on any container orchestration platform.

---

## 6. Conclusion
NJ Store is the culmination of modern web development best practices. By combining a unified Monorepo structure, an uncompromised aesthetic vision, highly scalable database modeling, and rigorous CI/CD security standards, it stands as a fully production-ready enterprise application.
