# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Important:** This is Next.js 16 — APIs, file conventions, and behavior may differ from your training data. Before writing any Next.js-specific code, read the relevant guide in `node_modules/next/dist/docs/`. Heed deprecation notices.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # prisma generate + next build
npm run start        # prisma migrate deploy + next start (production)
npm run lint         # ESLint

# Database
npx prisma migrate dev        # Create and apply a new migration
npx prisma migrate deploy     # Apply pending migrations (production)
npx prisma db seed            # Seed roles, admin user, demo accounts
npx prisma studio             # GUI for the database
```

No test framework is configured.

## Architecture

**Stack:** Next.js 16 (App Router, TypeScript), Tailwind CSS 4, PostgreSQL, Prisma ORM 7, Auth.js (NextAuth v5), Zod.

### Route Structure

- `src/app/(app)/` — authenticated route group; layout checks session via `proxy.ts`
- `src/app/(auth)/giris/` — public login page
- `src/app/api/` — REST route handlers for all data mutations

### Key Non-Obvious Conventions

**`src/proxy.ts` is the middleware.** Next.js 16 renamed the `middleware.ts` convention to `proxy.ts`. It only redirects unauthenticated users to `/giris` — it does not enforce roles. Real authorization happens per-page/per-route via `src/lib/rbac.ts`.

**`getToken()` in proxy, not `auth()`.** `auth()` triggers the session callback (a DB query on every call). The proxy fires on every page transition, so `auth()` would add a remote round-trip to every click. `getToken()` only decodes the JWT — no DB hit.

**`auth()` is wrapped in `React.cache()`.** Multiple server components/layouts calling `auth()` in the same request share a single session callback execution (and one DB round-trip).

**Prisma 7 config lives in `prisma.config.ts`**, not `schema.prisma` datasource. The client is generated to `generated/prisma/` (not `node_modules/@prisma/client`). Import types from `../../generated/prisma/...`.

**SSL quirk:** `prisma.ts` sets `ssl: { rejectUnauthorized: false }` for hosted Postgres (Railway/Render use self-signed proxy certs). Do not append `?sslmode=require` to `DATABASE_URL` — it conflicts.

**File storage:** Quote attachments and delivery acceptance photos are stored as `bytea` in Postgres (not a file service). 10 MB limit, PDF/JPG/PNG only.

### Auth and RBAC

Roles: `admin`, `requester`, `purchasing`, `approver`, `site_manager`. Users can hold multiple roles; `admin` bypasses all role checks.

```ts
// In Server Components / pages:
await requirePageRole(["purchasing", "approver"]);  // returns session or 404

// In Route Handlers:
const result = await requireApiRole(["purchasing"]);
if (!result.ok) return result.response;
```

### Service Layer

`src/lib/services/` contains all DB logic (requests, quotes, approvals, deliveries, users, projects). API route handlers call service functions rather than querying Prisma directly.

### Purchase Request Lifecycle

`draft` → `submitted` → `quotes_collecting` → `pending_approval` → `approved`/`rejected` → `shipped` → `delivered_pending_acceptance` → `accepted`/`partially_accepted`

Every status transition is recorded in `AuditLog`.

## Environment Variables

| Variable | Notes |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string — do **not** append `?sslmode=require` |
| `AUTH_SECRET` | JWT signing key — generate with `openssl rand -base64 32` |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Optional seed admin (defaults: `admin@santiye.local` / `Admin123!`) |
