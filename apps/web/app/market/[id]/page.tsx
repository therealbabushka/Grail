"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Label } from "@workspace/ui/components/label"

import { AuthLink } from "@/components/auth-link"
import { buildMarketplaceLinks } from "@/lib/pricing/marketplace-links"

type CatalogItem = {
  id: string
  name: string
  weaponName?: string
  rarityName?: string
  rarityId?: string
  rarityColor?: string
  imageUrl?: string
  floatMin?: number
  floatMax?: number
  exteriors: Array<"FN" | "MW" | "FT" | "WW" | "BS">
  hasStatTrak: boolean
}

type PriceSnapshot = {
  itemName: string
  currency: string
  markets: Array<{ market: string; price: number | null; volume24h?: number | null; updatedAt: string }>
}

function pickPreferredExterior(exteriors: CatalogItem["exteriors"]) {
  const pref: CatalogItem["exteriors"] = ["FT", "MW", "FN", "WW", "BS"]
  for (const p of pref) if (exteriors.includes(p)) return p
  return exteriors[0] ?? "FT"
}

function steamExteriorLabel(exterior: CatalogItem["exteriors"][number]) {
  switch (exterior) {
    case "FN":
      return "Factory New"
    case "MW":
      return "Minimal Wear"
    case "FT":
      return "Field-Tested"
    case "WW":
      return "Well-Worn"
    case "BS":
      return "Battle-Scarred"
  }
}

/** Chart + live pricing use the same eight markets, in display order. */
const CHART_MARKETS = [
  "steam",
  "buff163",
  "skinport",
  "csfloat",
  "bitskins",
  "dmarket",
  "waxpeer",
  "csmoney",
] as const
type ChartMarket = (typeof CHART_MARKETS)[number]

const LIVE_PRICING_MARKETS = CHART_MARKETS

/** Lowercase label in live-pricing chips (matches marketplace branding row). */
function marketChipLabel(id: string) {
  if (id === "csmoney") return "csmoney"
  return id.toLowerCase()
}

export default function MarketDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ? decodeURIComponent(params.id) : ""
  const [item, setItem] = useState<CatalogItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<PriceSnapshot | null>(null)
  const [pricingFetched, setPricingFetched] = useState(false)
  const didForceSnapshotRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError(null)
      try {
        const res = await fetch(`/api/catalog/${encodeURIComponent(id)}`)
        const json = (await res.json()) as { item?: CatalogItem; error?: string }
        if (!res.ok || !json.item) throw new Error(json.error || "catalog_failed")
        if (!cancelled) setItem(json.item)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "catalog_failed")
      }
    }
    if (id) load()
    return () => {
      cancelled = true
    }
  }, [id])

  const marketHashName = useMemo(() => {
    if (!item?.name) return null
    if (!item.exteriors?.length) return item.name
    return `${item.name} (${steamExteriorLabel(pickPreferredExterior(item.exteriors))})`
  }, [item])

  const preferredExterior = useMemo(() => {
    if (!item?.exteriors?.length) return "FT" as const
    return pickPreferredExterior(item.exteriors)
  }, [item?.exteriors])

  const links = useMemo((): Record<string, string> | null => {
    if (!item || !marketHashName) return null
    return buildMarketplaceLinks({ itemName: item.name, marketHashName }) as Record<string, string>
  }, [item, marketHashName])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!item?.id) return
    try {
      const key = "grail.recentMarket.v1"
      const raw = window.localStorage.getItem(key)
      const prev = raw ? (JSON.parse(raw) as string[]) : []
      const next = [item.id, ...prev.filter((x) => x !== item.id)].slice(0, 16)
      window.localStorage.setItem(key, JSON.stringify(next))
    } catch {
      // ignore
    }
  }, [item?.id])

  // Fan-out live pricing only on skin detail (`/market/[id]`), after catalog resolves — not on `/market` listing.
  useEffect(() => {
    let cancelled = false
    async function loadPricing(name: string) {
      setPricingFetched(false)
      try {
        const exactMarketHashName = item?.exteriors?.length
          ? `${name} (${steamExteriorLabel(pickPreferredExterior(item.exteriors))})`
          : name
        const s = await fetch(`/api/pricing/snapshot?item=${encodeURIComponent(exactMarketHashName)}&currency=USD`)
        const sj = (await s.json()) as PriceSnapshot
        if (!cancelled) {
          setSnapshot(s.ok ? sj : null)
        }

        // If some providers are cached as "null" priced (showing `—`), re-scrape once while on this page.
        // CS.MONEY may stay null when Cloudflare blocks server fetch; don't loop retries for that alone.
        const needsForceRetry = sj?.markets?.some((m) => m.price == null && m.market !== "csmoney")
        if (!cancelled && needsForceRetry && !didForceSnapshotRef.current) {
          didForceSnapshotRef.current = true
          const s2 = await fetch(
            `/api/pricing/snapshot?item=${encodeURIComponent(exactMarketHashName)}&currency=USD&force=1`,
          )
          const sj2 = (await s2.json()) as PriceSnapshot
          if (s2.ok) setSnapshot(sj2)
        }
      } catch {
        if (!cancelled) {
          setSnapshot(null)
        }
      } finally {
        if (!cancelled) setPricingFetched(true)
      }
    }
    didForceSnapshotRef.current = false
    if (item?.name) loadPricing(item.name)
    return () => {
      cancelled = true
    }
  }, [item?.name])

  /** Fixed seven markets; price from snapshot when available. */
  const livePricingRows = useMemo(() => {
    const byMarket = new Map((snapshot?.markets ?? []).map((m) => [m.market, m]))
    return LIVE_PRICING_MARKETS.map((id) => {
      const row = byMarket.get(id)
      const price = row?.price ?? null
      const hasPrice = price != null && price > 0
      return { market: id, price, hasPrice }
    })
  }, [snapshot])

  return (
    <main className="h-fit w-full min-w-0 bg-background px-10 py-10 text-foreground">
      <div className="w-full space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/market" className="font-mono text-[12px] text-info hover:underline">
            ← Back to Market
          </Link>
          <div className="flex gap-2">
            <AuthLink
              href="/watchlist"
              variant="outline"
              size="sm"
              loginText="Login to open Watchlist"
              className="font-mono text-[12px]"
            >
              Watchlist
            </AuthLink>
            <AuthLink
              href="/trade-links"
              variant="ghost"
              size="sm"
              loginText="Login to open Trade Links"
              className="font-mono text-[12px]"
            >
              Trade Links
            </AuthLink>
          </div>
        </div>

        {error && (
          <Card className="border-destructive/40">
            <CardContent className="py-6 text-sm text-destructive">
              Failed to load: {error}
            </CardContent>
          </Card>
        )}

        {!error && !item && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-text-muted">
              {id ? "Loading skin…" : "Missing id"}
            </CardContent>
          </Card>
        )}

        {item && (
          <Card
            className="overflow-hidden"
            style={
              item.rarityColor
                ? ({
                    boxShadow: `0 0 0 1px ${item.rarityColor}33, 0 14px 40px -30px ${item.rarityColor}66`,
                  } as React.CSSProperties)
                : undefined
            }
          >
            <CardHeader className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="font-mono text-lg">{item.name}</CardTitle>
                <span
                  className="mt-1 inline-block size-2 shrink-0 rounded-full border border-border"
                  style={item.rarityColor ? ({ backgroundColor: item.rarityColor } as React.CSSProperties) : undefined}
                  aria-hidden
                />
              </div>
              <CardDescription className="text-xs text-text-secondary">
                {item.weaponName ?? "—"} · {item.rarityName ?? "—"}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[280px,1fr]">
              <div className="relative overflow-hidden rounded-none border border-border bg-background/40 p-4">
                <div
                  className="absolute inset-0 opacity-70"
                  style={
                    item.rarityColor
                      ? ({
                          background: `radial-gradient(420px 240px at 40% 30%, ${item.rarityColor}22 0%, transparent 65%)`,
                        } as React.CSSProperties)
                      : undefined
                  }
                  aria-hidden
                />
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="relative h-52 w-auto max-w-full object-contain"
                  />
                ) : (
                  <div className="relative h-52 w-full" />
                )}
              </div>
              <div className="space-y-4">
                <div className="rounded-none border border-border bg-surface/70 p-3 backdrop-blur">
                  <p className="mb-2 font-mono text-[12px] uppercase tracking-wider text-text-secondary">
                    Spec sheet
                  </p>
                  <div className="grid gap-y-2 gap-x-6 sm:grid-cols-2">
                    <SpecRow label="Weapon" value={item.weaponName ?? "—"} />
                    <SpecRow label="Rarity" value={item.rarityName ?? "—"} />
                    <SpecRow
                      label="Exterior"
                      value={item.exteriors?.length ? item.exteriors.join(" / ") : "—"}
                    />
                    <SpecRow
                      label="Float range"
                      value={
                        typeof item.floatMin === "number" && typeof item.floatMax === "number"
                          ? `${item.floatMin.toFixed(2)}–${item.floatMax.toFixed(2)}`
                          : "—"
                      }
                    />
                    <SpecRow label="StatTrak" value={item.hasStatTrak ? "Available" : "—"} />
                  </div>
                </div>

                <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-stretch">
                  <div className="flex min-h-0 flex-col rounded-none border border-border bg-surface/70 p-3 backdrop-blur">
                    <p className="mb-3 font-mono text-[12px] uppercase tracking-wider text-text-secondary">
                      Live pricing (beta)
                    </p>
                    {!pricingFetched ? (
                      <p className="text-[12px] text-text-muted">Loading pricing…</p>
                    ) : (
                      <div className="flex min-h-0 flex-1 flex-col gap-2">
                        <div className="flex flex-col gap-2">
                          {livePricingRows.map((row) => (
                            <div
                              key={row.market}
                              className="flex min-h-[28px] w-full min-w-0 items-center justify-between gap-2 rounded-none border border-border bg-background/40 px-2 py-1"
                            >
                              <span className="inline-flex min-w-0 items-center gap-1.5">
                                <img
                                  src={marketLogoSrc(row.market)}
                                  alt={`${marketChipLabel(row.market)} logo`}
                                  className="h-4 w-4 shrink-0 object-contain"
                                  loading="lazy"
                                />
                                <span className="truncate font-mono text-[12px] text-foreground">
                                  {marketChipLabel(row.market)}
                                </span>
                              </span>
                              {row.hasPrice ? (
                                links?.[row.market] ? (
                                  <a
                                    href={links[row.market]}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="shrink-0 font-mono text-[12px] text-info tabular-nums hover:underline"
                                    title={`Open ${row.market} listing`}
                                  >
                                    ${row.price!.toFixed(2)}
                                  </a>
                                ) : (
                                  <span className="shrink-0 font-mono text-[12px] text-foreground tabular-nums">
                                    ${row.price!.toFixed(2)}
                                  </span>
                                )
                              ) : links?.[row.market] ? (
                                <a
                                  href={links[row.market]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 font-mono text-[12px] text-info hover:underline"
                                >
                                  Visit
                                </a>
                              ) : (
                                <span className="shrink-0 font-mono text-[12px] text-text-muted">—</span>
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="mt-auto pt-2 text-[12px] text-text-muted">
                          Cached server-side when available. No price yet — use Visit to open the market listing.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex min-h-0 flex-col rounded-none border border-border bg-surface/70 p-3 backdrop-blur">
                    <p className="mb-3 text-[12px] text-text-muted">
                      Sample trend data for layout preview — toggle markets and time range below.
                    </p>
                    <div className="min-h-0 flex-1">
                      <DummyPriceHistoryChart itemId={item.id} />
                    </div>
                  </div>
                </div>

                <div className="grid gap-y-2 gap-x-6 sm:grid-cols-2">
                  <AuthLink
                    href={`/watchlist?skin=${encodeURIComponent(item.name)}&weapon=${encodeURIComponent(item.weaponName ?? "")}&wear=${encodeURIComponent(preferredExterior)}`}
                    variant="default"
                    size="default"
                    loginText="Login to add to Watchlist"
                    className="font-mono text-xs tracking-wide"
                  >
                    Add to Watchlist
                  </AuthLink>
                  <AuthLink
                    href={`/trade-links?skin=${encodeURIComponent(item.name)}&weapon=${encodeURIComponent(item.weaponName ?? "")}`}
                    variant="outline"
                    size="default"
                    loginText="Login to add as Trade"
                    className="font-mono text-xs tracking-wide"
                  >
                    Add as Trade
                  </AuthLink>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-mono text-[12px] uppercase tracking-wider text-text-secondary">{label}</span>
      <span className="font-mono text-[12px] text-foreground">{value}</span>
    </div>
  )
}

function marketLogoSrc(market: string) {
  if (market === "steam") return `/market-logos/steam-icon.svg`
  if (market === "bitskins") return `/market-logos/bitskins-path420.svg`
  if (market === "buff163") return `/market-logos/buff163.svg`
  return `/market-logos/${market}.svg`
}

const MARKET_COLORS: Record<string, string> = {
  steam: "#0ea5e9",
  buff163: "#f59e0b",
  skinport: "#6d28d9",
  bitskins: "#f59e0b",
  csfloat: "#22c55e",
  csmoney: "#FF159A",
  dmarket: "#f97316",
  waxpeer: "#14b8a6",
}

type HistoryRange = "1w" | "1m" | "6m" | "1y" | "all"

const HISTORY_RANGE_DAYS: Record<HistoryRange, number> = {
  "1w": 7,
  "1m": 30,
  "6m": 182,
  "1y": 365,
  all: 730,
}

const HISTORY_RANGE_LABELS: { id: HistoryRange; label: string }[] = [
  { id: "1w", label: "1W" },
  { id: "1m", label: "1M" },
  { id: "6m", label: "6M" },
  { id: "1y", label: "1Y" },
  { id: "all", label: "All" },
]

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h) || 1
}

function mulberry32(seed: number) {
  return function rand() {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Market variance multipliers (vs Steam). Calibrated from real cross-market
 * comparisons: Steam is typically 5–15% above others (fee-driven); Skinport/Buff
 * often 5–15% below. Applied to all demo chart items for realistic variance.
 */
const MARKET_VARIANCE_MULTIPLIERS: Record<ChartMarket, number> = {
  steam: 1.0,
  buff163: 0.88,
  skinport: 0.92,
  csfloat: 0.97,
  bitskins: 0.94,
  dmarket: 0.96,
  waxpeer: 0.93,
  csmoney: 0.95,
}

/** Single base price series per item (same underlying trend for all markets). */
function dummyBaseSeries(itemId: string, totalDays: number) {
  const rng = mulberry32(hashString(`base:${itemId}`))
  const basePrice = 120 + (hashString(itemId) % 280)
  const out: { date: string; value: number }[] = []
  const now = Date.now()
  for (let d = totalDays; d >= 0; d--) {
    const i = totalDays - d
    const t = now - d * 86400000
    const wave = Math.sin(i / 32) * 18
    const drift = (i / totalDays) * 12
    const noise = (rng() - 0.5) * 8
    const value = Math.max(1, basePrice + wave + drift + noise)
    out.push({ date: new Date(t).toISOString().slice(0, 10), value })
  }
  return out
}

/** Deterministic pseudo-random daily USD series per market (demo only). */
function dummyMarketSeries(itemId: string, market: ChartMarket, totalDays: number) {
  const rng = mulberry32(hashString(`${itemId}:${market}`))
  const mult = MARKET_VARIANCE_MULTIPLIERS[market]
  const basePoints = dummyBaseSeries(itemId, totalDays)
  return basePoints.map(({ date, value }) => {
    const noisePct = (rng() - 0.5) * 0.03
    const price = Math.max(0.01, value * mult * (1 + noisePct))
    return { date, value: price }
  })
}

function mergeDummyChartRows(itemId: string): Array<Record<string, number | string>> {
  const merged = new Map<string, Record<string, number | string>>()
  CHART_MARKETS.forEach((market) => {
    for (const p of dummyMarketSeries(itemId, market, HISTORY_RANGE_DAYS.all)) {
      const row = merged.get(p.date) ?? { date: p.date }
      row[market] = p.value
      merged.set(p.date, row)
    }
  })
  return Array.from(merged.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)))
}

function filterRowsByRange(rows: Array<Record<string, number | string>>, range: HistoryRange) {
  const days = HISTORY_RANGE_DAYS[range]
  if (range === "all" || rows.length === 0) return rows
  const lastDate = String(rows[rows.length - 1]?.date ?? "")
  if (!lastDate) return rows
  const end = new Date(lastDate)
  const start = new Date(end)
  start.setDate(start.getDate() - (days - 1))
  return rows.filter((r) => new Date(String(r.date)) >= start)
}

function defaultMarketVisibility(): Record<ChartMarket, boolean> {
  return {
    steam: true,
    buff163: true,
    skinport: true,
    csfloat: true,
    bitskins: true,
    dmarket: true,
    waxpeer: true,
    csmoney: true,
  }
}

function DummyPriceHistoryChart({ itemId }: { itemId: string }) {
  const [range, setRange] = useState<HistoryRange>("1m")
  const [visible, setVisible] = useState<Record<ChartMarket, boolean>>(defaultMarketVisibility)

  const fullRows = useMemo(() => mergeDummyChartRows(itemId), [itemId])
  const rangedRows = useMemo(() => filterRowsByRange(fullRows, range), [fullRows, range])

  const activeMarkets = CHART_MARKETS.filter((m) => visible[m])
  const effectiveData =
    rangedRows.length >= 2 ? rangedRows : fullRows.length >= 2 ? fullRows.slice(-Math.min(30, fullRows.length)) : rangedRows

  const firstDate = String(effectiveData[0]?.date ?? "")
  const lastDate = String(effectiveData[effectiveData.length - 1]?.date ?? "")

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-mono text-[12px] text-text-secondary">Market trend (USD, demo)</span>
        <div className="flex flex-wrap items-center gap-1">
          {HISTORY_RANGE_LABELS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setRange(id)}
              className={`rounded-none border px-2 py-0.5 font-mono text-[12px] ${
                range === id
                  ? "border-info bg-info/15 text-info"
                  : "border-border bg-background/40 text-text-secondary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 border border-border/60 bg-background/30 px-3 py-2">
        {CHART_MARKETS.map((m) => (
          <Label
            key={m}
            className="flex cursor-pointer items-center gap-1.5 font-mono text-[12px] text-foreground"
          >
            <Checkbox
              checked={visible[m]}
              onCheckedChange={(c) => setVisible((prev) => ({ ...prev, [m]: c === true }))}
              className="border-border"
            />
            <span
              className="inline-block size-2 shrink-0 rounded-full"
              style={{ backgroundColor: MARKET_COLORS[m] ?? "#888" }}
              aria-hidden
            />
            {marketChipLabel(m)}
          </Label>
        ))}
      </div>

      <div className="h-56 w-full min-w-0 rounded-none border border-border bg-background/40 px-2 pt-3">
        {activeMarkets.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-[12px] text-text-muted">
            Select at least one market to show the chart.
          </div>
        ) : effectiveData.length >= 2 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={effectiveData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.35} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                tickFormatter={(value: string) =>
                  new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                }
                className="text-[12px] fill-[var(--text-muted)]"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                domain={["auto", "auto"]}
                tickFormatter={(value: number) => `$${value.toFixed(0)}`}
                className="text-[12px] fill-[var(--text-muted)]"
              />
              <Tooltip
                cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                wrapperStyle={{ zIndex: 9999 }}
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 0,
                  fontSize: 11,
                  zIndex: 9999,
                }}
                formatter={(value, name) => {
                  const n = typeof value === "number" ? value : Number(value)
                  return [Number.isFinite(n) ? `$${n.toFixed(2)}` : "—", String(name)]
                }}
                labelFormatter={(label) => new Date(label).toLocaleDateString()}
              />
              <Legend wrapperStyle={{ fontSize: 10, letterSpacing: "0.06em" }} />
              {activeMarkets.map((market) => (
                <Line
                  key={market}
                  type="monotone"
                  dataKey={market}
                  name={marketChipLabel(market)}
                  stroke={MARKET_COLORS[market] ?? "#888888"}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-[12px] text-text-muted">Not enough demo points.</div>
        )}
      </div>

      {firstDate && lastDate && (
        <div className="flex items-center justify-between text-[12px] text-text-muted">
          <span>{new Date(firstDate).toLocaleDateString()}</span>
          <span>{new Date(lastDate).toLocaleDateString()}</span>
        </div>
      )}
    </div>
  )
}


