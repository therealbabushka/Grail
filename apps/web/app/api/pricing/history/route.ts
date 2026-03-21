import { NextResponse } from "next/server"

type SeriesPoint = { ts: string; value: number }

type MarketHistory = {
  market: string
  currency: string
  updatedAt: string
  series: SeriesPoint[]
  summary?: Record<string, unknown>
  raw?: unknown
}

import { createAdminClient } from "@/lib/supabase/admin"

const TIMEFRAME = "1d" as const
const CANDLES_MAX = 400
const ALL_MARKETS = ["steam", "skinport", "bitskins", "csfloat", "csmoney", "dmarket", "waxpeer"] as const

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const itemName = searchParams.get("item")?.trim()
  const currency = (searchParams.get("currency")?.trim().toUpperCase() || "USD") as string

  if (!itemName) return NextResponse.json({ error: "missing_item" }, { status: 400 })

  const admin = createAdminClient()
  const nowIso = new Date().toISOString()

  const markets: MarketHistory[] = ALL_MARKETS.map((m) => ({
    market: m,
    currency,
    updatedAt: nowIso,
    series: [],
  }))

  if (!admin) {
    return NextResponse.json({
      itemName,
      currency,
      markets,
    })
  }

  const { data } = await admin
    .from("market_price_candles")
    .select("ts, close, market, currency, timeframe, fetched_at")
    .eq("item_name", itemName)
    .in("market", [...ALL_MARKETS])
    .eq("currency", currency)
    .eq("timeframe", TIMEFRAME)
    .order("ts", { ascending: false })
    .limit(CANDLES_MAX * ALL_MARKETS.length)

  const rows = Array.isArray(data) ? data : []

  const marketsByKey = new Map<string, { series: SeriesPoint[]; updatedAt: string }>()
  for (const row of rows) {
    if (typeof row.market !== "string") continue
    if (!Object.values(ALL_MARKETS).includes(row.market as any)) continue
    if (typeof row.close !== "number" || !Number.isFinite(row.close)) continue
    const key = String(row.market)
    const prev = marketsByKey.get(key) ?? { series: [], updatedAt: nowIso }
    prev.series.push({ ts: row.ts, value: row.close })
    prev.updatedAt = String(row.fetched_at ?? nowIso)
    marketsByKey.set(key, prev)
  }

  for (const m of markets) {
    const hit = marketsByKey.get(m.market)
    if (!hit) continue
    // Query is newest-first; return series newest window, but in chronological order for charting.
    m.series = hit.series.slice(0, CANDLES_MAX).reverse()
    m.updatedAt = hit.updatedAt
    m.raw = { source: "market_price_candles", timeframe: TIMEFRAME }
  }

  return NextResponse.json({
    itemName,
    currency,
    markets,
  })
}

