import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Input } from "@workspace/ui/components/input"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-text-secondary">
        {title}
      </h2>
      <div className="border-t border-border pt-4">{children}</div>
    </section>
  )
}

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`h-12 w-12 rounded-md border border-border ${className}`} />
      <span className="text-center text-[12px] text-text-secondary">{name}</span>
    </div>
  )
}

function RarityChip({ name, colorClass, glowColor }: { name: string; colorClass: string; glowColor: string }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2`}
      style={{ boxShadow: `0 0 12px ${glowColor}, inset 0 1px 0 ${glowColor}33` }}
    >
      <div className={`h-3 w-3 rounded-full ${colorClass}`} />
      <span className="font-mono text-xs font-medium text-foreground">{name}</span>
    </div>
  )
}

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen w-full min-w-0 bg-background text-foreground">
      {/* Navigation Demo */}
      <nav className="sticky top-0 z-50 flex w-full items-center gap-6 border-b border-border bg-background/80 px-10 py-3 backdrop-blur-sm">
        <span className="font-mono text-lg font-bold tracking-tight text-primary">GRAIL</span>
        <div className="flex items-center gap-1">
          <NavTab label="Home" active={false} icon />
          <NavTab label="Trades" active />
          <NavTab label="Loadouts" active={false} />
          <NavTab label="Watchlist" active={false} />
        </div>
      </nav>

      <div className="w-full space-y-12 px-10 py-10">
        {/* Hero Metrics Demo */}
        <Section title="Hero Metrics">
          <div className="flex items-end gap-8">
            <div>
              <p className="text-xs uppercase tracking-wider text-text-secondary">Career Profit</p>
              <p
                className="font-mono text-4xl font-bold text-profit"
                style={{ textShadow: "0 0 20px rgba(0, 255, 136, 0.4)" }}
              >
                +$12,847.50
              </p>
            </div>
            <div className="mb-1">
              <span className="rounded-full bg-accent-muted px-3 py-1 font-mono text-xs font-medium text-profit">
                Capital at Risk: $3,240.00
              </span>
            </div>
            <div className="mb-1 flex gap-4">
              <div>
                <p className="text-[12px] uppercase tracking-wider text-text-secondary">Win Rate</p>
                <p className="font-mono text-lg font-bold text-profit">74%</p>
              </div>
              <div>
                <p className="text-[12px] uppercase tracking-wider text-text-secondary">ROI</p>
                <p className="font-mono text-lg font-bold text-profit">+186%</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-end gap-8">
            <div>
              <p className="text-xs uppercase tracking-wider text-text-secondary">Loss Example</p>
              <p
                className="font-mono text-4xl font-bold text-loss"
                style={{ textShadow: "0 0 20px rgba(255, 51, 102, 0.4)" }}
              >
                -$420.00
              </p>
            </div>
          </div>
        </Section>

        {/* Color Palette */}
        <Section title="Color Palette — Semantic">
          <div className="flex flex-wrap gap-4">
            <Swatch name="Profit" className="bg-profit" />
            <Swatch name="Loss" className="bg-loss" />
            <Swatch name="Warning" className="bg-warning" />
            <Swatch name="Info" className="bg-info" />
          </div>
        </Section>

        <Section title="Color Palette — Surfaces">
          <div className="flex flex-wrap gap-4">
            <Swatch name="Background" className="bg-background" />
            <Swatch name="Surface" className="bg-surface" />
            <Swatch name="Surface Hover" className="bg-surface-hover" />
            <Swatch name="Border" className="bg-border" />
          </div>
        </Section>

        <Section title="Color Palette — Text">
          <div className="flex flex-wrap gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-foreground">Primary Text</span>
              <span className="text-[12px] text-text-secondary">#ffffff</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-text-secondary">Secondary Text</span>
              <span className="text-[12px] text-text-secondary">#888888</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-text-muted">Muted Text</span>
              <span className="text-[12px] text-text-secondary">#555555</span>
            </div>
          </div>
        </Section>

        <Section title="Color Palette — Interactive">
          <div className="flex flex-wrap gap-4">
            <Swatch name="Accent" className="bg-primary" />
            <Swatch name="Accent Hover" className="bg-accent-hover" />
            <Swatch name="Accent Muted" className="bg-accent-muted" />
            <Swatch name="Destructive" className="bg-destructive" />
            <Swatch name="Destruct. Hover" className="bg-destructive-hover" />
            <Swatch name="Focus Ring" className="bg-focus-ring" />
          </div>
        </Section>

        {/* Rarity Colors */}
        <Section title="Rarity Colors">
          <div className="flex flex-wrap gap-3">
            <RarityChip name="Consumer" colorClass="bg-rarity-consumer" glowColor="#b0c3d9" />
            <RarityChip name="Industrial" colorClass="bg-rarity-industrial" glowColor="#5e98d9" />
            <RarityChip name="Mil-Spec" colorClass="bg-rarity-milspec" glowColor="#4b69ff" />
            <RarityChip name="Restricted" colorClass="bg-rarity-restricted" glowColor="#8847ff" />
            <RarityChip name="Classified" colorClass="bg-rarity-classified" glowColor="#d32ce6" />
            <RarityChip name="Covert" colorClass="bg-rarity-covert" glowColor="#eb4b4b" />
            <RarityChip name="Gold" colorClass="bg-rarity-gold" glowColor="#ffd700" />
          </div>
        </Section>

        {/* Typography */}
        <Section title="Typography">
          <div className="space-y-6">
            <div>
              <p className="mb-1 text-[12px] uppercase tracking-wider text-text-secondary">
                JetBrains Mono — Default UI (<code className="text-foreground">font-sans</code> /{" "}
                <code className="text-foreground">font-mono</code> /{" "}
                <code className="text-foreground">font-hero-serif</code>)
              </p>
              <h1 className="font-mono text-3xl font-bold">CAREER PROFIT</h1>
              <h2 className="font-mono text-2xl font-bold">+$12,847.50</h2>
              <h3 className="font-mono text-xl font-semibold">Trades Dashboard</h3>
              <p className="font-mono text-sm tabular-nums">0.0712 FN | 0.2543 FT | 0.7821 BS</p>
              <p className="font-hero-serif mt-4 text-3xl font-normal leading-tight tracking-wide text-foreground">
                The fastest way from target to trade.
              </p>
              <p className="mt-4 text-base">
                Track your CS2 skin trades with precision. Log every buy and sell, monitor float
                values across wear conditions, and calculate your real profit margin.
              </p>
              <p className="mt-2 text-sm text-text-secondary">
                Secondary body text at a smaller size, used for descriptions, helper text, and
                supplementary information throughout the interface.
              </p>
              <p className="mt-2 text-xs text-text-muted">
                Muted caption text for timestamps, metadata, and tertiary information.
              </p>
            </div>
          </div>
        </Section>

        {/* Buttons */}
        <Section title="Buttons">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="xs">XS</Button>
              <Button size="sm">SM</Button>
              <Button>Default</Button>
              <Button size="lg">LG</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled>Disabled</Button>
              <Button variant="secondary" disabled>
                Disabled Secondary
              </Button>
              <Button variant="destructive" disabled>
                Disabled Destructive
              </Button>
            </div>
          </div>
        </Section>

        {/* Status Badges */}
        <Section title="Status Badges">
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-[12px] uppercase tracking-wider text-text-secondary">
                Trades
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full bg-info/15 px-2.5 py-0.5 text-xs font-medium text-info">
                  Open
                </span>
                <span className="inline-flex items-center rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-medium text-profit">
                  Sold
                </span>
              </div>
            </div>
            <div>
              <p className="mb-2 text-[12px] uppercase tracking-wider text-text-secondary">
                Watchlist
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-medium text-warning">
                  Hunting
                </span>
                <span className="inline-flex items-center rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-medium text-profit">
                  Acquired
                </span>
                <span className="inline-flex items-center rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-text-muted">
                  Abandoned
                </span>
              </div>
            </div>
          </div>
        </Section>

        {/* Shadcn Badge Component */}
        <Section title="Badge Component (shadcn)">
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </Section>

        {/* Form Inputs */}
        <Section title="Form Inputs">
          <div className="grid max-w-lg gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Skin Name</label>
              <Input placeholder="e.g. AK-47 | Redline" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Float Value</label>
              <Input type="number" placeholder="0.0000" step="0.0001" min="0" max="1" />
              <p className="text-[12px] text-text-muted">
                Enter a value between 0.0000 and 1.0000
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Buy Price</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary">$</span>
                <Input type="number" placeholder="0.00" step="0.01" className="flex-1" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Disabled Input</label>
              <Input disabled value="Cannot edit" />
            </div>
          </div>
        </Section>

        {/* Cards */}
        <Section title="Cards">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <TradeCard
              name="AK-47 | Redline"
              wear="FT"
              float="0.2543"
              buy="$12.50"
              sell="$18.75"
              profit="+$6.25"
              profitPositive
              variant="StatTrak"
            />
            <TradeCard
              name="AWP | Asiimov"
              wear="BS"
              float="0.9012"
              buy="$24.00"
              sell={null}
              profit={null}
              profitPositive={false}
              variant="Normal"
            />
            <TradeCard
              name="M4A4 | Howl"
              wear="FN"
              float="0.0312"
              buy="$1,450.00"
              sell="$1,200.00"
              profit="-$250.00"
              profitPositive={false}
              variant="Normal"
            />
          </div>
        </Section>

        {/* Tab Indicator Demo */}
        <Section title="Tab Indicator">
          <div className="flex gap-6 border-b border-border">
            <button className="border-b-2 border-primary px-1 pb-2 text-sm font-medium text-foreground">
              Active Tab
            </button>
            <button className="border-b-2 border-transparent px-1 pb-2 text-sm text-text-secondary hover:text-foreground">
              Inactive Tab
            </button>
            <button className="border-b-2 border-transparent px-1 pb-2 text-sm text-text-secondary hover:text-foreground">
              Another Tab
            </button>
          </div>
        </Section>

        <footer className="border-t border-border pt-6 pb-12 text-center text-xs text-text-muted">
          Grail Design System Preview — All tokens from SPEC.md
        </footer>
      </div>
    </div>
  )
}

function NavTab({ label, active, icon }: { label: string; active: boolean; icon?: boolean }) {
  return (
    <button
      className={`relative px-3 py-2 text-sm transition-colors ${
        active ? "text-foreground" : "text-text-secondary hover:text-foreground"
      }`}
    >
      {icon ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
          <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      ) : (
        label
      )}
      {active && (
        <span className="absolute right-0 bottom-0 left-0 h-0.5 bg-primary" />
      )}
    </button>
  )
}

function TradeCard({
  name,
  wear,
  float: floatVal,
  buy,
  sell,
  profit,
  profitPositive,
  variant,
}: {
  name: string
  wear: string
  float: string
  buy: string
  sell: string | null
  profit: string | null
  profitPositive: boolean
  variant: string
}) {
  return (
    <div className="group rounded-none border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-surface-hover">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium">{name}</h3>
          <div className="mt-1 flex items-center gap-2">
            <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[12px] text-text-secondary">
              {wear}
            </span>
            <span className="font-mono text-[12px] text-text-muted">{floatVal}</span>
            {variant !== "Normal" && (
              <span className="text-[12px] font-medium text-warning">{variant}</span>
            )}
          </div>
        </div>
        {sell ? (
          <span className="inline-flex items-center rounded-full bg-accent-muted px-2 py-0.5 text-[12px] font-medium text-profit">
            Sold
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-info/15 px-2 py-0.5 text-[12px] font-medium text-info">
            Open
          </span>
        )}
      </div>
      <div className="flex items-end justify-between">
        <div className="space-y-0.5">
          <p className="text-[12px] text-text-muted">Buy</p>
          <p className="font-mono text-xs">{buy}</p>
        </div>
        {sell && (
          <div className="space-y-0.5 text-right">
            <p className="text-[12px] text-text-muted">Sell</p>
            <p className="font-mono text-xs">{sell}</p>
          </div>
        )}
        {profit && (
          <div className="space-y-0.5 text-right">
            <p className="text-[12px] text-text-muted">P&L</p>
            <p className={`font-mono text-sm font-bold ${profitPositive ? "text-profit" : "text-loss"}`}>
              {profit}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
