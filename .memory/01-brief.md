## 01 — Project Brief (Grail)

### Project Outline
- **Grail** is a purpose-built CS2 **market cockpit** for skin traders — market-first discovery plus a command center for execution.
- Replaces messy spreadsheets and scattered bookmarks with a unified toolkit to track profits, showcase loadouts, and hunt targets.

### Core Requirements (Three Pillars — Equal Priority, No Cuts)
1. **Trades** — Profit & loss tracker (Wall Street meets CS2).
2. **Loadouts** — Inventory showcase with shareable public links (gallery/glassmorphism).
3. **Watchlist** — Target watchlist with marketplace quick-links (tactical HUD).
- **Market-first**: `/` is a public landing with search + curated browsing entry points.
- A **Home Dashboard** at `/dashboard` acts as a heads-up display summarizing all three pillars at a glance.
- **Broker-grade UX reference:** Watchlists, P&L (realized + unrealized), and reporting are informed by stock-broker norms (Zerodha, IB, etc.); execution remains out-of-app (link to marketplaces).

### Success Criteria
- Authenticated users can log trades, manage loadouts, and track sniper targets end-to-end.
- Metrics (career profit, capital at risk, win rate, ROI) calculate correctly.
- Public loadout pages render with OG meta for social sharing.
- All UI/UX behavior matches the product spec in `SPEC.md`.

### Stakeholders
- **User:** Design-focused project owner providing product decisions and visual direction.
- **Agent:** AI coding agent responsible for all technical decisions and implementation.

### Constraints
- **Timeline:** 5 full-time days (Tue–Sun).
- **Tech stack:** Fixed — Next.js 16, Supabase, shadcn/ui, Tailwind CSS, Vercel.
- **Auth:** Supabase Auth with Google OAuth (login enabled for protected routes).
- **Currency:** Multi-currency display (USD, EUR, GBP, CNY); stored values never mutated.
- **Item data:** Static database (~3500 CS2 items) scraped from csgostash.com; no live API.
- **Images:** URL paste / Steam CDN only; no Supabase storage for MVP.
- **Deployment:** Vercel (no custom domain for MVP).

### Timeline & Milestones
| Day | Focus | Key Deliverables |
|-----|-------|------------------|
| 1 (Tue) | Foundation | Auth, layout, navigation, design tokens, Home Dashboard |
| 2 (Wed) | Trades | Trade CRUD, metrics, CSV export |
| 3 (Thu) | Loadouts | CT/T grid, 3D tilt, rarity glow, shareable links |
| 4 (Fri) | Watchlist | Target CRUD, marketplace links, cross-pillar integration |
| 5 (Sat) | Polish + Deploy | Multi-currency, items import, autocomplete, responsive, deploy |
