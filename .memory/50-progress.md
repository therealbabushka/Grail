## 50 — Project Progress

### Overall Status
- **Phase:** Mid-sprint — market shell, catalog, live pricing pipelines, and Supabase-backed pillars are in progress; `SPEC.md` is canonical.
- **Health:** Green — active development; some surfaces (e.g. `/dashboard`) may still use prototype store until fully migrated.

### Completed Work
- [x] Product specification (`SPEC.md`) written, vetted 3 times, and locked.
- [x] Turborepo monorepo structure with `apps/web` and shared packages.
- [x] `packages/ui` configured with shadcn/ui, Tailwind CSS, Radix UI.
- [x] 9 AI agents + shadcn skill imported into `.agents/`.
- [x] Memory Bank initialized and populated (`.memory/01–70`).
- [x] Design system page created (`apps/web/app/design-system/page.tsx`).
- [x] Global CSS with design tokens (`packages/ui/src/styles/globals.css`).
- [x] Market v2 prototype: `/` market-first landing, `/market` filters + pagination, `/market/[id]` spec-sheet + marketplace links, `/api/catalog` proxy.
- [x] Market filters upgraded to a comprehensive BitSkins-style panel (`/market`) with expanded functional filters (type, multi-exterior, StatTrak mode, float range, high-tier, keyword filters) and disabled listing-level placeholders for future feed attributes.
- [x] Market layout and filter density optimized: end-to-end width container, compact/sticky filter rail, collapsed advanced/expert groups, and active removable filter chips to reduce vertical footprint.
- [x] BitSkins market-board refinements implemented on `/market`: denser listing grid, market notice strip, and listing toolbar (sort + density toggle) for better data-dense browsing.
- [x] Nested multi-pane filters implemented on `/market` with multi-select facets (type/weapon/rarity/exterior) and a mobile drawer with sticky Reset/Apply commit actions.
- [x] Desktop filter placement aligned closer to BitSkins: left rail row controls opening right flyout panes, with Type → Weapons split-pane selection behavior.
- [x] Supabase project connected via MCP; schema applied (tables + triggers + RLS) and app wired with `@supabase/ssr` + middleware + `/auth/callback`.
- [x] Live pricing UX pass on `/market/[id]`: marketplace prices are clickable, Steam links use exact listing URL with `market_hash_name`, and chart uses shadcn-style Recharts with 7D/30D/90D controls.
- [x] Initial multi-market chart scope implemented: Steam + Skinport + BitSkins (config-driven for future expansion to more marketplaces).
- [x] Live pricing persistence: history reads stored daily candles (`market_price_candles.timeframe='1d'`); snapshot route persists only latest prices; local backfill endpoint added to seed ranges (start: 1 month).
- [x] Added authorized `/api/pricing/scrape-today` endpoint to batch-scrape all items and store today's `1d` candles + latest snapshots across supported markets; backfill retention now defaults to keep-all unless `prune=1`.
- [x] Market catalog pipeline hardened: `/api/catalog` now prefers Supabase-backed `items`, unknown labels are normalized in UI, and Steam-market sync endpoint (`/api/catalog/sync`) added for incremental DB upserts.

### Milestone Progress
| Milestone | Status | Notes |
|-----------|--------|-------|
| Day 1: Foundation | In Progress | Monorepo, UI, Supabase schema, auth callback, middleware, market routes, shell layout |
| Day 2: Trades | In Progress | Trades CRUD via Supabase (`/float-flip` / `/trade-links`); metrics/CSV |
| Day 3: Loadouts | In Progress | CT/T grid, public links, Supabase-only loadouts (no demo seed) |
| Day 4: Watchlist | In Progress | `/sniper` + `/watchlist` alias, watchlists + targets + alerts |
| Day 5: Polish + Deploy | Not Started | Hardening, Vercel env validation |

### Known Issues / Bugs
- `npm run typecheck` may fail in `@workspace/ui` (Phosphor exports) — unrelated to app routes; fix tracked separately.
- Dashboard may still use `useDemoStore` until wired to Supabase aggregates.

### Backlog (Full Sprint)
- **Day 1 remaining:** Base layout, navigation.
- **Day 2:** Trade CRUD server actions, trade form with validation, wear selector, profit/ROI logic, trade history with filtering, career profit counter, metrics, CSV export.
- **Day 3:** CT/T weapon grid, slot components, image URL input + preview, 3D tilt hover, rarity glow, save/load loadouts, multiple loadout management, shareable public links.
- **Day 4:** Target CRUD, target cards, acquired stamp animation, status toggle, marketplace quick links, status filtering, notes field, cross-pillar (Watchlist → Trades, Loadouts → Watchlist).
- **Day 5:** Multi-currency (profile preference + exchange rate API), CS2 items import (~3500), skin name autocomplete, responsive fixes, loading skeletons, error toasts, Vercel deployment, final testing.

### Risk Assessment
- **Timeline pressure:** 5 days for three full pillars + polish is aggressive; requires disciplined scope.
- **External dependencies:** Google OAuth setup still requires a dashboard step (pending).
- **Items database:** Scraping csgostash.com may require adjustment if site structure changes; fallback is manual JSON curation.
