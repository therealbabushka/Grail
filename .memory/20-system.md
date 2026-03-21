## 20 — System Architecture

### System Overview
- Turborepo monorepo with a single Next.js 16 (App Router + Turbopack) application in `apps/web`, a shared UI package in `packages/ui`, backed by Supabase (PostgreSQL + Auth), deployed to Vercel.
- **Layout:** `#main` uses **`MainContentWidth`** — client shell with `usePathname()`: `max-w-[1600px] mx-auto` on all routes **except** `/market` listings (full width); `/market/[id]` and other routes use the cap (same as **`TopTabs`** inner row). Root uses `min-w-0 w-full` on `html`/`body`/`#main`; horizontal padding `px-10` (40px) on nav row and pages.

### Project Structure
```
Grail/
├── apps/web/              # Next.js 16 app
│   ├── app/               # Pages, layouts, route handlers
│   ├── components/        # App-specific components
│   └── middleware.ts       # Auth route protection via @supabase/ssr
├── packages/
│   ├── ui/                # @workspace/ui — shadcn components, styles, utils
│   ├── eslint-config/     # Shared ESLint rules
│   └── typescript-config/ # Shared tsconfig presets
├── SPEC.md                # Canonical product spec
└── .memory/               # Memory Bank
```
- Path alias: `@/*` → `apps/web/*`.
- Shared UI imported as `@workspace/ui`.

### Route Architecture
| Route | Access | Purpose |
|-------|--------|---------|
| `/` | Public | Market-first landing (search + curated rails) |
| `/market` | Public | Marketplace browse/search |
| `/market/[id]` | Public | Marketplace item detail |
| `/dashboard` | Auth-gated UI | Command Center HUD (`AuthGate`) |
| `/login` | Public | Google OAuth |
| `/float-flip` | Auth-gated UI | Trades pillar (Float Flip) |
| `/trade-links` | Auth-gated UI | **Alias** — re-exports `float-flip/page.tsx` |
| `/loadout` | Auth-gated UI | Loadouts (Supabase; no demo seed) |
| `/loadout/[id]` | Public | Shareable loadout view (when `is_public = true`) |
| `/sniper` | Auth-gated UI | Watchlist pillar |
| `/watchlist` | Auth-gated UI | **Alias** — re-exports `sniper/page.tsx` |
| `/profile` | Auth-gated UI | Profile / currency settings |

- **Middleware** (`apps/web/middleware.ts`): `AUTH_DISABLED = false`. Refreshes session; **public paths** include `/`, `/market`, `/market/*`, `/login`, `/auth/callback`, `/design-system`, `/shadcn-preview`, `/api/*`, `/loadout/*`. Does **not** blanket-redirect unauthenticated users to `/login`; pillar pages use **`AuthGate`** so deep links work and sign-in is in-flow.

### Database Schema (Supabase — core tables)
1. **profiles** — extends `auth.users` (currency_preference, etc.). Auto-created via trigger on `auth.users` INSERT.
2. **trades** — P&L / trade rows (`user_id`, skin, wear, variant, float, prices, status, dates).
3. **loadouts** — `slots` JSONB, `is_public`; **no** client-side demo store in production UI.
4. **targets** — Watchlist targets (price, float range, status, `marketplace_links` JSONB).
5. **target_watchlists** / **target_watchlist_items** — Named watchlists + membership (broker-style).
6. **price_alerts** — GTT-style alerts (notify/link only).
7. **items** — Static CS2 catalog (~3500+ rows, `name` UNIQUE).
8. **market_price_snapshots** / **market_price_candles** — Live pricing time-series.

Key DB features: `updated_at` triggers, composite indexes, `float_range_valid` CHECK on targets, `sell_after_buy` on trades.

### RLS Policies
- profiles/trades/loadouts/targets/target_watchlists/target_watchlist_items/price_alerts: users can only access their own rows (`auth.uid() = user_id`) where applicable.
- loadouts: additionally, public loadouts (`is_public = true`) are SELECT-able by anyone.
- items + market price tables: read policies per `schema.sql` (catalog and pricing data).

### Data Flow & Fetching Strategy
- **Reads:** Mix of RSC and client `createBrowserClient()` from `@/lib/supabase/browser` for pillar pages.
- **Writes:** Client `upsert`/`insert`/`delete` against Supabase with RLS (trades, loadouts, targets, watchlists).
- **Legacy note:** Some surfaces (e.g. `/dashboard`) may still reference `useDemoStore` until migrated to Supabase metrics.
- **Profit/ROI:** Computed client-side (`sell_price - buy_price`, `(profit / buy_price) * 100`).
- **Pricing pipeline** (when live pricing is in use) supports future unrealized P&L and a holdings view for open trades.

### Cross-Pillar Integration
- **Watchlist → Trades:** "Acquired" target → prompt "Log this as a trade in Trades?" → pre-fills trade form with skin_name, wear, variant, float (from max_float), acquired_price, currency, date.
- **Loadouts → Watchlist:** Empty loadout slot → "Add to Watchlist" action → creates target pre-filled with weapon type.

### Non-Functional Requirements
- **Performance:** Vercel Analytics + Speed Insights (`<Analytics />`, `<SpeedInsights />` in root layout).
- **Security:** RLS on user data; middleware refreshes session; pillar UX uses `AuthGate` for signed-out users.
- **Accessibility:** Keyboard navigation, ARIA via Radix, color never sole indicator, focus-visible preserved.
- **Monitoring:** Vercel deployment logs + Supabase dashboard for MVP (Sentry is post-MVP).
