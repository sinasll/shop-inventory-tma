<div align="center">

# 🛒 ShopStock — Telegram Mini App

**Production-ready shop inventory, stock-batch, expiry & loss-prevention system, built as a Telegram Mini App.**

TypeScript end-to-end · React + Vite + Tailwind · Node + Express · Prisma + Neon PostgreSQL · 4 languages (Badini · Sorani · Arabic · English) · Offline-first · node-cron notifications

</div>

---

## ✨ What it does

ShopStock helps busy shop owners track inventory, manage stock batches by expiry date, **reduce losses from expired products**, and receive timely, localized Telegram notifications — all within a few taps inside Telegram.

- **Dashboard** with color-coded health cards (🔴 expired / 🟡 expiring soon / 🟢 safe / low-stock), urgency-sorted.
- **Barcode scanning** (`html5-qrcode`) with a fast-entry flow: scan → existing product loads instantly (enter qty + expiry) or create a new product inline → save → scanner re-arms automatically.
- **Product management**: total stock, batches grouped & combined by expiry date, mark as sold / discarded / damaged / returned / removed (FEFO consumption), favorites, delete with confirmation.
- **Inventory** list with search, filter, sort (urgency / name / quantity / recent), and pagination.
- **Settings control center**: language, notification time & warning window, low-stock threshold, scanner sound/vibration/camera, offline cache controls, account & subscription info, contact admin.
- **Notifications**: per-shop daily report at a user-chosen local time, fully translated, idempotent, isolated per shop.
- **Admin**: whitelist users, activate/extend/disable subscriptions, edit settings, search, send test notifications — in-app (master Telegram ID) **and** via secure API token. All admin actions audit-logged.
- **Offline-first**: every GET is cached in LocalStorage; network failures fall back to cache with a live/offline sync badge. The app never crashes offline and recovers automatically.

---

## 🏗 Architecture

```
shop-inventory-tma/                 pnpm workspace monorepo
├── packages/shared/                Shared TS: domain types, Zod schemas,
│   └── src/                          expiry logic, and the 4-language i18n
│       ├── types/                    dictionaries (single source of truth).
│       ├── schemas/                  Used by BOTH api & web → no drift.
│       ├── i18n/dictionaries/
│       └── expiry.ts
│
├── apps/api/                       Express + TypeScript (clean modular arch)
│   ├── prisma/schema.prisma          Normalized, shop-isolated, indexed schema
│   └── src/
│       ├── config/                   env (validated), logger
│       ├── lib/                      prisma, telegram-auth (HMAC), telegram-bot,
│       │                             timezone, http-error
│       ├── middleware/               auth (initData verify + whitelist + sub),
│       │                             admin guard, rate-limit, error-handler
│       ├── modules/                  auth · products · inventory · dashboard ·
│       │                             settings · reports · notifications · admin
│       ├── jobs/                     node-cron notification scheduler
│       └── server.ts
│
└── apps/web/                       React + Vite + Tailwind (mobile-first)
    └── src/
        ├── lib/                      api (offline-aware), telegram bridge, cache
        ├── i18n/                     instant-switch locale provider (+ RTL)
        ├── store/                    zustand: auth, sync status
        ├── hooks/                    React Query data hooks
        ├── components/               reusable UI (Sheet, Toast, Toggle, …)
        └── features/                 dashboard · inventory · scanner · product ·
                                      settings · admin · auth gate
```

### Security model
- **Telegram `initData` is verified server-side** with the official HMAC-SHA256 algorithm (`HMAC(bot_token, "WebAppData")` → check string), constant-time compared, with an `auth_date` freshness window (replay protection). See `apps/api/src/lib/telegram-auth.ts`.
- The backend **never trusts client-provided identity** — the user id comes only from the verified payload.
- Every protected route runs `requireAuth`: verify → whitelist lookup → subscription check → **403** if not authorized / expired / disabled.
- **Strict shop isolation**: every query is scoped by `ownerId`; one shop can never read another's data.
- Hardening: Helmet, CORS allow-list, per-route rate limiting, Zod validation on every input, Prisma parameterized queries (no SQL injection), validated env (fail-fast), secrets only via env vars.

### Database
Normalized PostgreSQL schema with composite indexes tuned for thousands of products/batches on a free Neon plan:
`whitelisted_users` · `products` (unique `ownerId+barcode`) · `inventory_batches` (FEFO via `expiryDate` index) · `stock_movements` (audit trail) · `notification_logs` (dedupe) · `admin_audit_logs`.

---

## 🚀 Setup (local)

### Prerequisites
- Node 20+, pnpm 9+, a Telegram bot token (from [@BotFather](https://t.me/BotFather)), a free [Neon](https://neon.tech) Postgres database.

### 1. Install
```bash
pnpm install
```

### 2. Configure the API
```bash
cp apps/api/.env.example apps/api/.env
# Fill DATABASE_URL + DIRECT_URL (Neon), TELEGRAM_BOT_TOKEN,
# ADMIN_TELEGRAM_IDS (your Telegram id), CORS_ORIGINS.
```

### 3. Migrate + seed the database
```bash
pnpm --filter @inv/api db:generate
pnpm --filter @inv/api db:migrate      # creates the schema (dev)
SEED_ADMIN_ID=<your_telegram_id> pnpm --filter @inv/api db:seed
```

### 4. Configure the web app
```bash
cp apps/web/.env.example apps/web/.env
# Set VITE_API_BASE_URL (e.g. http://localhost:4000/api) and
# VITE_CONTACT_ADMIN_URL. For browser testing without Telegram set
# VITE_DEV_TELEGRAM_ID=<seeded id> and ALLOW_INSECURE_AUTH=true in the API .env.
```

### 5. Run everything
```bash
pnpm dev          # api on :4000, web on :5173 (parallel)
```

### 6. Wire up Telegram
In @BotFather: set the Mini App / Menu Button URL to your web app URL (use an HTTPS tunnel like `cloudflared` / `ngrok` in dev). Open the bot → launch the Mini App.

---

## ☁️ Deployment (best free-tier setup)

| Layer    | Service                | Why |
|----------|------------------------|-----|
| Database | **Neon PostgreSQL**    | Generous free tier, serverless, pooled + direct URLs |
| API + cron | **Render** (`render.yaml`) or **Railway/Fly** | Long-running Node process runs Express **and** the node-cron scheduler |
| Web      | **Vercel** / Cloudflare Pages (`apps/web/vercel.json`) | Fast global static hosting for the SPA |

1. **Neon**: create a project; copy the **pooled** URL → `DATABASE_URL` and the **direct** URL → `DIRECT_URL`.
2. **API on Render**: new Blueprint from this repo (`render.yaml`); set the secret env vars. Build runs `prisma migrate deploy` then starts the server.
   - ⚠️ Free Render web services sleep when idle, pausing cron. Keep `/health` warm with an uptime pinger (e.g. cron-job.org) **or** use Railway/Fly for always-on cron.
3. **Web on Vercel**: import the repo, root = `apps/web`; set `VITE_API_BASE_URL` to your API URL + `/api`, and `VITE_CONTACT_ADMIN_URL`. Set the API's `CORS_ORIGINS` to the Vercel domain.
4. **@BotFather**: point the Mini App URL at the Vercel domain.

Docker (Fly/Railway/VPS): `apps/api/Dockerfile` builds and runs migrations on boot.

---

## 🌍 Adding a language
1. Create `packages/shared/src/i18n/dictionaries/<lang>.ts` implementing `TranslationDict` (TypeScript enforces every key — a missing key won't compile).
2. Register it in `packages/shared/src/i18n/index.ts` and add the locale to `LOCALES` (and `RTL_LOCALES` if needed) in `types/index.ts`.
That's it — UI, notifications, and the language picker pick it up automatically.

---

## 📜 Scripts (root)
```bash
pnpm dev          # run api + web
pnpm build        # build all packages
pnpm typecheck    # typecheck all packages
pnpm db:migrate   # prisma migrate dev
pnpm db:deploy    # prisma migrate deploy (prod)
pnpm db:seed      # seed demo data
pnpm db:studio    # Prisma Studio
```

## API reference (all under `/api`, all require Telegram auth)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/auth/me` | Verify & return profile + settings |
| GET | `/dashboard` | Health stats + critical + recent |
| GET | `/inventory` | Search/filter/sort/paginate |
| GET | `/products/lookup?barcode=` | Fast scan resolution |
| GET/POST/PATCH/DELETE | `/products/:id` | Product CRUD |
| POST | `/products/:id/batches` | Add stock delivery |
| POST | `/products/:id/movements` | Sold/discarded/damaged/returned/removed |
| PATCH | `/settings` | Update language & preferences |
| GET | `/reports/movements` · `/reports/expiry` | History & expiry reports |
| GET/POST/PATCH | `/admin/users` … | Admin (master id or `X-Admin-Token`) |

---

Built to be secure, scalable, fast on low-end phones, usable on weak connections, and easy to extend.
