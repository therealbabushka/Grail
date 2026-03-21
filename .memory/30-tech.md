## 30 — Technology Landscape

### Technology Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router + Turbopack) |
| Language | TypeScript |
| UI Components | shadcn/ui + Radix UI |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth with Google OAuth |
| Deployment | Vercel |
| Analytics | @vercel/analytics + @vercel/speed-insights |
| Toasts | shadcn Sonner |

### Typography
- **Sitewide:** JetBrains Mono — Next.js `layout.tsx` loads `--font-jetbrains-mono`; `--font-sans` and `--font-mono` in `globals.css` both use it; `font-hero-serif` utility uses the same stack.

### Development Environment
- **Monorepo:** Turborepo with pipelines in `turbo.json`.
- **Apps:** `apps/web` — main Next.js 16 application.
- **Packages:** `packages/ui` (@workspace/ui), `packages/eslint-config`, `packages/typescript-config`.
- **Path alias:** `@/*` → `apps/web/*`.

### Key Dependencies
- Next.js 16, React, `@supabase/ssr` (auth + DB client), shadcn/ui, Radix UI, Tailwind CSS.
- JetBrains Mono (Google Font) for default UI.

### Environment Variables
| Variable | Purpose | Scope |
|----------|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Client + Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Client + Server |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin access (seeding scripts only) | Server only |
| `BITSKINS_API_KEY` | BitSkins API key (v2 live pricing) | Server only (`apps/web`) |
| `BITSKINS_API_SECRET` | BitSkins 2FA TOTP seed (base32) for per-request `code` | Server only (`apps/web`) |
| `PRICE_EMPIRE_API_KEY` | Price Empire API key (one-time bulk seed; 100 total calls) | Server only (`apps/web`) |

- Google OAuth credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) are configured directly in the Supabase dashboard, not in application code.

### Build & Deployment
- Turborepo build pipelines (`turbo.json`).
- Deployed to Vercel (no custom domain for MVP).
- `<Analytics />` and `<SpeedInsights />` added to root layout.

### Multi-Currency Support
- Supported: USD (default), EUR, GBP, CNY.
- Stored in original entry currency — never mutated.
- Display-only conversion using exchange rate API: `open.er-api.com` (free, no key) or `exchangerate-api.com`.
- Rates cached server-side, refreshed once daily.

### CS2 Items Database
- Source: scraped from csgostash.com (~3500 weapon skins, knives, gloves).
- Fields: name, weapon_type, collection, rarity, image_url (Steam CDN).
- Seeded into `items` table via script; `items.name` has UNIQUE constraint for idempotent re-seeding.
- Used for: skin name autocomplete (fuzzy search), rarity lookup for glow effects, weapon type filtering.
- Catalog API now prefers Supabase `items` as source-of-truth (`/api/catalog`) and falls back to remote feed only when DB has no rows.
- Incremental Steam market sync endpoint exists at `/api/catalog/sync` (authorized) to upsert broader CS2 market classes (stickers, containers, agents, patches, charms, etc.) into `items`.

### AI Agents & Skills (`.agents/`)
**Skills:** shadcn (manage shadcn components, registries, styling); frontend-design (distinctive UI, typography, motion — `.agents/skills/frontend-design/`); teach-impeccable (design context setup — complete, output in `/.impeccable.md`).

**Agents (9):**
| Agent | Purpose |
|-------|---------|
| architect | System design, scalability |
| build-error-resolver | TypeScript/build error fixes |
| code-reviewer | Code quality, security, maintainability |
| database-reviewer | PostgreSQL/Supabase optimization, RLS |
| planner | Feature planning, step breakdown |
| refactor-cleaner | Dead code cleanup, dependency removal |
| security-reviewer | Vulnerability detection, OWASP |
| tdd-guide | Test-driven development |
| doc-updater | Documentation and codemap updates |

### Testing (Post-MVP)
- Framework: Vitest + React Testing Library.
- Priority paths: profit/ROI calculation, currency conversion math, RLS policy correctness.
