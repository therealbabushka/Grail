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

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"

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

type PriceHistory = {
  itemName: string
  currency: string
  markets: Array<{
    market: string
    currency: string
    updatedAt: string
    series: Array<{ ts: string; value: number }>
    summary?: any
  }>
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

function buildMarketplaceLinks(params: { itemName: string; marketHashName: string }): Record<string, string> {
  const encodedItem = encodeURIComponent(params.itemName)
  const encodedHash = encodeURIComponent(params.marketHashName)
  return {
    // Exact listing URL for the specific market_hash_name used for pricing.
    steam: `https://steamcommunity.com/market/listings/730/${encodedHash}`,
    // Market-specific item-filter URLs using the same hash as pricing.
    skinport: `https://skinport.com/market?search=${encodedHash}`,
    csfloat: `https://csfloat.com/search?q=${encodedHash}`,
    bitskins: `https://bitskins.com/?market_hash_name=${encodedHash}`,
    dmarket: `https://dmarket.com/ingame-items/item-list/csgo-skins?title=${encodedItem}`,
    waxpeer: `https://waxpeer.com/?search=${encodedHash}`,
  }
}

const CHART_MARKETS = ["steam", "skinport", "bitskins", "csfloat", "dmarket", "waxpeer"] as const
type ChartMarket = (typeof CHART_MARKETS)[number]

function isChartMarket(market: string): market is ChartMarket {
  return CHART_MARKETS.includes(market as ChartMarket)
}

export default function MarketDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ? decodeURIComponent(params.id) : ""
  const [item, setItem] = useState<CatalogItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<PriceSnapshot | null>(null)
  const [history, setHistory] = useState<PriceHistory | null>(null)
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
    const preferredExterior = item.exteriors?.length ? pickPreferredExterior(item.exteriors) : "FT"
    return `${item.name} (${steamExteriorLabel(preferredExterior)})`
  }, [item])

  const preferredExterior = useMemo(() => {
    if (!item?.exteriors?.length) return "FT" as const
    return pickPreferredExterior(item.exteriors)
  }, [item?.exteriors])

  const links = useMemo(
    () =>
      item && marketHashName
        ? buildMarketplaceLinks({ itemName: item.name, marketHashName })
        : null,
    [item, marketHashName],
  )

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

  useEffect(() => {
    let cancelled = false
    async function loadPricing(name: string) {
      try {
        const preferredExterior = item?.exteriors?.length ? pickPreferredExterior(item.exteriors) : "FT"
        const exactMarketHashName = `${name} (${steamExteriorLabel(preferredExterior)})`
        const [s, h] = await Promise.all([
          fetch(`/api/pricing/snapshot?item=${encodeURIComponent(exactMarketHashName)}&currency=USD`),
          fetch(`/api/pricing/history?item=${encodeURIComponent(exactMarketHashName)}&currency=USD`),
        ])
        const sj = (await s.json()) as PriceSnapshot
        const hj = (await h.json()) as PriceHistory
        if (!cancelled) {
          setSnapshot(s.ok ? sj : null)
          setHistory(h.ok ? hj : null)
        }

        // If some providers are cached as "null" priced (showing `—`), re-scrape once while on this page.
        const needsForceRetry = sj?.markets?.some((m) => m.price == null)
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
          setHistory(null)
        }
      }
    }
    didForceSnapshotRef.current = false
    if (item?.name) loadPricing(item.name)
    return () => {
      cancelled = true
    }
  }, [item?.name])

  const historyMarkets = useMemo(() => {
    if (!history?.markets?.length) return []
    return history.markets.filter((m) => isChartMarket(m.market))
  }, [history])

  const snapshotByMarket = useMemo(() => {
    const m = new Map<string, { price: number | null }>()
    for (const row of snapshot?.markets ?? []) {
      m.set(row.market, { price: row.price ?? null })
    }
    return m
  }, [snapshot])

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/market" className="font-mono text-[11px] text-info hover:underline">
            ← Back to Market
          </Link>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="font-mono text-[11px]">
              <Link href="/watchlist">Watchlist</Link>
            </Button>
            <Button asChild size="sm" className="font-mono text-[11px]">
              <Link href="/trade-links">Trade Links</Link>
            </Button>
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
                <div className="space-y-3">
                  <div className="rounded-none border border-border bg-surface/70 p-3 backdrop-blur">
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-text-secondary">
                      Live pricing (beta)
                    </p>
                    {!snapshot ? (
                      <p className="text-[11px] text-text-muted">Loading pricing…</p>
                    ) : (
                      <div className="grid gap-2">
                        {snapshot.markets.map((m) => (
                          <div key={m.market} className="flex items-center justify-between gap-3">
                            <span className="font-mono text-[10px] uppercase tracking-wider text-text-secondary">
                              {m.market}
                            </span>
                            {links?.[m.market] && m.price != null ? (
                              <a
                                href={links[m.market]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-[11px] text-info tabular-nums hover:underline"
                                title={`Open ${m.market} listing`}
                              >
                                ${m.price.toFixed(2)}
                              </a>
                            ) : (
                              <span className="font-mono text-[11px] text-foreground tabular-nums">
                                {m.price != null ? `$${m.price.toFixed(2)}` : "—"}
                              </span>
                            )}
                          </div>
                        ))}
                        <p className="pt-1 text-[11px] text-text-muted">
                          Cached server-side when available.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-none border border-border bg-surface/70 p-3 backdrop-blur">
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-text-secondary">
                      Market price history
                    </p>
                    {!historyMarkets.length ? (
                      <p className="text-[11px] text-text-muted">
                        History unavailable for this item (or still loading).
                      </p>
                    ) : (
                      <div className="min-w-0 space-y-2">
                        <PriceHistoryChart markets={historyMarkets} snapshotByMarket={snapshotByMarket} />
                        <p className="text-[10px] text-text-muted">
                          Rendering comparison for Steam, Skinport, and BitSkins. As new market APIs are added, this chart can scale
                          by extending the market config.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-none border border-border bg-surface/70 p-3 backdrop-blur">
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-text-secondary">
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

                <div className="grid gap-y-2 gap-x-6 sm:grid-cols-2">
                  <Button asChild className="font-mono text-xs tracking-wide">
                    <Link
                      href={`/watchlist?skin=${encodeURIComponent(item.name)}&weapon=${encodeURIComponent(item.weaponName ?? "")}&wear=${encodeURIComponent(preferredExterior)}`}
                    >
                      Add to Watchlist
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="font-mono text-xs tracking-wide">
                    <Link
                      href={`/trade-links?skin=${encodeURIComponent(item.name)}&weapon=${encodeURIComponent(item.weaponName ?? "")}`}
                    >
                      Add as Trade
                    </Link>
                  </Button>
                </div>

                <div className="rounded-none border border-border bg-surface/70 p-3 backdrop-blur">
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-text-secondary">
                    Buy on
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {links &&
                      Object.entries(links).map(([site, url]) => (
                        <a
                          key={site}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-none border border-border bg-background/40 px-2 py-1 font-mono text-[11px] text-foreground transition-colors hover:bg-muted hover:text-foreground hover:underline"
                        >
                          <img
                            src={marketLogoSrc(site)}
                            alt={`${site} logo`}
                            className="h-4 w-4 object-contain"
                            loading="lazy"
                          />
                          {site}
                        </a>
                      ))}
                  </div>
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
      <span className="font-mono text-[10px] uppercase tracking-wider text-text-secondary">{label}</span>
      <span className="font-mono text-[11px] text-foreground">{value}</span>
    </div>
  )
}

function marketLogoSrc(market: string) {
  if (market === "steam") return `/market-logos/steam-icon.svg`
  if (market === "bitskins") return `/market-logos/bitskins-path420.svg`
  return `/market-logos/${market}.svg`
}

type HistoryPoint = {
  ts: string
  value: number
}

type HistoryMarket = {
  market: string
  currency: string
  updatedAt: string
  series: HistoryPoint[]
}

const MARKET_COLORS: Record<string, string> = {
  steam: "#0ea5e9",
  skinport: "#6d28d9",
  bitskins: "#f59e0b",
  csfloat: "#22c55e",
  dmarket: "#f97316",
  waxpeer: "#14b8a6",
}

function PriceHistoryChart({
  markets,
  snapshotByMarket,
}: {
  markets: HistoryMarket[]
  snapshotByMarket: Map<string, { price: number | null }>
}) {
  const [range, setRange] = useState<7 | 30 | 90>(30)
  if (!markets.length) return null

  const lookbackPoints = 120
  const trimmed = markets.map((m) => {
    const historySeries = m.series.slice(-lookbackPoints)
    if (historySeries.length > 0) return { ...m, series: historySeries }

    const fallbackPrice = snapshotByMarket.get(m.market)?.price
    if (fallbackPrice == null) return { ...m, series: [] as HistoryPoint[] }

    const now = Date.now()
    // Keep chart stable even when a provider only has snapshot pricing.
    const synthetic = Array.from({ length: 12 }, (_, idx) => ({
      ts: new Date(now - (11 - idx) * 24 * 60 * 60 * 1000).toISOString(),
      value: fallbackPrice,
    }))
    return { ...m, series: synthetic }
  })

  const visible = trimmed.filter((m) => m.series.length > 0)
  if (!visible.length) return null

  const merged = new Map<string, Record<string, number | string>>()
  for (const market of visible) {
    for (const point of market.series) {
      const key = new Date(point.ts).toISOString().slice(0, 10)
      const row = merged.get(key) ?? { date: key }
      row[market.market] = point.value
      merged.set(key, row)
    }
  }

  const chartData = Array.from(merged.values()).sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  )
  if (!chartData.length) return null

  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setDate(now.getDate() - (range - 1))
  const filteredData = chartData.filter((row) => new Date(String(row.date)) >= cutoff)
  const effectiveData = filteredData.length >= 2 ? filteredData : chartData

  const firstDate = String(effectiveData[0]?.date ?? "")
  const lastDate = String(effectiveData[effectiveData.length - 1]?.date ?? "")

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-mono text-text-secondary">Market trend (USD)</span>
        <div className="flex items-center gap-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setRange(d as 7 | 30 | 90)}
              className={`rounded-none border px-2 py-0.5 font-mono text-[10px] ${
                range === d
                  ? "border-info bg-info/15 text-info"
                  : "border-border bg-background/40 text-text-secondary"
              }`}
            >
              {d}D
            </button>
          ))}
        </div>
      </div>
      <div className="h-56 w-full min-w-0 rounded-none border border-border bg-background/40 px-2 pt-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={effectiveData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.35} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              tickFormatter={(value: string) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              className="text-[10px] fill-[var(--text-muted)]"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              domain={["auto", "auto"]}
              tickFormatter={(value: number) => `$${value.toFixed(0)}`}
              className="text-[10px] fill-[var(--text-muted)]"
            />
            <Tooltip
              cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 0,
                fontSize: 11,
              }}
              formatter={(value) => {
                const n = typeof value === "number" ? value : Number(value)
                return Number.isFinite(n) ? `$${n.toFixed(2)}` : "—"
              }}
              labelFormatter={(label) => new Date(label).toLocaleDateString()}
            />
            <Legend wrapperStyle={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }} />
            {visible.map((market) => (
              <Line
                key={market.market}
                type="monotone"
                dataKey={market.market}
                name={market.market}
                stroke={MARKET_COLORS[market.market] ?? "#888888"}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-between text-[10px] text-text-muted">
        <span>{new Date(firstDate).toLocaleDateString()}</span>
        <span>{new Date(lastDate).toLocaleDateString()}</span>
      </div>
      <div className="flex flex-wrap gap-2 text-[10px] text-text-muted">
        {visible.map((market) => {
          const lastPoint = market.series[market.series.length - 1]
          return (
            <span key={market.market} className="font-mono">
              {market.market}: {lastPoint ? `$${lastPoint.value.toFixed(2)}` : "—"}
            </span>
          )
        })}
        {trimmed.some((m) => m.series.length === 12 && !markets.find((x) => x.market === m.market)?.series.length) && (
          <span className="font-mono">* flat line indicates snapshot fallback</span>
        )}
      </div>
    </div>
  )
}


