## 70 — Domain & Project Knowledge

### Domain Concepts
- CS2 skin trading concepts: skins, floats, wear tiers (FN, MW, FT, WW, BS), StatTrak, Souvenir, rarity tiers, and marketplace dynamics.
- Grail pillars: Trades (P&L and trade tracking), Loadouts (inventory visualization and sharing), Watchlist (target watchlist).

### Relationship Map (High Level)
- Watchlist targets can be converted into Trades when acquired.
- Loadouts slots reference skins and rarity information, potentially using the static `items` database for metadata.
- Profiles define user-level preferences such as display currency.
- Market-first loop: Browse in `/market` → route into Watchlist/Trades via prefilled CTAs.

### Key Resources
- `SPEC.md` — canonical product and technical specification.
- Supabase dashboard — database, RLS, and auth configuration.

### Project Best Practices
- Follow the visual/UX guidance, typography choices, and interaction patterns defined in `SPEC.md` and the current implementation (e.g., `globals.css`, design system page).
- Consult `/.impeccable.md` for persistent design context (brand personality, design principles, a11y target, motion guidelines).
- Apply the 5 design principles on every UI change: signal over decoration, premium restraint, tactical clarity, semantic color discipline, accessible by default.
- Respect RLS policies and use Server Actions for mutations.
- Prefer composable shadcn/ui components and shared UI primitives in `packages/ui`.
- For market detail pricing visuals, keep chart scope and colors config-driven (e.g., `CHART_MARKETS`, `MARKET_COLORS`) so adding new marketplace APIs only requires provider + config updates.
- For loadout slot editing, prefer skin-name autocomplete suggestions with thumbnails from `items`/catalog data; auto-fill image and optional rarity rather than accepting manual image URL.
- For `/market` filters, keep unsupported listing-level controls visible-but-disabled until listing feed fields (trade hold, fade, phase, sticker state, etc.) are ingested; avoid fake precision from item-level catalog data.
- For `/market` layout density, use progressive disclosure (collapsed advanced/expert groups), sticky compact filter rail, and removable active filter chips before removing filters outright; this preserves power while reducing height.
- For BitSkins-like market feel, prefer compact listing mode and higher desktop columns with a dedicated listing toolbar (sort + density) so browsing remains scan-first rather than form-first.
- For `/market` filter interaction, use nested pane navigation (left section list, right options panel) and mirror this on mobile with a drawer that supports draft edits plus sticky Reset/Apply commit actions.
- For closer BitSkins parity on desktop, use left sidebar row controls that open flyout panes at the right edge of the filter rail; Type should support an additional pane for weapons.
- For every create/edit/status-change flow, run a UX "why" pass: trim non-essential steps, keep required-only first, show inline guidance/errors, prefer structured dialogs over browser prompts, and normalize stale local state to avoid crashes.
- For Trades specifically, sold-state constraints (sell price/date) should be validated inline and submitted only when consistent with buy data.
- For Loadouts management actions (e.g., rename), avoid native browser prompts and use first-class dialogs with clear copy and explicit actions.

### Broker feature reference (stock brokers)
- **Watchlists:** Multiple lists, many instruments, custom groups, color-coding, pre-built indices; scanners and price/index alerts that can trigger notifications or orders.
- **Order types:** Limit, market, stop, bracket; GTT (Good Till Triggered) with target + stop (OCO); basket orders; alert-triggers-order (ATO). Order window: margin, market depth (bid/ask).
- **Portfolio:** Holdings with cost basis, market value, unrealized P&L, realized P&L, daily P&L; segment views; LTCG/STCG and tax tagging.
- **P&L and reports:** True P&L (realized + unrealized), equity curve vs benchmarks, tradewise/scripwise reports, tax-ready annual/quarterly, PDF/Excel download.
- **Dashboard:** Single view with portfolio value, day change, unrealized/realized; heatmaps and charting; consistent terms: Holdings, Positions, Orders, P&L, Watchlist.

### Grail alignment to broker norms
- **Trades** = realized P&L (career profit, capital at risk, win rate, ROI); open positions = “holdings”. Once live pricing exists, add unrealized P&L and daily P&L.
- **Watchlist** = watchlist/targets (target price, status); opportunity to add multiple named watchlists and “alert when price &lt; X” (notification/link only).
- **Live pricing pipeline** enables unrealized P&L on open trades and a holdings view; equity curve and tax-friendly export are broker-grade enhancements.

### FAQ / Implicit Knowledge
- Float values are stored and displayed to 4 decimal places; validation warns but does not hard-block inconsistent wear ranges.
- Public loadouts are viewable without auth and should have rich OG metadata for social sharing.

