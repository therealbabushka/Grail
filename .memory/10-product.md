## 10 — Product Definition

### Problem Statements
- Skin traders use ad-hoc spreadsheets, bookmarks, and the Steam inventory UI — leading to:
  - No clear view of realized profit/loss or capital at risk.
  - No beautiful way to visualize or share curated CS2 loadouts.
  - No organized system for hunting specific skins at specific prices and float ranges across marketplaces.

### Target Users
- **Active flippers** — traders buying/selling skins for profit, focused on margins and win rate.
- **Collectors** — players curating dream inventories with visual flair.
- **Hunters** — players targeting specific items at specific float/price thresholds across Steam, Skinport, CSFloat, Buff163.

### User Journeys
1. **Home Landing (`/`):** Market-first landing with search into Market and visual browsing entry points.
2. **Market (`/market`):** Browse/search catalog with filters; open item detail pages; jump to external marketplaces.
3. **Market → Actions:** From item detail, route into Watchlist (create target) or Trades (prefill trade) without retyping names.
4. **Dashboard (`/dashboard`):** At-a-glance summary of all three pillars — career profit, capital at risk, pillar cards with mini-previews and CTAs (post-login in full MVP).
5. **Trade Links (`/trade-links`):** Log trades (buy/sell with skin name, wear, variant, float, currency, image URL, notes). View career profit, win rate, avg ROI, best/worst flip. Filter trade history. Export CSV.
6. **Loadouts (`/loadout`):** Build CT + T loadouts in a weapon grid. Search skin name with thumbnail suggestions (auto-fills slot image), see 3D tilt + rarity glow on hover. Save multiple loadouts (Dream, Current, Budget). Share public links.
7. **Watchlist (`/watchlist`):** Add targets with skin name, wear, variant, price, float range, marketplace links, notes. Mark as acquired → optionally log as trade in Trades.
8. **Cross-pillar:** Watchlist → Trades (acquired target pre-fills trade form). Loadouts → Watchlist (empty slot → "Add to Watchlist" action).

### Marketplace Requirements (Prototype)
- Browse skins grid/list with images and rarity.
- Global search by skin name.
- Filters: weapon type, rarity, **exterior (FN/MW/FT/WW/BS)**, **StatTrak-only toggle**.
- Skin detail page with marketplace quick links + CTAs into Watchlist/Trades.

### Feature Requirements — Trades
- Trade CRUD with full form validation (see SPEC § Form Validation Rules).
- Fields: skin_name, wear, variant (none/stattrak/souvenir), float_value, image_url, buy_price, sell_price, status (open/sold), currency, buy_date, sell_date, notes.
- Profit and ROI computed client-side.
- Metrics: Career Profit (realized, sold only), Capital at Risk (open buy cost), win rate, avg ROI, best/worst flip, open positions count.
- Infinite scroll / load-more pagination for trade history.
- CSV export: `grail-trades-{date}.csv` with fields Date, Skin Name, Wear, Variant, Float, Buy Price, Sell Price, Profit, ROI%, Currency, Notes.
- Trade editing: all fields editable except reverting sold → open. Hard delete (no soft-delete).

### Feature Requirements — Loadouts
- Full CS2 weapon roster (CT + T sides): gear, pistols, rifles, SMGs, heavy — 50+ slots total.
- JSONB slots with canonical snake_case keys (e.g., `ct_awp`, `t_ak47`).
- Slot value: `{ skin_name, image_url, float_value, price_paid, rarity, variant }`.
- 3D tilt hover (holographic card effect) + rarity-based glow (7 tiers from Consumer to Gold).
- Multiple loadouts per user; `is_public` toggle for shareable links at `/loadout/[id]`.
- OG meta tags for social sharing (Discord, Twitter) via `generateMetadata()`.

### Feature Requirements — Watchlist
- Target CRUD: skin_name, wear (optional), variant, target_price, currency, min_float, max_float, image_url, notes, marketplace_links (JSONB: steam, skinport, csfloat, buff163).
- Statuses: hunting → acquired / abandoned.
- "Acquired" stamp animation.
- Quick links auto-generated from skin name; user can override.
- Filter targets by status.

### Broker-grade UX (reference)
- Target broker-grade clarity where applicable: multiple watchlists (Watchlist), unrealized P&L when live pricing exists, equity curve (cumulative P&L over time), tax-friendly export (e.g. fiscal-year filter). See SPEC § Broker-grade UX reference and Grail vs broker features.

### UX Guidelines
- **Per-pillar vibes:** Trades = Wall Street / neo-brutalist / terminal green. Loadouts = high-end gallery / glassmorphism. Watchlist = tactical HUD / mission control.
- **Empty states** double as onboarding (no separate modal or wizard).
- **Loading:** shadcn Skeleton components matching card/table shapes.
- **Errors:** Toast notifications via shadcn Sonner.
- **Optimistic updates:** Trade creation and target status changes update UI immediately; revert on failure.
- **Image URL handling:** Trades/Watchlist keep URL paste with fallback behavior; Loadout slot editor now derives image from selected skin suggestion (no manual image URL field).
- **Accessibility:** WCAG 2.2 AA target. Keyboard-navigable, color never sole indicator (+/− prefix + icons alongside green/red), focus-visible preserved, ARIA via Radix.
- **Universal UX decision checklist:** each flow must justify every step ("why now"), start with required-only input, show inline validation, avoid blocking prompts, support cancel/correction, and fail safe on stale client state.
- **Interaction safety:** core destructive or structural actions (delete, rename, acquired/sold transitions) should use explicit dialogs, not browser prompt/confirm.

### Brand & Design Principles
- **Brand personality:** Tactical · Premium · Precise.
- **Emotional goals:** Calm, premium, confidence-inducing — a cockpit you trust.
- **Visual references:** Apple-level polish (spacing, hierarchy, finish) with a tactical/terminal edge.
- **Anti-references:** No generic pastel SaaS; no Material/Google-y; no ultra-minimal monochrome.
- **Motion:** Bold + purposeful (rarity glow, 3D tilt, acquired stamp). Always respect `prefers-reduced-motion`.
- **Design Principles:**
  1. Signal over decoration.
  2. Premium restraint.
  3. Tactical clarity.
  4. Semantic color discipline.
  5. Accessible by default.

### User Metrics (Initial)
- Number of logged trades and total realized profit.
- Number of saved loadouts and public loadout views.
- Number of active sniper targets and acquisition rate.
