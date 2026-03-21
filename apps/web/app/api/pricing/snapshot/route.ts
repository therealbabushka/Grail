import { NextResponse } from "next/server"

import { fetchAllMarketSnapshots } from "@/lib/pricing/providers"
import { createAdminClient } from "@/lib/supabase/admin"

type Snapshot = {
  itemName: string
  currency: string
  markets: Array<{
    market: string
    price: number | null
    volume24h?: number | null
    updatedAt: string
    raw?: unknown
  }>
}

const FRESH_MS = 1000 * 60 * 5

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const itemName = searchParams.get("item")?.trim()
  const currency = (searchParams.get("currency")?.trim().toUpperCase() || "USD") as string

  if (!itemName) return NextResponse.json({ error: "missing_item" }, { status: 400 })

  const force =
    searchParams.get("force")?.toLowerCase() === "1" ||
    searchParams.get("force")?.toLowerCase() === "true" ||
    searchParams.get("force")?.toLowerCase() === "yes"

  const nowIso = new Date().toISOString()
  const bitskinsApiKey = process.env.BITSKINS_API_KEY
  const bitskinsSecret = process.env.BITSKINS_API_SECRET
  const expectedMarkets = ["steam", "skinport", "bitskins", "csfloat", "csmoney", "dmarket", "waxpeer"]

  const admin = createAdminClient()

  // If DB is available, serve fresh cached snapshots first.
  if (admin && !force) {
    const { data } = await admin
      .from("market_price_snapshots")
      .select("market, currency, price, volume_24h, fetched_at, change_24h_pct, change_7d_pct")
      .eq("item_name", itemName)
      .eq("currency", currency)

    const hasAllMarkets = Boolean(data?.length && expectedMarkets.every((m) => data!.some((r) => r.market === m)))
    const hasUsablePrice = Boolean(data?.some((r) => r.price !== null))
    const isFresh =
      data?.length &&
      hasAllMarkets &&
      hasUsablePrice &&
      data.every((r) => {
        const t = new Date(r.fetched_at).getTime()
        return Number.isFinite(t) && Date.now() - t < FRESH_MS
      })

    if (isFresh && data) {
      const payload: Snapshot = {
        itemName,
        currency,
        markets: data.map((r) => ({
          market: r.market,
          price: typeof r.price === "number" ? r.price : r.price == null ? null : Number(r.price),
          volume24h: r.volume_24h,
          updatedAt: r.fetched_at,
          raw: { change_24h_pct: r.change_24h_pct, change_7d_pct: r.change_7d_pct },
        })),
      }
      return NextResponse.json(payload)
    }
  }

  // `item` is already market hash name from the UI for better matching.
  const marketHashName = itemName
  const itemDisplayName = marketHashName.replace(/\s+\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)\s*$/i, "")
  const markets = await fetchAllMarketSnapshots({
    itemName: itemDisplayName,
    marketHashName,
    currency,
    bitskinsApiKey,
    bitskinsSecret,
  })

  const payload: Snapshot = {
    itemName: marketHashName,
    currency,
    markets: markets.map((m) => ({ ...m, updatedAt: nowIso })),
  }

  // Persist latest snapshot for fast reads (server-side only).
  if (admin) {
    const rows = [
      ...markets.map((m) => ({
        item_name: marketHashName,
        market: m.market,
        currency,
        price: m.price,
        volume_24h: m.volume24h,
        fetched_at: nowIso,
        change_24h_pct: null,
        change_7d_pct: null,
      })),
    ]

    await admin.from("market_price_snapshots").upsert(rows, {
      onConflict: "item_name,market,currency",
      ignoreDuplicates: false,
    })
  }

  return NextResponse.json(payload)
}

