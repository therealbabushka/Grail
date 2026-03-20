## 60 — Decision Log

All key decisions are resolved and locked. Canonical source: `SPEC.md` § Resolved Questions.

### Product Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| App name | Grail | Evocative, short, memorable |
| Scope | All 3 pillars, equal priority, no feature cuts | Core value requires all three tools |
| Onboarding | Home Dashboard empty states as onboarding | No separate modal/wizard; each pillar card has a zero-state CTA |
| Pagination | Infinite scroll for trades; load all for targets/loadouts | Trades can grow large; targets/loadouts are bounded per user |
| Market-first IA | `/` is public landing; `/market*` public; `/dashboard` protected | Match CS2 trading mental model: browse first, then execute |
| Marketplace v2 filters | `/market` uses a progressive-disclosure comprehensive panel: Basic controls visible, Advanced and Expert/listing-level controls collapsed by default, removable active-filter chips, and disabled listing-level toggles until feed capabilities exist | Preserves BitSkins-like depth while reducing vertical clutter and matching available data fidelity |
| Market board density | `/market` favors compact browsing by default (compact card density toggle + higher columns at wide breakpoints) and exposes sort in listing toolbar | Better mimics BitSkins-style scanability for high-volume market browsing |
| Nested filter interaction | `/market` desktop filters follow BitSkins-like placement: left rail row controls opening right flyout panes (including Type → Weapons split pane), with multi-select where possible; mobile uses a draft drawer requiring explicit Apply | Improves parity with familiar marketplace behavior while preventing accidental mobile filter commits |

### Technical Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tech stack | Next.js 16, TypeScript, Supabase, Tailwind, shadcn/ui, Radix UI | Battle-tested, well-supported, minimal infrastructure friction |
| BitSkins pricing provider | Migrated from API v1 to API v2 | Keeps live multi-market snapshots/candles aligned with the preferred BitSkins API version |
| Auth | Supabase Auth with Google OAuth enabled | Protected flows rely on per-user RLS isolation |
| Deployment | Vercel (no custom domain for MVP) | Zero-config Next.js hosting |
| Profile creation | Auto-created via DB trigger on `auth.users` INSERT | No separate signup step needed |
| Data fetching | RSC for reads, Server Actions for writes, optimistic client updates | Leverages Next.js 16 App Router patterns |

### Data & Currency Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Currency | Multi-currency (USD, EUR, GBP, CNY) with display-only conversion | Stored values never mutated; conversion via free exchange rate API cached daily |
| Item data | Static DB scraped from csgostash.com (~3500 items) | No live API for MVP; sufficient for autocomplete and rarity lookup |
| Image hosting | URL paste only (no Supabase storage) | Reduces complexity; Steam CDN URLs are stable |
| Marketplace links | Auto-generated from skin name + user custom overrides | Covers Steam, Skinport, CSFloat, Buff163 |
| Market detail live pricing links | Price rows link to item-level listing/search URLs derived from the same `market_hash_name` used for pricing fetches | Keeps click-through destination consistent with the displayed price source |
| Market detail chart scope (current) | Compare Steam, Skinport, BitSkins in shadcn-style Recharts line chart; 7D/30D/90D controls | Delivers immediate multi-market view now while preserving an easy config path for adding more providers later |

### Design Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Headline font | JetBrains Mono (replaced Stratum2) | Monospace, trading terminal aesthetic |
| Body font | Inter | Clean readability |
| Navigation | Horizontal top tabs (Home icon + 3 pillars) | Fixed at top, scrollable on mobile |
| Theme | Dark-only with design tokens in `globals.css` | Matches CS2 trading culture aesthetic |
| Cross-flow UX gate | Every core flow must pass a "why this step exists" checklist (required-first fields, inline validation, recoverability, no blocking prompts, resilient defaults) | Enforces senior-level UX discipline and prevents friction/regressions as features evolve |
| Core interaction safety | Use structured dialogs (not native prompt/confirm) for delete, rename, and status transitions in major flows | Improves trust, consistency, and recoverability for trading-critical interactions |

### Data Model Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| StatTrak/Souvenir | `variant` enum field on trades and targets (none/stattrak/souvenir) | First-class support for variant types |
| Float on trades | `float_value` DECIMAL(5,4) + `image_url` TEXT on trades table | Trader context; optional but valuable |
| Float range on targets | `min_float` + `max_float` with CHECK constraint | Hunters filter by float range |
| Career Profit | Realized only (sold trades); Capital at Risk = open buy cost | Clear separation of realized vs unrealized |
| Trade editing | All fields editable except sold → open reversion; hard delete | Historical accuracy preserved; no soft-delete for MVP |
| Loadout slots | JSONB with canonical snake_case keys per weapon per side | Flexible, denormalized; supports full CS2 roster |
| Weapon slots | Full CS2 roster (50+ slots across CT/T) | Complete coverage, not just popular weapons |

### Design Context Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Brand personality | Tactical · Premium · Precise | Matches CS2 trading culture + collector mindset |
| Emotional goal | Calm, premium, confidence-inducing | Users make financial decisions; UI must feel trustworthy |
| Visual references | Apple-level polish + tactical/terminal edge | High finish without sterile minimalism |
| Anti-references | No generic pastel SaaS, Material/Google-y, or ultra-minimal monochrome | Maintain personality and domain flavor |
| Motion | Bold + purposeful; respect `prefers-reduced-motion` | Glow, tilt, stamps reinforce state; a11y honored |
| A11y target | WCAG 2.2 AA | Industry standard; feasible for MVP timeline |
| Design principles | Signal over decoration, premium restraint, tactical clarity, semantic color discipline, accessible by default | Codified from brand + product context |

### Tooling Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Analytics | Vercel Analytics + Speed Insights (zero-config) | Built-in, no setup cost |
| Error tracking | Vercel logs + Supabase dashboard (Sentry post-MVP) | Sufficient for 5-day sprint |
| Testing | Vitest + RTL (post-MVP priority) | Sprint prioritizes features over tests |
| AI Agents | 9 agents imported | Cover architecture, build errors, code review, DB, planning, refactoring, security, TDD, docs |
| AI Skills | shadcn (pre-installed), teach-impeccable (setup complete) | Component management + persistent design guidelines |
| Broker UX reference | Use stock-broker feature set (Zerodha, IB, etc.) to prioritise dashboard, watchlists, P&L, and reports; execution stays on external marketplaces | Aligns Grail with broker-grade UX norms without implementing order execution in-app |
