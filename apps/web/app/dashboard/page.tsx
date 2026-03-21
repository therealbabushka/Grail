"use client"

import { useMemo } from "react"
import Link from "next/link"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { computeTradeStats, formatMoney, useDemoStore } from "@/lib/prototype-store"

import { AuthGate } from "@/components/auth-gate"

export default function DashboardPage() {
  const { profile, trades, loadouts, targets } = useDemoStore()
  const stats = computeTradeStats(trades)
  const currency = profile.displayCurrency
  const activeTargets = targets.filter((t) => t.status === "hunting").length
  const activeLoadout = loadouts[0]

  const equityCurve = useMemo(() => {
    const sold = trades
      .filter((t) => t.status === "sold" && typeof t.sellPrice === "number")
      .map((t) => ({
        date: t.sellDate ?? t.buyDate,
        pnl: (t.sellPrice ?? 0) - t.buyPrice,
      }))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))

    const points: Array<{ date: string; equity: number }> = []
    let acc = 0
    for (const s of sold) {
      acc += s.pnl
      points.push({ date: s.date, equity: acc })
    }
    return points.slice(-24)
  }, [trades])

  const spark = useMemo(() => {
    if (equityCurve.length < 2) return ""
    const values = equityCurve.map((p) => p.equity)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const span = Math.max(1e-6, max - min)
    return values
      .map((v) => {
        const t = (v - min) / span
        const blocks = "▁▂▃▄▅▆▇█"
        const idx = Math.max(0, Math.min(blocks.length - 1, Math.round(t * (blocks.length - 1))))
        return blocks[idx]
      })
      .join("")
  }, [equityCurve])

  const profitFormatted =
    stats.realizedProfit >= 0
      ? `+${formatMoney(stats.realizedProfit, currency)}`
      : formatMoney(stats.realizedProfit, currency)
  const profitClass = stats.realizedProfit >= 0 ? "text-profit" : "text-loss"

  return (
    <AuthGate subtitle="Sign in to sync your dashboard data to your account.">
      <main className="min-h-screen w-full min-w-0 bg-background px-10 py-10 text-foreground">
        <div className="flex w-full flex-col gap-10">
        {/* Hero header */}
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-mono tracking-[0.2em] text-text-secondary">
              COMMAND_CENTER
            </p>
            <h1 className="font-mono text-3xl font-bold tracking-tight">
              Dashboard
            </h1>
            <p className="max-w-xl text-sm text-text-secondary">
              Your live summary across Trades, Loadouts, and Watchlist.
            </p>
          </div>
          <div className="mt-2 flex gap-3 md:mt-0">
            <Link href="/trade-links" passHref legacyBehavior>
              <Button asChild>
                <a className="font-mono text-xs tracking-wide">Trade Links</a>
              </Button>
            </Link>
            <Link href="/watchlist" passHref legacyBehavior>
              <Button variant="outline" asChild>
                <a className="font-mono text-xs tracking-wide">Watchlist</a>
              </Button>
            </Link>
          </div>
        </header>

        {/* Hero metrics row */}
        <section className="grid gap-6 md:grid-cols-[minmax(0,2fr),minmax(0,1.4fr)] lg:grid-cols-[minmax(0,2.2fr),minmax(0,1.2fr)]">
          <Card>
            <CardHeader className="flex flex-row items-end justify-between gap-4 border-border">
              <div>
                <p className="text-[12px] uppercase tracking-[0.2em] text-text-secondary">
                  Career Profit (Realized)
                </p>
                <p
                  className={`font-mono text-4xl font-bold ${profitClass}`}
                  style={{
                    textShadow:
                      stats.realizedProfit >= 0
                        ? "0 0 20px rgba(0, 255, 136, 0.45)"
                        : "0 0 20px rgba(255, 51, 102, 0.45)",
                  }}
                >
                  {profitFormatted}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[12px] uppercase tracking-[0.2em] text-text-secondary">
                  Capital at Risk
                </p>
                <p className="font-mono text-sm text-text-muted">
                  {formatMoney(stats.capitalAtRisk, currency)} open positions
                </p>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              <MetricBlock
                label="Win Rate"
                value={
                  stats.winRate != null ? `${Math.round(stats.winRate * 100)}%` : "–"
                }
                helper="Closed trades only"
              />
              <MetricBlock
                label="Average ROI"
                value={
                  stats.avgRoi != null
                    ? `${stats.avgRoi >= 0 ? "+" : ""}${stats.avgRoi.toFixed(1)}%`
                    : "–"
                }
                helper="Across all closed trades"
              />
              <MetricBlock
                label="Open Positions"
                value={String(stats.openPositions)}
                helper="Tracked in Trades"
              />
            </CardContent>
            <CardFooter className="justify-between border-border text-[12px] text-text-muted">
              <span>
                {stats.closedPositions === 0
                  ? "These numbers will light up as you log trades."
                  : "Metrics update as you log trades."}
              </span>
            <Link href="/trade-links" className="font-mono text-[12px] text-info">
                Log a trade →
              </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Session Summary</CardTitle>
              <CardDescription className="text-xs text-text-secondary">
                Quick snapshot of your demo data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-text-secondary">
              <SummaryRow label="Trades" value={String(trades.length)} />
              <SummaryRow label="Active sniper targets" value={String(activeTargets)} />
              <SummaryRow label="Loadouts" value={String(loadouts.length)} />
              <div className="pt-2">
                <p className="text-[12px] uppercase tracking-[0.2em] text-text-secondary">
                  Equity curve (realized)
                </p>
                <p className="mt-1 font-mono text-sm text-foreground">{spark || "—"}</p>
                <p className="mt-1 text-[12px] text-text-muted">
                  {equityCurve.length ? `Latest: ${formatMoney(equityCurve[equityCurve.length - 1]!.equity, currency)}` : "No closed trades yet."}
                </p>
              </div>
              <p className="pt-1 text-[12px] text-text-muted">
                Demo mode — data is stored in this browser only.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Pillar cards */}
        <section className="grid gap-6 md:grid-cols-3">
          <PillarCard
            label="Trade Links"
            badge="Pillar I"
            description="Log every buy and sell, compute real profit, and track capital at risk like a trading desk."
            bullets={[
              `${stats.openPositions} open · ${stats.closedPositions} closed`,
              "Career profit + win rate",
              "Best / worst flips",
            ]}
            ctaLabel={trades.length === 0 ? "Log your first trade" : "View Trade Links"}
            href="/trade-links"
          />

          <PillarCard
            label="Loadouts"
            badge="Pillar II"
            description="Build CT/T loadouts in a high-end gallery grid with glassmorphism and rarity glow."
            bullets={[
              activeLoadout ? `${activeLoadout.name} · ${Object.keys(activeLoadout.slots).length} slots` : "No loadouts",
              activeLoadout?.isPublic ? "Public" : "Private",
              activeLoadout ? new Date(activeLoadout.updatedAt).toLocaleDateString() : "—",
            ]}
            ctaLabel="Build your loadout"
            href="/loadout"
          />

          <PillarCard
            label="Watchlist"
            badge="Pillar III"
            description="Maintain a tactical watchlist of targets with float ranges, target prices, and marketplace links."
            bullets={[
              `${activeTargets} hunting`,
              `${targets.filter((t) => t.status === "acquired").length} acquired`,
              `${targets.filter((t) => t.status === "abandoned").length} abandoned`,
            ]}
            ctaLabel={targets.length === 0 ? "Add your first target" : "View Watchlist"}
            href="/watchlist"
          />
        </section>
      </div>
      </main>
    </AuthGate>
  )
}

function MetricBlock({
  label,
  value,
  helper,
}: {
  label: string
  value: string
  helper: string
}) {
  return (
    <div className="space-y-1">
      <p className="text-[12px] uppercase tracking-[0.2em] text-text-secondary">
        {label}
      </p>
      <p className="font-mono text-lg font-semibold text-foreground">{value}</p>
      <p className="text-[12px] text-text-muted">{helper}</p>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-text-secondary">{label}</span>
      <span className="font-mono text-xs text-foreground">{value}</span>
    </div>
  )
}

function PillarCard({
  label,
  badge,
  description,
  bullets,
  ctaLabel,
  href,
}: {
  label: string
  badge: string
  description: string
  bullets: string[]
  ctaLabel: string
  href: string
}) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="inline-flex items-center gap-2">
          <span className="rounded-full bg-accent-muted px-2 py-0.5 text-[12px] font-mono text-text-secondary">
            {badge}
          </span>
        </div>
        <CardTitle className="font-mono text-base font-semibold">
          {label}
        </CardTitle>
        <CardDescription className="text-xs text-text-secondary">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-1 flex-1">
        <ul className="space-y-1.5 text-[12px] text-text-secondary">
          {bullets.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-[3px] h-1 w-1 rounded-full bg-border" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="flex items-center justify-between border-border">
        <p className="text-[12px] text-text-muted">
          Demo mode — wired to local data.
        </p>
        <Link href={href} passHref legacyBehavior>
          <Button size="sm" asChild>
            <a className="font-mono text-[12px] tracking-wide">{ctaLabel} →</a>
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}

