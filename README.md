# PharmaCycle.AI

Inventory, expiry tracking and medicine redistribution for Nigerian community pharmacies.
Pharmacies track stock and expiry, scan labels, and trade surplus with **verified** partner pharmacies.
Shoppers can search which verified pharmacies have a medicine in stock, with no account.

- `backend/`: Node 20+, Express 4, Prisma 5, PostgreSQL, zod, JWT
- `frontend/`: Next.js 15 (App Router), React 19, Tailwind CSS v4, TypeScript

> **Pre-deploy status (26 Oct 2026):** the frontend production build, backend syntax/module loading, Prisma schema validation and migration status, and selected database-backed API flows have been checked. Both npm audits report zero vulnerabilities. The project has no committed automated test suite. Live email delivery, image uploads, and LLM generation were not exercised.

## 1. Setup

Requirements: Node 20+, PostgreSQL 14+.

```bash
# from the project root
npm run install:all

# backend
cd backend
cp .env.example .env          # then edit: set DATABASE_URL and JWT_SECRET (32+ chars)
npx prisma migrate dev               # applies the tracked development migrations
npm run seed -- --yes         # OPTIONAL demo data. DELETES ALL DATA in that database.
npm run dev                   # API on http://localhost:5000

# frontend (new terminal)
cd frontend
cp .env.example .env.local
npm run dev                   # http://localhost:3000
```

Production: set the production environment variables below, run `npx prisma migrate deploy`, then `npm start` (backend) and `npm run build && npm start` (frontend). The migration under `backend/prisma/migrations/` is tracked; do not create another initial migration for an already-migrated database.

## 2. Environment variables

**Backend (`backend/.env`)**

| Name | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_SECRET` | yes | 32+ random characters; server refuses to start without it |
| `PORT`, `NODE_ENV`, `JWT_EXPIRES_IN` | no | defaults 5000 / development / 7d |
| `CLIENT_URL` | no | comma-separated CORS allow-list (default `http://localhost:3000`) |
| `CRON_SECRET` | no | bearer secret for `GET /cron/maintenance` and `/cron/notifications` |
| `RUN_MAINTENANCE_ON_BOOT` | no | `true` runs the expiry/stock check at startup |
| `GROQ_API_KEY`, `GROQ_MODEL` | no | enables AI insights |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | no | enables server-side label OCR (browser Tesseract is the fallback) |
| `RESEND_API_KEY`, `EMAIL_FROM` | no | enables email; without it emails are recorded as `SKIPPED`, never `SENT` |
| `CLOUDINARY_URL` | no | enables inventory photo upload |

**Frontend (`frontend/.env.local`)**: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SHOW_DEMO`, `NEXT_PUBLIC_SUPPORT_EMAIL`.

For production, set `NEXT_PUBLIC_API_URL` to the public HTTPS API origin before building the frontend; it is embedded in the build. Set `NEXT_PUBLIC_SHOW_DEMO=false`, set the backend `CLIENT_URL` to the production frontend origin, and use `NODE_ENV=production`. Do not deploy the local `.env` files.

`GET /config` reports which integrations are live, and the UI uses it so it never implies a feature that is off.

## 3. Demo accounts (after `npm run seed -- --yes`)

Password for all: `password123`

| Type | Email |
|---|---|
| Pharmacy (verified) | `greenlife@demo.test`, `lifecare@`, `medplus@`, `healthplus@`, `citycare@`, `trustpharm@` (all `@demo.test`) |
| Pharmacy (unverified) | `pending@demo.test` |
| General user | `chidinma@demo.test`, `tunde@demo.test` |

Seed data (names, batch and "NAFDAC" numbers) is fictional. Greenlife and Lifecare also get 90 days of sales so the demand forecast has input.

## 4. Verifying pharmacies

Signup creates a `PENDING` pharmacy. There is no automatic verification. After you have checked a pharmacy yourself:

```bash
cd backend
npm run verify-pharmacy -- --list
npm run verify-pharmacy -- admin@thepharmacy.com
npm run verify-pharmacy -- admin@thepharmacy.com --reject
```

Pending pharmacies can use inventory, scan, sales, reports and settings. Transfers, the partner directory and public search only involve `VERIFIED` pharmacies.

## 5. Routes

Pages: `/`, `/login`, `/signup`, `/search`, `/legal`, and (pharmacy login required) `/dashboard`, `/inventory`, `/scan`, `/ai-insights`, `/transfers`, `/transfer-requests`, `/pharmacies`, `/alerts`, `/analysis`, `/reports`, `/settings`, `/help`.

API (JWT bearer unless noted): `/auth/*`, `/consumer/auth/*`, `/consumer/search` (public), `/consumer/me`, `/dashboard/summary`, `/inventory/*` (CRUD, `/stats`, `/lookup`, `/ocr`, `/:id/sale`, `/:id/image`), `/transfers/*`, `/transfer-requests/*`, `/insights/*`, `/alerts/*`, `/pharmacies`, `/pharmacy/profile`, `/analytics/summary`, `/reports/inventory.csv`, `/reports/transfers.csv`, `/config` (public), `/health` (public).

## 6. How the important rules work

- **Stock status** (`backend/src/utils/status.js`): qty ≤ 0 → OUT_OF_STOCK; expiry date passed → EXPIRED; ≤ 30 days → NEAR_EXPIRY; qty ≤ 50 → LOW_STOCK; else HEALTHY. Expiry is a calendar date, "today" is the Africa/Lagos date, and a batch is usable through its expiry day. Statuses are recomputed on every write and daily at 01:00 Lagos time.
- **Transfers**: request (no reservation) → owner **accepts** (reserves units, under row locks) → requesting pharmacy **confirms receipt** (units leave the supplier, arrive at the receiver with provenance, atomically). Reject/cancel after acceptance releases the reservation. Every change writes an append-only `TransferEvent`. Listed stock cannot be sold, edited or deleted out from under a listing.
- **Alerts**: de-duplicated by key, and they respect the five notification preferences stored on the pharmacy. Counts on `/alerts` come from the database for all alerts.
- **Email**: every attempt is a `Notification` row: `SENT`, `FAILED` (retried up to 3 times) or `SKIPPED` (no provider configured).
- **AI**: one adapter (`backend/src/lib/ai.js`), JSON validated with zod, 30 s timeout. The demand forecast refuses to run without enough recorded sales (≥ 10 records over ≥ 7 days) and says so.

## 7. Known limitations

- No automated test suite is committed. Run integration smoke checks against the hosted production configuration before launch.
- Auth: JWT is kept in `localStorage`; there is no password reset, email verification or token revocation. One admin user per pharmacy (no staff invites).
- Verification is manual (CLI). NAFDAC numbers are stored as typed and **never validated**.
- No delivery tracking or payments; the app records reservation and receipt only.
- A listing whose stock expires is hidden from the marketplace but stays open until its owner cancels it.
- Barcode scanning needs a browser with `BarcodeDetector` and only matches identifiers already in your own inventory.
- `/legal` is a starter draft, not legal advice.
- Written against Next.js 15; if you move to Next 16, check its migration notes.
