## 40 — Current Focus & State

### Active Sprint
- 5-day MVP sprint (Tue–Sun) delivering all three Grail pillars per `SPEC.md`.
- Currently in **Day 1 (Foundation)**.

### Recent Changes
- Turborepo monorepo initialized with `apps/web` (Next.js 16) and `packages/ui` (shadcn/ui + Tailwind).
- `SPEC.md` updated to lock **Market v2** and the **market-first** route architecture (`/` public landing, `/market`, `/market/[id]`, `/dashboard` for the command center).
- Memory Bank initialized and updated to match full SPEC.
- Market detail live pricing upgraded: clickable marketplace prices now route to exact listing/search URLs aligned with pricing identifiers.
- Market detail chart upgraded to shadcn-style Recharts line chart with 7D/30D/90D controls and initial comparison scope (Steam, Skinport, BitSkins).
- `/market` filters expanded to a comprehensive BitSkins-style panel with basic + advanced sections; unsupported listing-level switches are visible but disabled until listing feed metadata is available.
- `/market` filter UX compacted using progressive disclosure (collapsed Advanced/Expert sections), removable active-filter chips, and sticky compact sidebar; page container widened to end-to-end to recover screen real estate.
- `/market` now also adopts BitSkins-style market-board strengths: denser multi-column listings, a market notice/status strip, and a right-side listing toolbar for sort and compact/comfortable density.
- `/market` filters now support nested multi-pane behavior and multi-select facets (type/weapon/rarity/exterior), plus a mobile draft drawer with sticky Reset/Apply actions.
- Desktop `/market` filter placement now mirrors BitSkins more closely: fixed left rail with row entries and right-side flyout panes, including split Type → Weapons pane behavior.
- Watchlist UX pass: Add Target now uses required-first guidance + inline validation; Mark Acquired now uses a structured dialog (price/date) instead of `prompt`; prototype store now normalizes stale local state safely.
- Trades + Loadouts UX pass: Trades delete now uses confirmation dialog (no native confirm), sold-state fields have stronger inline validation, and Loadout rename now uses structured dialog (no native prompt).
- Market catalog reliability pass: `/api/catalog` now reads Supabase `items` first (remote fallback), normalizes unknown labels, and `/api/catalog/sync` can ingest Steam marketplace rows into `items` with incremental upserts.
- Live pricing persistence updated: history is now read from stored daily candles (`market_price_candles.timeframe='1d'`), while snapshot route persists only latest prices; local backfill endpoint added for range seeding (start: 1 month).
- Pricing pipelines expanded: new authorized `/api/pricing/scrape-today` endpoint can batch-refresh all items (offset/limit) and write one `1d` candle per market for today; backfill now keeps fetched history by default (`prune` opt-in).

### Day 1 Completed
- [x] Initialize Next.js 16 project with TypeScript (monorepo exists).
- [x] Setup Tailwind CSS + shadcn/ui + Radix (packages/ui configured).

### Day 1 Remaining (Immediate Priorities)
- [x] Create Supabase project (via MCP).
- [x] Apply database schema (tables, triggers, RLS, indexes) via migration.
- [ ] Re-enable auth (currently disabled; Google OAuth setup deferred).
- [x] Setup `@supabase/ssr` client + `/auth/callback` route + middleware.
- [ ] Build base layout with horizontal top tabs navigation (Home icon + 3 pillar tabs).
- [ ] Setup dark theme with full design system tokens.
- [ ] Create profile auto-creation trigger + user profile page.
- [ ] Build Market-first Landing (`/`) + Market (`/market`) experience.
- [ ] Ensure middleware treats `/` + `/market*` as public and `/dashboard` as protected (MVP auth flow).

### Open Questions
- None — all product and technical decisions are resolved in `SPEC.md` § Resolved Questions.

### Blockers
- Auth is intentionally disabled for now; Google OAuth configuration in Supabase dashboard is deferred.

### Recent Learnings
- `SPEC.md` is the authoritative source of truth. Memory Bank distills it for quick session loading.
- SPEC has been vetted 3 times; SQL schema includes proper NOT NULL, CHECK constraints, DECIMAL precision, composite indexes, and auto-creation triggers.
