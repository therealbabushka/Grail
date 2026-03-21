## 40 — Current Focus & State

### Active Sprint
- 5-day MVP sprint (Tue–Sun) delivering all three Grail pillars per `SPEC.md`.
- **Progress:** Foundation + market + pricing + Supabase pillars underway; command center and remaining polish per backlog.

### Recent Changes
- **`/market` filters:** Wired filter logic to catalog data (keyword across name/weapon/rarity/id; weapon multi-select; **Other** category; sticker/charm substring matches; price band + market-items-only + price sort using merged `market_price_snapshots` when catalog is from Supabase); added Utility accordion (view mode, Steam ID placeholder); rank inputs disabled in catalog mode; Doppler phases when **Knives** with no weapon or a Doppler-eligible knife selected.
- **Design:** Added `.agents/skills/frontend-design/` (from user skill file + Grail-specific section). Sitewide typography is **JetBrains Mono** (`--font-jetbrains-mono` for `font-sans` / `font-mono` / `font-hero-serif`). DM Sans and DM Serif removed from layout. Design-system typography docs updated. `SPEC.md` § Component Library + AI skills table updated.
- `/market/[id]`: live pricing fetch remains scoped to the skin detail page (after catalog load). **Live pricing** shows a fixed row of **seven** markets (Steam, Skinport, CSFloat, BitSkins, DMarket, Waxpeer, CS.MONEY) with logos + lowercase names; **Visit** links to `marketplace-links.ts` URLs when price is missing; **Buy on** block removed. **Market price history** is a **demo** Recharts line chart (dummy 730d data, filters 1W/1M/6M/1Y/All, market toggles); history API not fetched on this page for now.
- Loadout Canvas (`/loadout`): removed localStorage/demo mode and auto-insert of a default loadout; data is Supabase-only with AuthGate-wrapped loading/empty/create flow. Watchlist (`/sniper`): URL prefill now backfills `watchlistId` when watchlists finish loading after the dialog opens. `SPEC.md` updated for loadout storage behavior.
- Landing page (`/`) hero: Figma Tickets `8646:30422` — dark `lg+` `max-w-[1600px]` + `bg-[#080808]`; right art `right-0` then mask + stroke; copy `left-10` + `top-[138px]`; `hero-section-right.png`; mobile/light stacked same. **Browse Market** / **Create Watchlist**; hero uses `font-hero-serif` (JetBrains stack in `globals.css`).
- Sitewide shell: `#main` → `MainContentWidth` uses `usePathname()` — `max-w-[1600px] mx-auto` on capped routes; **`/market` listings** are full width (`max-w-none`); `TopTabs` inner row stays `max-w-[1600px]`; `main` uses `w-full min-w-0`; horizontal padding `px-10` / 40px (login card keeps `max-w-md`).
- Turborepo monorepo initialized with `apps/web` (Next.js 16) and `packages/ui` (shadcn/ui + Tailwind).
- `SPEC.md` updated to lock **Market v2** and the **market-first** route architecture (`/` public landing, `/market`, `/market/[id]`, `/dashboard` for the command center).
- Memory Bank initialized and updated to match full SPEC.
- Market detail live pricing upgraded: clickable marketplace prices now route to exact listing/search URLs aligned with pricing identifiers.
- Market detail chart upgraded to shadcn-style Recharts line chart with 7D/30D/90D controls and initial comparison scope (Steam, Skinport, BitSkins).
- `/market` filters expanded to a comprehensive BitSkins-style panel with basic + advanced sections; unsupported listing-level switches are visible but disabled until listing feed metadata is available.
- `/market` filter UX compacted using progressive disclosure (collapsed Advanced/Expert sections), removable active-filter chips, and sticky compact sidebar; listings main column is full width (no `1600px` cap).
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
- [x] Re-enable auth (Google OAuth).
- [x] Setup `@supabase/ssr` client + `/auth/callback` route + middleware.
- [ ] Build base layout with horizontal top tabs navigation (Home icon + 3 pillar tabs).
- [ ] Setup dark theme with full design system tokens.
- [x] Create profile auto-creation trigger (profile rows generated on sign-in); persist profile settings UI next.
- [ ] Build Market-first Landing (`/`) + Market (`/market`) experience.
- [ ] Ensure middleware treats `/` + `/market*` as public and `/dashboard` as protected (MVP auth flow).

### Open Questions
- None — all product and technical decisions are resolved in `SPEC.md` § Resolved Questions.

### Blockers
- Google OAuth configuration in the Supabase dashboard still must be completed/verified.

### Recent Learnings
- `SPEC.md` is the authoritative source of truth. Memory Bank distills it for quick session loading.
- SPEC has been vetted 3 times; SQL schema includes proper NOT NULL, CHECK constraints, DECIMAL precision, composite indexes, and auto-creation triggers.
