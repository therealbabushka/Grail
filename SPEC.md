# Grail - CS2 Skin Trading Command Center

> A unified toolkit for Counter-Strike 2 skin traders. Track profits, showcase loadouts, hunt targets.

## Product Vision

**One dashboard. Three essential tools.** Grail replaces messy spreadsheets and scattered bookmarks with a purpose-built command center for skin traders.

---

## Quick Reference

| Aspect         | Decision                               |
| -------------- | -------------------------------------- |
| **App Name**   | Grail                                  |
| **Timeline**   | 5 days (Tue-Sun), full-time            |
| **Pillars**    | All 3, equal priority, no feature cuts |
| **Auth**       | Google OAuth only                      |
| **Currency**   | Multi-currency support (MVP)           |
| **Item Data**  | Static database (~3500 CS2 items)      |
| **Images**     | URL paste / Steam CDN                  |
| **Deployment** | Vercel (no custom domain for MVP)      |

---

## Team Context

- **User:** Design-focused, provides product decisions and vision
- **Agent (Open-Thinking):** Executes all coding, implementation, technical decisions

---

## Target Users

- **Active flippers** - Traders who buy/sell skins for profit
- **Collectors** - Players curating dream inventories
- **Hunters** - Players targeting specific items at specific prices

---

## Tech Stack

| Layer         | Technology                   |
| ------------- | ---------------------------- |
| Framework     | Next.js 16 (App Router)      |
| Language      | TypeScript                   |
| UI Components | shadcn/ui + Radix UI         |
| Styling       | Tailwind CSS                 |
| Database      | Supabase (PostgreSQL)        |
| Auth          | Supabase Auth (Google OAuth) |
| Deployment    | Vercel                       |

---

## Project Structure (Turborepo Monorepo)

```
Grail/
├── apps/
│   └── web/                     # Next.js 16 app (App Router + Turbopack)
│       ├── app/                 # Pages, layouts, route handlers
│       └── components/          # App-specific components
├── packages/
│   ├── ui/                      # Shared UI library (@workspace/ui)
│   │   └── src/
│   │       ├── components/      # shadcn/ui components
│   │       ├── lib/             # Utilities (cn, etc.)
│   │       └── styles/          # Global CSS, Tailwind config
│   ├── eslint-config/           # Shared ESLint rules
│   └── typescript-config/       # Shared tsconfig presets
├── SPEC.md
├── turbo.json                   # Turborepo pipeline config
└── package.json                 # Root workspace config
```

**Key conventions:**
- Shared UI components live in `packages/ui`, imported as `@workspace/ui`
- App-specific components live in `apps/web/components`
- Path alias `@/*` maps to `apps/web/*`

---

## Route Architecture

Market-first IA: browsing is public; pillar tools use `AuthGate` / client Supabase (RLS) so signed-out users can open routes but see “login to proceed” unless noted.

```
/                          → Public landing (market entry, hero, curated rails)
/market                    → Public marketplace browse / search
/market/[id]               → Public skin detail (catalog + live pricing + history UX)
/dashboard                 → Command Center HUD (pillar summary; AuthGate — not a fourth pillar)
/login                     → Login (Google OAuth, public)
/auth/callback             → OAuth callback (session exchange, public)
/float-flip                → Float Flip / Trades pillar (implementation: `float-flip/page.tsx`)
/trade-links               → Alias for Float Flip — re-exports `float-flip/page.tsx`
/loadout                   → Loadout Canvas (Supabase-backed; no local/demo seed)
/loadout/[id]              → Public shareable loadout when `is_public` (no auth)
/sniper                    → Skin Sniper / Watchlist pillar (implementation: `sniper/page.tsx`)
/watchlist                 → Alias for Watchlist — re-exports `sniper/page.tsx`
/profile                   → Profile / currency (AuthGate)
```

**App Router file structure (representative):**
```
apps/web/app/
├── layout.tsx
├── page.tsx                    # / → landing
├── dashboard/page.tsx          # /dashboard
├── market/
│   ├── page.tsx                # /market
│   └── [id]/page.tsx           # /market/[id]
├── login/page.tsx
├── auth/callback/route.ts
├── float-flip/page.tsx         # Trades UI
├── trade-links/page.tsx        # re-export → float-flip
├── loadout/
│   ├── page.tsx
│   └── [id]/page.tsx           # public OG share view
├── sniper/page.tsx             # Watchlist UI
├── watchlist/page.tsx          # re-export → sniper
└── profile/page.tsx
```

**Auth & Route Protection:**
- **Middleware** (`apps/web/middleware.ts`): Refreshes session; `AUTH_DISABLED = false`. **Public paths** include `/`, `/market`, `/market/*`, `/login`, `/auth/callback`, `/design-system`, `/shadcn-preview`, `/api/*`, and `/loadout/*` (public share links). Other routes are not hard-redirected to `/login` — pages **wrap pillar content in `AuthGate`** (or equivalent) so UX is auth-aware without breaking deep links.
- **RLS:** All writes go through Supabase with `auth.uid()` policies on `profiles`, `trades`, `loadouts`, `targets`, `target_watchlists`, `target_watchlist_items`, `price_alerts` (see `supabase/schema.sql`).

---

## Home Dashboard (Command Center)

The **`/dashboard`** route is the signed-in heads-up display that summarizes all three pillars. **`/`** is the public market-first landing — not the dashboard.

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  CAREER PROFIT            CAPITAL AT RISK                   │
│  +$4,230.00  [green]      $890.00 open  [muted]             │
├──────────────┬──────────────────────┬───────────────────────┤
│  Float Flip  │  Loadout Canvas      │  Skin Sniper          │
│              │                      │                       │
│  Last trade  │  Active loadout      │  X active targets     │
│  Win rate    │  mini-grid preview   │  Next target card     │
│              │                      │                       │
│  [Go →]      │  [Go →]              │  [Go →]               │
└──────────────┴──────────────────────┴───────────────────────┘
```

**Empty state (new user):** Each pillar card shows a zero-state with an onboarding CTA:
- Float Flip: "Log your first flip →"
- Loadout Canvas: "Build your loadout →"
- Skin Sniper: "Add your first target →"

This replaces the need for a separate onboarding modal or wizard.

---

## The Three Pillars

### 1. Float Flip (Profit & Loss Tracker)

**The Problem:** Traders track margins in spreadsheets. Boring. No instant gratification.

**The Vibe:** Wall Street meets Counter-Strike. Neo-brutalist. Terminal green for profit, stark red for loss. JetBrains Mono for UI, headlines, and data (default `font-sans` / `font-mono`; `font-hero-serif` uses the same stack).

**Core Features:**

- Input form: Skin name, wear, variant (StatTrak/Souvenir/None), float value, image URL, buy price, sell price, currency, buy date, sell date, notes
- Auto-calculate profit margin and ROI percentage
- "Career Profit" counter - massive, glowing, front and center
- Trade history with filtering (by skin, date range, profit/loss)
- Infinite scroll / load-more pagination for trade history
- Export to CSV (fields: Date, Skin Name, Wear, Variant, Float, Buy Price, Sell Price, Profit, ROI%, Currency, Notes; filename: `grail-trades-{date}.csv`)

**Data Model:**

```
Trade
├── id
├── user_id (FK)
├── skin_name (string)
├── wear (enum: FN, MW, FT, WW, BS)
├── variant (enum: none, stattrak, souvenir)
├── float_value (decimal | null, 4dp, e.g. 0.1234)
├── image_url (string | null)
├── buy_price (decimal)
├── sell_price (decimal | null)
├── status (enum: open, sold)
├── profit (computed client-side: sell_price - buy_price)
├── roi (computed client-side: (profit / buy_price) * 100)
├── currency (string, e.g., "USD")
├── buy_date
├── sell_date
├── notes
├── created_at
└── updated_at
```

**Key Metrics Displayed:**

- **Career Profit (Realized):** `SUM(sell_price - buy_price)` for all `status = 'sold'` trades. This is the primary hero number — big, glowing, green/red.
- **Capital at Risk:** `SUM(buy_price)` for all `status = 'open'` trades. Displayed smaller below the hero number (e.g., "Capital at risk: $890").
- Win rate: `profit > 0` trades / total closed trades. A `profit == 0` trade is break-even (not a win). `profit < 0` is a loss.
- Average ROI across closed trades
- Best flip (highest profit in a single trade)
- Worst flip (biggest loss in a single trade)
- Current open positions count + total buy cost

---

### 2. Loadout Canvas (Inventory Showcase)

**The Problem:** Steam inventory is messy. No way to visualize your dream setup or current collection beautifully.

**The Vibe:** High-end gallery. Minimalist glassmorphism. Subtle glowing shadows based on rarity.

**Core Features:**

- Visual grid mapping T-side and CT-side weapons
- Paste image URL for skin placement
- 3D tilt on hover (holographic card effect)
- Float value / price paid overlay on hover
- Shareable loadout links (public URL: `/loadout/{loadout_id}`, accessible without auth when `is_public = true`)
- Multiple named loadouts (user-created; no auto-seeded defaults)
- **`/loadout` is Supabase-backed only:** no localStorage/demo loadouts and no automatic insert of a default loadout; signed-in users with zero rows see an empty state and create their first loadout explicitly.

**Weapon Slots:**

```
CT Side                          T Side
── Gear ──                       ── Gear ──
├── Knife                        ├── Knife
├── Gloves                       ├── Gloves
── Pistols ──                    ── Pistols ──
├── USP-S / P2000                ├── Glock
├── Deagle / R8 Revolver         ├── Deagle / R8 Revolver
├── P250                         ├── P250
├── Five-SeveN / CZ75-Auto      ├── Tec-9 / CZ75-Auto
├── Dual Berettas                ├── Dual Berettas
── Rifles ──                     ── Rifles ──
├── M4A4 / M4A1-S               ├── AK-47
├── FAMAS                        ├── Galil
├── AUG                          ├── SG 553
├── SSG 08                       ├── SSG 08
├── AWP                          ├── AWP
├── SCAR-20                      ├── G3SG1
── SMGs ──                       ── SMGs ──
├── MP9                          ├── MAC-10
├── MP7 / MP5-SD                 ├── MP7 / MP5-SD
├── UMP-45                       ├── UMP-45
├── PP-Bizon                     ├── PP-Bizon
├── P90                          ├── P90
── Heavy ──                      ── Heavy ──
├── Nova                         ├── Nova
├── XM1014                       ├── XM1014
├── MAG-7                        ├── Sawed-Off
├── M249                         ├── M249
└── Negev                        └── Negev
```

**Rarity Glow Colors:**

- Consumer (Gray) - subtle
- Industrial (Light Blue) - subtle
- Mil-Spec (Blue) - mild glow
- Restricted (Purple) - glow
- Classified (Pink) - strong glow
- Covert (Red) - intense glow
- Gold/Contraband (Gold) - legendary glow

**Data Model:**

```
Loadout
├── id
├── user_id (FK)
├── name (e.g., "Dream Loadout")
├── is_public (boolean)
├── slots (JSONB)
│   └── [slot_key]: { skin_name, image_url, float_value, price_paid, rarity, variant }
├── created_at
└── updated_at
```

**Slot Key Naming Convention:**

Each slot in the JSONB uses a canonical snake_case key. CT and T side always include the side prefix. Weapons shared between sides (e.g., AWP, Deagle) get separate per-side entries so CT and T loadouts can differ.

```
Gear:     ct_knife, t_knife, ct_gloves, t_gloves

Pistols:  ct_usp_s,        t_glock
          ct_deagle,       t_deagle
          ct_p250,         t_p250
          ct_five_seven,   t_tec9
          ct_dual_berettas, t_dual_berettas

Rifles:   ct_m4a4,         t_ak47        (ct_m4a4 covers M4A4/M4A1-S slot)
          ct_famas,        t_galil
          ct_aug,          t_sg553
          ct_ssg08,        t_ssg08
          ct_awp,          t_awp
          ct_scar20,       t_g3sg1

SMGs:     ct_mp9,          t_mac10
          ct_mp7,          t_mp7         (covers MP7/MP5-SD)
          ct_ump45,        t_ump45
          ct_pp_bizon,     t_pp_bizon
          ct_p90,          t_p90

Heavy:    ct_nova,         t_nova
          ct_xm1014,       t_xm1014
          ct_mag7,         t_sawed_off
          ct_m249,         t_m249
          ct_negev,        t_negev
```

The slot value object:
```json
{
  "skin_name": "AK-47 | Redline",
  "image_url": "https://...",
  "float_value": 0.1523,
  "price_paid": 45.00,
  "rarity": "classified",
  "variant": "stattrak"
}
```

---

### 3. Skin Sniper (Target Watchlist)

**The Problem:** Hunting for a specific float/pattern at a specific price. No organized way to track targets across multiple marketplaces.

**The Vibe:** Tactical HUD. Dark mode. High contrast. Mission control.

**Core Features:**

- Add target: skin name, wear, variant (StatTrak/Souvenir/None), image URL, target buy price, currency, min/max float range
- Sleek card for each target
- "Acquired" button with satisfying "CONFIRMED" stamp
- Price alerts (future - integrate with Skinport/CSFloat APIs)
- Quick links to Skinport, CSFloat, Buff163, Steam Market
- Notes field for float range, pattern preferences

**Data Model:**

```
Target
├── id
├── user_id (FK)
├── skin_name
├── wear (enum: FN, MW, FT, WW, BS | null)
├── variant (enum: none, stattrak, souvenir)
├── image_url
├── target_price (decimal)
├── currency (string)
├── min_float (decimal | null, 0.00-1.00)
├── max_float (decimal | null, 0.00-1.00, must be > min_float)
├── status (enum: hunting, acquired, abandoned)
├── acquired_price (decimal | null)
├── acquired_date
├── notes
├── marketplace_links (JSONB, structure below)
├── created_at
└── updated_at
```

**Marketplace Links JSONB Structure:**

```json
{
  "steam": "https://steamcommunity.com/market/listings/730/...",
  "skinport": "https://skinport.com/item/...",
  "csfloat": "https://csfloat.com/search?...",
  "csmoney": "https://cs.money/market/buy/?search=...",
  "buff163": "https://buff.163.com/goods/..."
}
```

Auto-generated from skin name where possible; user can override with custom URLs.

---

### Cross-Pillar Integration

The three pillars are primarily independent but connect at key user moments:

**Skin Sniper → Float Flip:** When marking a target as "Acquired", show a prompt: _"Log this as a trade in Float Flip?"_ Pre-fills the trade form with the skin name, wear, variant, float value (from max_float), acquired price, currency, and date. Optional -- user can dismiss.

**Loadout Canvas → Skin Sniper:** Empty loadout slots display an "Add to Sniper" action that creates a new Skin Sniper target for that weapon slot, pre-filled with the weapon type.

---

## Database Schema (Supabase)

```sql
-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT,
  avatar_url TEXT,
  currency_preference TEXT DEFAULT 'USD' CHECK (currency_preference IN ('USD', 'EUR', 'GBP', 'CNY')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trades (Float Flip)
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  skin_name TEXT NOT NULL,
  wear TEXT NOT NULL CHECK (wear IN ('FN', 'MW', 'FT', 'WW', 'BS')),
  variant TEXT NOT NULL DEFAULT 'none' CHECK (variant IN ('none', 'stattrak', 'souvenir')),
  float_value DECIMAL(5,4) CHECK (float_value >= 0 AND float_value <= 1),
  image_url TEXT,
  buy_price DECIMAL(10,2) NOT NULL,
  sell_price DECIMAL(10,2),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'sold')),
  currency TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'GBP', 'CNY')),
  buy_date DATE NOT NULL,
  sell_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loadouts (Loadout Canvas)
CREATE TABLE loadouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_public BOOLEAN DEFAULT false,
  slots JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Targets (Skin Sniper)
CREATE TABLE targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  skin_name TEXT NOT NULL,
  wear TEXT CHECK (wear IN ('FN', 'MW', 'FT', 'WW', 'BS')),
  variant TEXT NOT NULL DEFAULT 'none' CHECK (variant IN ('none', 'stattrak', 'souvenir')),
  image_url TEXT,
  target_price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'GBP', 'CNY')),
  min_float DECIMAL(5,4) CHECK (min_float >= 0 AND min_float <= 1),
  max_float DECIMAL(5,4) CHECK (max_float >= 0 AND max_float <= 1),
  status TEXT DEFAULT 'hunting' CHECK (status IN ('hunting', 'acquired', 'abandoned')),
  acquired_price DECIMAL(10,2),
  acquired_date DATE,
  notes TEXT,
  marketplace_links JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT float_range_valid CHECK (min_float IS NULL OR max_float IS NULL OR min_float < max_float)
);

-- Static CS2 Items Database
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  weapon_type TEXT,
  collection TEXT,
  rarity TEXT CHECK (rarity IN ('consumer', 'industrial', 'milspec', 'restricted', 'classified', 'covert', 'gold')),
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX trades_user_id_idx ON trades(user_id);
CREATE INDEX trades_buy_date_idx ON trades(user_id, buy_date DESC);
CREATE INDEX loadouts_user_id_idx ON loadouts(user_id);
CREATE INDEX targets_user_id_idx ON targets(user_id);
CREATE INDEX targets_status_idx ON targets(user_id, status);
CREATE INDEX items_name_idx ON items(name);
CREATE INDEX items_weapon_type_idx ON items(weapon_type);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trades_updated_at BEFORE UPDATE ON trades FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER loadouts_updated_at BEFORE UPDATE ON loadouts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER targets_updated_at BEFORE UPDATE ON targets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER items_updated_at BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE loadouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage own trades" ON trades FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own loadouts" ON loadouts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own targets" ON targets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public loadouts are viewable" ON loadouts FOR SELECT USING (is_public = true);

CREATE POLICY "Items are publicly readable" ON items FOR SELECT USING (true);
```

---

## Design System

### Colors

**Semantic:**
```
Profit Green:    #00ff88
Loss Red:        #ff3366
Warning:         #ffaa00 (float mismatch warnings, abandoned targets)
Info:            #4b69ff (links, informational — reuses Mil-Spec blue)
```

**Surfaces:**
```
Background:      #0a0a0a (near black)
Surface:         #1a1a1a (cards)
Surface Hover:   #222222
Border:          #2a2a2a
Text Primary:    #ffffff
Text Secondary:  #888888
Text Muted:      #555555
```

**Interactive:**
```
Accent:          #00ff88 (primary CTA, active tab indicator — reuses Profit Green)
Accent Hover:    #00cc6e
Accent Muted:    rgba(0, 255, 136, 0.15) (accent backgrounds, badges)
Destructive:     #ff3366 (delete, error — reuses Loss Red)
Destructive Hover: #cc2952
Focus Ring:      rgba(0, 255, 136, 0.5) (#00ff88 at 50% opacity)
Input Border:    #2a2a2a (default) → #00ff88 (focus)
```

### Buttons

- **Primary:** Accent (#00ff88) background, black text. Hover: Accent Hover.
- **Secondary:** Surface (#1a1a1a) background, white text, Border (#2a2a2a) outline. Hover: Surface Hover.
- **Destructive:** Destructive (#ff3366) background, white text. Hover: Destructive Hover.
- **Ghost:** Transparent background, Text Secondary. Hover: Surface Hover background.

### Status Badges

| Context | Status | Color |
|---------|--------|-------|
| Float Flip | Open | Info (#4b69ff) |
| Float Flip | Sold | Accent (#00ff88) |
| Skin Sniper | Hunting | Warning (#ffaa00) |
| Skin Sniper | Acquired | Accent (#00ff88) |
| Skin Sniper | Abandoned | Text Muted (#555555) |

### Tab Indicator

Active tab: bottom border in Accent (#00ff88). Inactive: no border, Text Secondary.

### Rarity Colors

```
Consumer:      #b0c3d9
Industrial:    #5e98d9
Mil-Spec:      #4b69ff
Restricted:    #8847ff
Classified:    #d32ce6
Covert:        #eb4b4b
Gold:          #ffd700
```

### Typography

- **Headlines, body, HUD, numbers:** JetBrains Mono (`font-sans`, `font-mono`, `font-hero-serif` share `--font-jetbrains-mono`)

### Navigation

- **Style:** Top tabs (horizontal)
- **Position:** Fixed at top of app content area
- **Tabs:** Home (icon only) | Float Flip | Loadout Canvas | Skin Sniper
- **Active indicator:** Bottom border in Accent (#00ff88)
- **Mobile:** Same top tabs, horizontally scrollable on small screens

### Component Library

- **shadcn/ui** for base components (buttons, inputs, dialogs, etc.)
- **Radix UI** primitives for accessibility
- Custom components for Grail-specific UI (trade cards, loadout grid, target cards)
- **Typography:** JetBrains Mono sitewide (Next.js `layout.tsx` loads `--font-jetbrains-mono`; `font-sans` and `font-mono` both resolve to it). See `.agents/skills/frontend-design/SKILL.md` for aesthetic guidelines on net-new UI.

### AI Agents & Skills

The following agents and skills are configured in `.agents/` to assist development:

**Skills:**
| Skill | Purpose | Trigger |
|-------|---------|---------|
| `shadcn` | Manage shadcn components - add, search, fix, debug, style UI | Working with shadcn/ui, component registries, components.json |
| `frontend-design` | Distinctive UI direction, typography, motion, composition; avoid generic “AI default” aesthetics | New pages, marketing surfaces, visual polish, component styling passes |

**Agents:**
| Agent | Purpose | When to Use |
|-------|---------|-------------|
| `architect` | System design, scalability, technical decisions | Planning new features, refactoring large systems |
| `build-error-resolver` | TypeScript/build error fixes | Build fails, type errors occur |
| `code-reviewer` | Code quality, security, maintainability reviews | After writing/modifying code |
| `database-reviewer` | PostgreSQL/Supabase optimization, RLS, schema design | Writing SQL, creating migrations, troubleshooting DB |
| `planner` | Feature planning, step breakdown | Complex feature implementation, architectural changes |
| `refactor-cleaner` | Dead code cleanup, dependency removal | Removing unused code, consolidating duplicates |
| `security-reviewer` | Vulnerability detection, OWASP Top 10 | Auth code, API endpoints, user input handling |
| `tdd-guide` | Test-driven development enforcement | Writing new features, fixing bugs |
| `doc-updater` | Documentation and codemap updates | Updating READMEs, API docs |

**Usage:**

- Agents are automatically available in `.agents/agents/`
- Skills are automatically available in `.agents/skills/`
- Reference agent instructions when working on relevant tasks

---

## 5-Day Sprint Plan

### Day 1 (Tuesday): Foundation

- [x] Initialize Next.js 16 project with TypeScript (done — monorepo exists)
- [x] Setup Tailwind CSS + shadcn/ui + Radix (done — packages/ui configured)
- [ ] Create Supabase project (guide user through setup)
- [ ] Apply database schema (all tables, triggers, RLS, indexes)
- [ ] Configure Google OAuth in Supabase
- [ ] Setup `@supabase/ssr` client + auth callback route
- [ ] Build base layout with horizontal top tabs navigation (Home icon + 3 pillar tabs)
- [ ] Setup dark theme with full design system tokens
- [ ] Create profile auto-creation trigger + user profile page
- [ ] Build Home Dashboard (command center layout, empty states)

### Day 2 (Wednesday): Float Flip

- [ ] Trade CRUD API routes (server actions)
- [ ] Trade input form component with validation
- [ ] Wear selector dropdown
- [ ] Profit/ROI calculation logic
- [ ] Trade history table with filtering
- [ ] Career profit counter (glowing animation)
- [ ] Win rate, best/worst flip metrics
- [ ] CSV export functionality

### Day 3 (Thursday): Loadout Canvas

- [ ] CT/T weapon grid layout
- [ ] Weapon slot components
- [ ] Image URL input + preview
- [ ] 3D tilt hover effect (CSS transforms)
- [ ] Rarity-based glow styling
- [ ] Save/load loadout functionality
- [ ] Multiple loadout management
- [ ] Shareable public links

### Day 4 (Friday): Skin Sniper

- [ ] Target CRUD API routes
- [ ] Target card component
- [ ] Acquired stamp animation
- [ ] Status toggle (hunting/acquired/abandoned)
- [ ] Quick links to marketplaces (Skinport, CSFloat, Buff163, Steam)
- [ ] Target filtering by status
- [ ] Notes field for float/pattern preferences
- [ ] Cross-pillar: "Acquired" → prompt to log in Float Flip
- [ ] Cross-pillar: Empty loadout slot → "Add to Sniper" action

### Day 5 (Saturday): Polish + Deploy

- [ ] Multi-currency support (user preference + conversion display)
- [ ] Import CS2 items database (~3500 items)
- [ ] Skin name autocomplete using items table
- [ ] Responsive design fixes
- [ ] Loading states and skeletons
- [ ] Error handling and toast notifications
- [ ] Vercel deployment
- [ ] Final testing and bug fixes

---

## Multi-Currency Support

**Supported Currencies:**

- USD (default)
- EUR
- GBP
- CNY (important for Buff163 traders)

**Implementation:**

1. User selects preferred display currency in profile settings
2. All prices stored in their **original entry currency** (no conversion on write)
3. Display shows converted value alongside original using a free exchange rate API
4. User can override currency per trade/target entry

**Exchange Rate API:**

- Provider: [open.er-api.com](https://open.er-api.com) (free, no API key required) or [exchangerate-api.com](https://exchangerate-api.com)
- Rates cached server-side, refreshed once daily
- Conversion is **display-only** -- stored values are never mutated

---

## CS2 Items Database

**Source:** Scraped from [csgostash.com](https://csgostash.com) (weapon skins, knives, gloves)

**Scraping Plan:**

1. Scrape all weapon skin pages from csgostash.com (~3500 items)
2. Extract: name, weapon type, collection, rarity, and image URL
3. Image URLs use Steam CDN format: `https://steamcommunity-a.akamaihd.net/economy/image/...`
4. Output as JSON, then seed into the `items` table via a seeding script
5. The `items.name` column has a UNIQUE constraint to prevent duplicates during re-seeding

**Fields per item:**

- Name (e.g., "AK-47 | Redline")
- Weapon type (e.g., "AK-47")
- Collection (e.g., "Phoenix Collection")
- Rarity (consumer → gold)
- Image URL (Steam CDN)

**Usage:**

- Autocomplete for skin name input (fuzzy search on `items.name`)
- Rarity lookup for glow effects in Loadout Canvas
- Filter by weapon type, collection, rarity

---

## CS2 Float Wear Ranges

Float values in CS2 are divided into five wear tiers. Used for validation and display:

```
Factory New (FN):    0.000 – 0.070
Minimal Wear (MW):   0.070 – 0.150
Field-Tested (FT):   0.150 – 0.380
Well-Worn (WW):      0.380 – 0.450
Battle-Scarred (BS): 0.450 – 1.000
```

- Not every skin can be obtained in every wear tier (depends on the skin's defined float range).
- Float values are stored and displayed to 4 decimal places (e.g., `0.1234`).
- If a user enters a float value inconsistent with the selected wear tier, show a validation warning (don't block submit — some skins have unusual float ranges).

---

## Form Validation Rules

### Float Flip — Trade Form

| Field | Rule |
|-------|------|
| `skin_name` | Required. Non-empty. Max 100 chars. |
| `wear` | Required. One of: FN, MW, FT, WW, BS. |
| `variant` | Required. One of: none, stattrak, souvenir. Default: none. |
| `float_value` | Optional. 0.0001–0.9999. 4 decimal places. Warn (not block) if inconsistent with wear tier. |
| `image_url` | Optional. Must be valid `http://` or `https://` URL if provided. |
| `buy_price` | Required. > 0. Max 2 decimal places. |
| `sell_price` | Optional when status is open. Required when marking as sold. Must be > 0 if provided. |
| `currency` | Required. One of: USD, EUR, GBP, CNY. |
| `buy_date` | Required. Cannot be in the future. |
| `sell_date` | Optional when status is open. Required when marking as sold. Must be ≥ `buy_date`. |
| `notes` | Optional. Max 500 chars. |

### Skin Sniper — Target Form

| Field | Rule |
|-------|------|
| `skin_name` | Required. Non-empty. Max 100 chars. |
| `wear` | Optional. One of: FN, MW, FT, WW, BS. |
| `variant` | Required. One of: none, stattrak, souvenir. Default: none. |
| `target_price` | Required. > 0. Max 2 decimal places. |
| `currency` | Required. One of: USD, EUR, GBP, CNY. |
| `min_float` | Optional. 0.0000–1.0000. Must be < `max_float` if both provided. |
| `max_float` | Optional. 0.0000–1.0000. Must be > `min_float` if both provided. |
| `image_url` | Optional. Must be valid `http://` or `https://` URL if provided. |
| `notes` | Optional. Max 500 chars. |

---

## Trade Editing Rules

- All fields on a trade are editable after creation **except** converting `status: sold → open` (to preserve historical accuracy).
- Marking a trade as sold: requires `sell_price` and `sell_date` to be set. These are validated together.
- Deleting a trade: allowed at any time. Deleted trades are **permanently removed** (no soft-delete for MVP). Career profit recalculates immediately on deletion.
- **Open trades** contribute to Capital at Risk. **Sold trades** contribute to Realized Career Profit.

---

## Image URL Handling

Applies to image URL fields in Trades, Targets, and Loadout slots:

- **Validation on input:** Must be a valid `http://` or `https://` URL. Show inline error on blur if invalid format.
- **Broken image fallback:** If the image fails to load, display a weapon silhouette placeholder SVG (based on weapon type if known, else a generic skin icon).
- **Steam CDN:** Encourage Steam CDN URLs (`https://steamcommunity-a.akamaihd.net/economy/image/...`) in helper text. These are stable and served globally.
- **Image preview:** Show a small live preview when a valid URL is pasted, before saving.
- **Not blocking:** A broken or missing image never prevents form submission. All image fields are cosmetic.

---

## Public Loadout — OG / Social Meta

Public loadout pages (`/loadout/[id]`) should include Open Graph meta tags for rich previews when shared on Discord, Twitter, etc.:

```html
<meta property="og:title" content="{User}'s {Loadout Name} | Grail" />
<meta property="og:description" content="View this CS2 loadout on Grail" />
<meta property="og:url" content="https://grail.vercel.app/loadout/{id}" />
<meta property="og:type" content="website" />
```

Implemented via Next.js `generateMetadata()` in `app/loadout/[id]/page.tsx`.

---

## Analytics & Monitoring

- **Vercel Analytics:** Enabled by default via `@vercel/analytics`. Zero-config page view tracking. Add `<Analytics />` to root layout.
- **Vercel Speed Insights:** Add `<SpeedInsights />` to root layout for Core Web Vitals monitoring.
- **Error tracking:** Sentry is post-MVP. For MVP, rely on Vercel deployment logs and Supabase dashboard.

---

## Accessibility Baseline

- All interactive elements are keyboard accessible (Tab, Enter, Escape for modals/dropdowns).
- **Color is never the sole indicator:** Profit/loss uses `+`/`-` prefix and icons in addition to green/red color.
- Focus-visible styles are preserved (do not remove `outline`). Use `ring` utilities from Tailwind for focus rings.
- All images have descriptive `alt` text (or `alt=""` for purely decorative images).
- Radix UI primitives provide ARIA roles, `aria-expanded`, `aria-label`, etc. automatically — do not override without reason.

---

## Data Fetching Strategy

- **Mutations (create/update/delete):** Next.js Server Actions
- **Initial data loading:** React Server Components (fetch in `page.tsx` or `layout.tsx`)
- **Client-side interactivity:** Supabase client (`@supabase/ssr`) for optimistic updates where needed

---

## Environment Variables

| Variable | Purpose | Scope |
|----------|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Client + Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Client + Server |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin access (seeding scripts only) | Server only |

Google OAuth credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) are configured directly in the Supabase dashboard, not in application code.

---

## Loading & Error States

- **Loading:** Use shadcn `Skeleton` components matching card/table shapes, consistent with dark theme
- **Errors:** Toast notifications via shadcn `Sonner` for user-facing errors (failed saves, network issues)
- **Empty states:** Friendly illustrations or prompts (e.g., "No trades yet -- log your first flip!")
- **Optimistic updates:** Trade creation and target status changes update UI immediately, revert on failure

---

## Testing Strategy

- **Framework:** Vitest + React Testing Library (post-MVP; 5-day sprint prioritizes features over tests)
- **Critical paths to test first:** Profit/ROI calculation logic, currency conversion math, RLS policy correctness
- **Agent support:** `tdd-guide` agent available in `.agents/agents/` for test-driven workflow

---

## Resolved Questions

| Question          | Decision                                                                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Image hosting     | URL paste only (no Supabase storage for MVP)                                                                                                                |
| Currency          | Multi-currency with free exchange rate API (USD, EUR, GBP, CNY)                                                                                             |
| Steam integration | Static item database scraped from csgostash.com, no live API                                                                                                |
| BitSkins pricing API | Live pricing provider migrated from API v1 to API v2                                                                                                                         |
| Marketplace links | Auto-generated from skin name + user custom overrides                                                                                                       |
| Headline font     | JetBrains Mono (default UI + `font-hero-serif`; replaced Stratum2; DM Sans/Serif removed from layout)                                                         |
| Navigation style  | Horizontal top tabs + Home Dashboard at `/`                                                                                                                 |
| Weapon slots      | Full CS2 weapon roster (all pistols, rifles, SMGs, heavy, gear)                                                                                             |
| Cross-pillar      | Sniper → Flip (acquired prompt) and Canvas → Sniper (empty slot action)                                                                                    |
| Pagination        | Infinite scroll for trades; load all for targets/loadouts                                                                                                   |
| Profile creation  | Auto-created via database trigger on auth.users insert                                                                                                      |
| StatTrak/Souvenir | `variant` field on trades and targets (none / stattrak / souvenir)                                                                                          |
| Career Profit     | Realized (sold only) as hero number; Capital at Risk (open buy cost) displayed below                                                                        |
| Onboarding        | Home Dashboard empty state serves as onboarding (no separate modal)                                                                                         |
| Float on trades   | `float_value` (4dp) and `image_url` added to trade model                                                                                                    |
| Float range       | `min_float` + `max_float` on targets; wear tier constants documented                                                                                        |
| Analytics         | Vercel Analytics + Speed Insights (built-in, zero-config)                                                                                                   |
| AI Agents         | 9 agents imported (architect, build-error-resolver, code-reviewer, database-reviewer, planner, refactor-cleaner, security-reviewer, tdd-guide, doc-updater) |
| AI Skills         | shadcn (pre-installed)                                                                                                                                      |
| Broker-grade UX   | Use Zerodha/IB-style feature set as reference for dashboard, P&L, watchlists, and reports; execution remains external.                                     |

---

## Future Features (Post-MVP)

**Future: stocks asset class.** The broker feature set also informs a possible future stocks module (watchlists, holdings, P&L) if Grail expands beyond skins. No commitment; kept as context.

- [ ] Price alerts via push notification
- [ ] CSFloat/Skinport API integration for live prices
- [ ] Float value lookup integration
- [ ] Pattern template tracking (blue gem, fade %, etc.)
- [ ] Trade analytics charts
- [ ] Public profile/shareable stats
- [ ] Mobile app (React Native)
- [ ] Custom domain
- [ ] Image upload to Supabase storage

---

## Inspiration

- TradingView (for the P&L vibes)
- CSFloat (for the clean UI)
- Steam inventory (for what NOT to look like)

---

## Changelog

| Date       | Change                                                     |
| ---------- | ---------------------------------------------------------- |
| 2026-03-17 | Initial PRD created as "CS2 Arsenal"                       |
| 2026-03-17 | Renamed to "Grail", locked all decisions                   |
| 2026-03-17 | Added 5-day sprint plan, updated tech stack                |
| 2026-03-17 | Typography: JetBrains Mono for headlines, removed Stratum2 |
| 2026-03-21 | Typography: JetBrains Mono sitewide via `--font-jetbrains-mono` (`font-sans` / `font-mono` / `font-hero-serif`; DM Sans / DM Serif removed from layout) |
| 2026-03-17 | Added Navigation section (horizontal top tabs)             |
| 2026-03-17 | Added AI Agents & Skills section, imported 9 agents        |
| 2026-03-17 | Spec vetting: Fixed Next.js 14→16, added INSERT RLS policy, updated_at triggers, profile auto-creation trigger |
| 2026-03-17 | Spec vetting: Expanded weapon slots to full CS2 roster, defined marketplace_links JSONB structure |
| 2026-03-17 | Spec vetting: Added sections: Project Structure, Cross-Pillar Integration, Data Fetching, Auth/Route Protection, Env Vars, Loading States, Testing |
| 2026-03-17 | Spec vetting: Specified items DB scraping plan, currency API, pagination strategy, shareable link URLs, CSV export format |
| 2026-03-17 | Spec vetting v2: Added Route Architecture, Home Dashboard, StatTrak/Souvenir variant field, float_value + image_url on trades |
| 2026-03-17 | Spec vetting v2: Added min_float on targets, Loadout JSONB slot key convention, Career Profit formula |
| 2026-03-17 | Spec vetting v2: Added CS2 Float Wear Ranges, Form Validation Rules, Trade Editing Rules, Image URL Handling |
| 2026-03-17 | Spec vetting v2: Added OG/Social Meta, Analytics & Monitoring, Accessibility Baseline sections |
| 2026-03-17 | Spec vetting v3: Fixed items RLS security gap, expanded Design System (accent/buttons/badges/tabs) |
| 2026-03-17 | Spec vetting v3: Propagated variant/float fields into feature lists, cross-pillar, CSV export |
| 2026-03-17 | Spec vetting v3: SQL fixes (NOT NULL, DECIMAL(5,4), currency CHECK, targets_status_idx) |
| 2026-03-17 | Spec vetting v3: Added auth callback route, Home icon tab, consolidated Auth section, win rate formula |
| 2026-03-17 | Spec fixes: Added sell_after_buy CHECK constraint on trades, changed float_range_valid to allow equality (<=), required acquired_price/acquired_date when status=acquired |
| 2026-03-18 | Added Design Context & Principles section (brand personality, emotional goals, visual/anti-references, motion, a11y target, 5 design principles); added teach-impeccable skill to Resolved Questions |
| 2026-03-18 | Market v2: clarified market-first routes (`/`, `/market`, `/market/[id]`), moved dashboard to `/dashboard`, and specified Marketplace v2 filters/cards/detail requirements |
| 2026-03-18 | Launch scope: added Live Pricing (multi-market pricing + history + trends), plus pricing time-series tables (`market_price_snapshots`, `market_price_candles`) |
| 2026-03-19 | Market board refinement: `/market` now mirrors key BitSkins strengths with denser full-width listing grid, market notice strip, and right-panel listing toolbar (sort + compact/comfortable density), while keeping capability-aware filters for unsupported listing metadata |
| 2026-03-20 | Landing (`/`): hero aligned to Figma Tickets frame — DM Serif Text headline (“The fastest way from **target** to **trade**.” with accent `#c438f3`), primary CTAs **Browse Market** + **Create Watchlist** (auth-gated); Trending/Tools cards use Figma-style `#141414` surfaces + 1px hairline ring in dark mode |
| 2026-03-21 | Landing hero dark `lg+`: Figma branch Tickets node `8646:30422` — `max-w-[1600px]` + `bg-[#080808]`; layer order: right art (`hero-section-right.png`) `right-0` / `max-w-[937.5px]` (~58.6% w), then left mask `M0 0H936L662 599.5L0 600V0Z`, then diagonal `#471865` (centered with `left-[calc(50%+0.06px)] top-[calc(50%-0.05px)]` + `-translate-x-1/2 -translate-y-1/2`); copy `(40, 138)`; headline `tracking-[0.02597em]`; mobile/light stacked uses same PNG + `HeroPrimary`; rasters `unoptimized` |
| 2026-03-21 | App shell: edge-to-edge layout sitewide — page `main` is not globally capped; `MainContentWidth` uses `max-w-[1600px] mx-auto` except on `/market` (listings); `TopTabs` inner row always uses `max-w-[1600px] mx-auto` (including listings); `html`/`body`/`#main` use `min-w-0 w-full`; horizontal padding `px-10` (40px); login form card keeps `max-w-md` for readability |
| 2026-03-21 | Landing (`/`) only: content wrapped in `max-w-[1600px] mx-auto` (Figma hero width; not full viewport width); hero dark row fills that band (no nested 1600 cap) |
| 2026-03-21 | `TopTabs` inner row uses `max-w-[1600px] mx-auto` on **all** routes (including `/market` listings); full-width bar background everywhere |
| 2026-03-21 | **Layout:** `#main` wraps route output in `MainContentWidth` — `max-w-[1600px] mx-auto` on all routes **except** `/market` (listings grid only); `/market/[id]` and other routes use the cap; nav stays 1600 on listings while main is full width |
| 2026-03-21 | Layout refinement: 1600px cap restored for `/market/[id]` (skin detail); only `/market` listings main content is full width; `TopTabs` stays capped at 1600 on listings |
| 2026-03-21 | **`MainContentWidth`** is a **client** component using `usePathname()` so the `/market` vs capped-route max-width updates on SPA navigation; `headers().get("x-pathname")` in the root layout can stay stale because the layout shell may not re-run on every client navigation |
| 2026-03-21 | **Skin detail (`/market/[id]`):** visiting the page loads catalog first, then client-side fetches `/api/pricing/snapshot` + `/api/pricing/history` for that item’s `market_hash_name` (multi-market fan-out is not run on `/market` listing). |
| 2026-03-21 | **Live pricing — CS.MONEY:** `/api/pricing/snapshot` includes **CS.MONEY** (`csmoney`) using the public `GET https://cs.money/2.0/market/sell-orders` feed (Market buy listings), with HTML fallback to `https://cs.money/market/buy/?search=...` when JSON is unavailable (e.g. bot protection). |
| 2026-03-21 | **CS.MONEY snapshot parsing:** floats, 5+ digit cent integers, and structured fields when the JSON feed is available. |
| 2026-03-21 | **Skin detail (`/market/[id]`) — Live pricing UI:** Fixed set of **seven** markets in order: Steam, Skinport, CSFloat, BitSkins, DMarket, Waxpeer, CS.MONEY — each chip shows logo + lowercase name; **Visit** links to the marketplace search/listing when live price is unavailable; separate **Buy on** section removed (discovery is via Live pricing). |
| 2026-03-21 | **Skin detail — Market price history:** Demo multi-line chart with deterministic dummy USD series per market (730d), time filters **1W / 1M / 6M / 1Y / All**, and per-market checkboxes to show/hide lines; real `/api/pricing/history` fetch removed from this page until wired to the chart. |
| 2026-03-21 | **`MainContentWidth`:** client component with `usePathname()` — `max-w-[1600px] mx-auto` on all routes **except** `/market` (listings use `max-w-none` full-width main column); `/market/[id]` and other routes stay capped; aligns with `TopTabs` inner row where capped. |
| 2026-03-22 | **`/market` filters:** Keyword search matches name, weapon, rarity, and id; item-type includes **Other** (stickers/containers/etc.) and a **Weapon** multi-select; sticker/charm terms filter by name substring; price band / sort-by-price / market-items-only use merged `market_price_snapshots` USD rows when the catalog is served from Supabase; rank fields are disabled in catalog mode; Utility (view mode, Steam ID placeholder) is exposed in the filter panel. |
| 2026-03-22 | **Price Empire API constraint:** 100 **total** calls (not per day) before subscription required. Strategy: one-time bulk seed via `/v4/paid/items/prices` with multi-source params; maximize items per call; persist to `market_price_snapshots` and `market_price_candles`; never use for on-demand fetches; post-seed rely on DB cache + other free providers (Steam, Skinport, etc.). |
| 2026-03-22 | **Routes + auth doc sync:** § Route Architecture updated for market-first `/`, `/market*`, `/dashboard` HUD, `/trade-links` ↔ `/float-flip`, `/watchlist` ↔ `/sniper`, middleware session refresh + public path list + `AuthGate` pattern (no blanket redirect); RLS tables listed for pillar data; Command Center explicitly at `/dashboard`. |
