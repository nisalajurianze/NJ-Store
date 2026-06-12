# Contributing to NJ Store

First off, thank you for considering contributing to NJ Store! It's people like you that make this platform better.

Please note that this project is open-source. Please follow these guidelines to ensure a smooth development and review workflow.

---

## 🛠️ Local Development Setup

Before you begin contributing:
1. Make sure you have **Node.js 22 LTS** and **npm 10+** installed.
2. Ensure you have **Docker Desktop** running (required for local MongoDB Replica Set and Redis).
3. Follow the installation and configuration steps in the main [README.md](README.md).

---

## 🔄 Development Workflow

To maintain a clean and reliable codebase, we follow a standard Git branching and Pull Request workflow:

### 1. Create a Branch
Always create a new branch for your feature, bugfix, or chore. Avoid working directly on `main` or `master`.
```bash
git checkout -b feature/amazing-feature
# or
git checkout -b bugfix/fix-checkout-bug
```

### 2. Make Changes & Commit
Write clean, readable code and keep your commits focused. Follow the convention for commit messages:
- `feat: add Google One Tap login`
- `fix: resolve LKR currency format decimal issue`
- `docs: update API documentation endpoints`
- `chore: update dependencies`

Please preserve all existing comments and documentation that are unrelated to your changes.

### 3. Verify Code Quality Locally
Before pushing your branch, you **must** run the following verification checks locally to ensure the CI pipeline won't fail:

#### 🧪 Run TypeScript Type Checking
```bash
npm run typecheck
```
*Your code must compile with 0 TypeScript errors.*

#### 🛡️ Run Linter
```bash
npm run lint
```
*Ensure there are no style or syntax violations.*

#### 🧪 Run Unit Tests
Ensure all existing and new unit tests pass:
```bash
npm run test
```
*If you are running on a machine with limited memory and get Heap Out of Memory errors, use the sequential test commands detailed in the [README.md](README.md#-testing).*

### 4. Create a Pull Request (PR)
Once your changes pass all local checks:
1. Push your branch to GitHub:
   ```bash
   git push origin feature/amazing-feature
   ```
2. Open a Pull Request against the `main` branch.
3. Describe your changes clearly in the PR description, referencing any related issues.
4. Wait for the automated GitHub Actions CI pipeline to complete and pass.

---

## 🎨 Coding Standards

### TypeScript & React
- Use functional components with hooks.
- Keep components small, focused, and reusable.
- Define explicit TypeScript interfaces/types for all component props and API payloads (utilize `@njstore/types`).
- Use the `cn()` utility from `@njstore/utils` for conditional Tailwind CSS classes.

### Backend API
- Implement Express controllers wrapped in `catchAsync` to handle errors gracefully.
- Validate incoming requests using **Zod schemas** in middleware.
- Ensure all database queries utilize Mongoose models correctly and leverage Redis caching for frequent read operations where appropriate.

---

## 🧪 Testing Guidelines

Any new features should ideally be accompanied by corresponding unit tests:
- **Backend API tests:** Located in `apps/server/src/__tests__/`. These run against an in-memory MongoDB server.
- **Frontend component tests:** Located in `apps/store-client/src/` and `apps/admin-client/src/` alongside components/pages with `.test.tsx` extensions.

---

Thank you for helping build **NJ Store**! 🚀
