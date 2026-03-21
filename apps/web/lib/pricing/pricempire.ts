/**
 * Price Empire API client — used for one-time bulk seed only (100 total calls before subscription).
 * @see https://pricempire.com/docs
 */

const PRICE_EMPIRE_BASE = "https://api.pricempire.com"

/** Price Empire provider_key -> Grail market schema key */
export const PROVIDER_TO_MARKET: Record<string, string> = {
  buff163: "buff163",
  buff163_buy: "buff163",
  skinport: "skinport",
  dmarket: "dmarket",
  dmarket_buy: "dmarket",
  waxpeer: "waxpeer",
  waxpeer_buy: "waxpeer",
  csmoney: "csmoney",
  csmoneym: "csmoney",
  steam: "steam",
  steam_buy: "steam",
  bitskins: "bitskins",
  csfloat: "csfloat",
  lootfarm: "lootfarm",
}

/** Markets we persist; others are skipped */
const PERSISTED_MARKETS = new Set([
  "steam",
  "buff163",
  "skinport",
  "bitskins",
  "csfloat",
  "csmoney",
  "dmarket",
  "waxpeer",
])

export type PriceEmpirePriceEntry = {
  price: number | null
  count: number | null
  updated_at: string | null
  provider_key: string
  meta?: {
    original_price?: number
    original_currency?: string
    rate?: number
  } | null
}

export type PriceEmpireItem = {
  market_hash_name: string
  image?: string
  liquidity?: number
  count?: number
  rank?: number
  prices: PriceEmpirePriceEntry[]
}

export type FetchItemPricesParams = {
  appId?: number
  sources?: string[]
  currency?: string
  type?: string
  avg?: boolean
  median?: boolean
}

export async function fetchItemPrices(
  params: FetchItemPricesParams & { apiKey?: string } = {}
): Promise<PriceEmpireItem[]> {
  const apiKey = params.apiKey ?? process.env.PRICE_EMPIRE_API_KEY
  if (!apiKey) {
    throw new Error("PRICE_EMPIRE_API_KEY is not set")
  }

  const { apiKey: _key, ...fetchParams } = params
  const url = new URL(`${PRICE_EMPIRE_BASE}/v4/paid/items/prices`)
  url.searchParams.set("app_id", String(fetchParams.appId ?? 730))
  url.searchParams.set("currency", fetchParams.currency ?? "USD")
  url.searchParams.set("avg", String(fetchParams.avg ?? false))
  url.searchParams.set("median", String(fetchParams.median ?? false))
  url.searchParams.set("inflation_threshold", "-1")

  if (fetchParams.sources?.length) {
    url.searchParams.set("sources", fetchParams.sources.join(","))
  }
  if (fetchParams.type) {
    url.searchParams.set("type", fetchParams.type)
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "User-Agent": "Grail/1.0 (+market cockpit)",
    },
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Price Empire API error ${res.status}: ${text.slice(0, 200)}`)
  }

  const json = (await res.json()) as unknown
  if (!Array.isArray(json)) {
    return []
  }
  return json as PriceEmpireItem[]
}

type SnapshotRow = {
  item_name: string
  market: string
  currency: string
  price: number | null
  volume_24h: number | null
  fetched_at: string
}

type CandleRow = {
  item_name: string
  market: string
  currency: string
  timeframe: "1d"
  ts: string
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  volume: number | null
  fetched_at: string
}

/**
 * Transform Price Empire items to our snapshot/candle row shape.
 * Only includes markets we persist; uses USD price (API converts when meta present).
 */
export function transformToSnapshotRows(
  items: PriceEmpireItem[],
  currency: string,
  dayTs: string,
  fetchedAt: string
): { snapshots: SnapshotRow[]; candles: CandleRow[] } {
  const snapshots: SnapshotRow[] = []
  const candles: CandleRow[] = []

  for (const item of items) {
    const itemName = item.market_hash_name
    const byMarket = new Map<string, { price: number | null; volume24h: number | null }>()

    for (const p of item.prices ?? []) {
      const market = PROVIDER_TO_MARKET[p.provider_key] ?? (PERSISTED_MARKETS.has(p.provider_key) ? p.provider_key : null)
      if (!market || !PERSISTED_MARKETS.has(market)) continue

      let price: number | null = null
      if (typeof p.price === "number" && Number.isFinite(p.price) && p.price > 0) {
        price = p.price
      } else if (p.meta?.original_price != null && p.meta?.rate != null && p.meta.rate > 0) {
        price = p.meta.original_price * p.meta.rate
      }

      const vol = typeof p.count === "number" && Number.isFinite(p.count) ? p.count : null
      const existing = byMarket.get(market)
      if (!existing || (price != null && (existing.price == null || price < existing.price))) {
        byMarket.set(market, { price, volume24h: vol })
      }
    }

    for (const [market, { price, volume24h }] of byMarket) {
      snapshots.push({
        item_name: itemName,
        market,
        currency,
        price,
        volume_24h: volume24h,
        fetched_at: fetchedAt,
      })
      candles.push({
        item_name: itemName,
        market,
        currency,
        timeframe: "1d",
        ts: dayTs,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: volume24h,
        fetched_at: fetchedAt,
      })
    }
  }

    return { snapshots, candles }
}
