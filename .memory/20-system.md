## 20 — System Architecture

### System Overview
- Turborepo monorepo with a single Next.js 16 (App Router + Turbopack) application in `apps/web`, a shared UI package in `packages/ui`, backed by Supabase (PostgreSQL + Auth), deployed to Vercel.

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
| `/dashboard` | Protected | Home Dashboard (command center HUD) |
| `/login` | Public | Auth disabled screen |
| `/trade-links` | Protected | Trade Links pillar |
| `/loadout` | Protected | Loadouts (user's loadouts) |
| `/loadout/[id]` | Public | Shareable loadout view (when `is_public = true`) |
| `/watchlist` | Protected | Watchlist pillar |
| `/profile` | Protected | Profile / currency settings |

- **Middleware** (`apps/web/middleware.ts`): auth protection via `@supabase/ssr` (currently disabled in code); public routes include `/`, `/market*`, `/login`, `/loadout/[id]`.

### Database Schema (Supabase — 5 Tables)
1. **profiles** — extends `auth.users` (id, display_name, avatar_url, currency_preference). Auto-created via trigger on `auth.users` INSERT.
2. **trades** — Trades data (skin_name, wear, variant, float_value, image_url, buy/sell price, status, currency, dates, notes).
3. **loadouts** — Loadouts (name, is_public, slots JSONB).
4. **targets** — Watchlist (skin_name, wear, variant, target_price, currency, float range, status, acquired_price/date, marketplace_links JSONB, notes).
5. **items** — Static CS2 items (~3500 rows, name UNIQUE, weapon_type, collection, rarity, image_url).

Key DB features: `updated_at` triggers on all tables, composite indexes on user queries, `float_range_valid` CHECK constraint on targets.

### RLS Policies
- profiles/trades/loadouts/targets: users can only access their own rows (`auth.uid() = user_id`).
- loadouts: additionally, public loadouts (`is_public = true`) are SELECT-able by anyone.
- items: publicly readable by all (static reference data).

### Data Flow & Fetching Strategy
- **Reads:** React Server Components fetch via Supabase client in `page.tsx` / `layout.tsx`.
- **Writes:** Next.js Server Actions for create/update/delete mutations.
- **Client interactivity:** `@supabase/ssr` client for optimistic updates where needed (trade creation, target status changes).
- **Profit/ROI:** Computed client-side (`sell_price - buy_price`, `(profit / buy_price) * 100`).
- **Pricing pipeline** (when live pricing is in use) supports future unrealized P&L and a holdings view for open trades.

### Cross-Pillar Integration
- **Watchlist → Trades:** "Acquired" target → prompt "Log this as a trade in Trades?" → pre-fills trade form with skin_name, wear, variant, float (from max_float), acquired_price, currency, date.
- **Loadouts → Watchlist:** Empty loadout slot → "Add to Watchlist" action → creates target pre-filled with weapon type.

### Non-Functional Requirements
- **Performance:** Vercel Analytics + Speed Insights (`<Analytics />`, `<SpeedInsights />` in root layout).
- **Security:** RLS enforced on all tables; middleware protection is planned (auth currently disabled).
- **Accessibility:** Keyboard navigation, ARIA via Radix, color never sole indicator, focus-visible preserved.
- **Monitoring:** Vercel deployment logs + Supabase dashboard for MVP (Sentry is post-MVP).
