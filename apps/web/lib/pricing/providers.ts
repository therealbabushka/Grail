import { bitskinsV2Get } from "@/lib/pricing/bitskins-v2"

type MoneyLike = unknown

export type PricePoint = { ts: string; value: number }
export type MarketSnapshot = {
  market: string
  price: number | null
  volume24h: number | null
  raw?: unknown
}

function asNumberFromLocalizedMoney(value: MoneyLike) {
  if (typeof value !== "string") return null
  const normalized = value.replace(/[^0-9.,-]/g, "").replace(/,/g, "")
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

export async function fetchSteamPriceOverview(itemName: string) {
  const url = new URL("https://steamcommunity.com/market/priceoverview/")
  url.searchParams.set("appid", "730")
  url.searchParams.set("currency", "1") // USD
  url.searchParams.set("market_hash_name", itemName)

  const res = await fetch(url.toString(), {
    next: { revalidate: 60 * 5 },
    headers: {
      "User-Agent": "Grail/1.0 (+market cockpit)",
      "Accept-Language": "en-US,en;q=0.9",
    },
  })
  if (!res.ok) return { price: null as number | null, volume24h: null as number | null, raw: { status: res.status } }
  const json = (await res.json()) as any
  return {
    price: asNumberFromLocalizedMoney(json?.lowest_price) ?? asNumberFromLocalizedMoney(json?.median_price),
    volume24h: typeof json?.volume === "string" ? Number(json.volume.replace(/,/g, "")) : null,
    raw: json,
  }
}

async function fetchHtml(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    cache: "no-store",
  })
  const text = await res.text()
  return { status: res.status, ok: res.ok, text, contentType: res.headers.get("content-type") ?? "" }
}

function parsePriceCandidatesFromText(text: string): number[] {
  const out: number[] = []

  const patterns = [
    /"price"\s*:\s*"?([0-9]+(?:\.[0-9]{1,2})?)"?/gi,
    /"lowest_price"\s*:\s*"?([0-9]+(?:\.[0-9]{1,2})?)"?/gi,
    /(?:\$|USD\s*)([0-9]{1,6}(?:\.[0-9]{1,2})?)/gi,
  ] as const

  for (const re of patterns) {
    let m: RegExpExecArray | null = null
    while ((m = re.exec(text)) !== null) {
      const n = Number(m[1])
      if (Number.isFinite(n) && n > 0 && n < 100000) out.push(n)
      if (out.length >= 100) break
    }
  }

  return out
}

function pickBestPrice(candidates: number[]): number | null {
  if (!candidates.length) return null
  const sorted = candidates.slice().sort((a, b) => a - b)
  // Use a low percentile to approximate "best listing" and avoid outliers.
  const idx = Math.max(0, Math.floor(sorted.length * 0.15))
  return sorted[idx] ?? sorted[0] ?? null
}

async function scrapeMarketPrice(market: string, url: string): Promise<MarketSnapshot> {
  try {
    const html = await fetchHtml(url)
    const candidates = parsePriceCandidatesFromText(html.text)
    return {
      market,
      price: pickBestPrice(candidates),
      volume24h: null,
      raw: {
        status: html.status,
        contentType: html.contentType,
        candidateCount: candidates.length,
      },
    }
  } catch (error) {
    return {
      market,
      price: null,
      volume24h: null,
      raw: { error: error instanceof Error ? error.message : "scrape_failed" },
    }
  }
}

export function parseSteamPriceHistory(json: any): PricePoint[] {
  const prices = Array.isArray(json?.prices) ? json.prices : []
  const out: PricePoint[] = []
  for (const row of prices) {
    if (!Array.isArray(row) || row.length < 2) continue
    const [label, price] = row
    if (typeof label !== "string") continue
    const p = typeof price === "number" ? price : Number(String(price).replace(/[^0-9.,-]/g, "").replace(/,/g, ""))
    if (!Number.isFinite(p)) continue
    const d = new Date(label)
    if (String(d) === "Invalid Date") continue
    out.push({ ts: d.toISOString(), value: p })
  }
  return out
}

export async function fetchSteamHistory(itemName: string) {
  const url = new URL("https://steamcommunity.com/market/pricehistory/")
  url.searchParams.set("appid", "730")
  url.searchParams.set("country", "US")
  url.searchParams.set("currency", "1") // USD
  url.searchParams.set("market_hash_name", itemName)

  const res = await fetch(url.toString(), {
    next: { revalidate: 60 * 10 },
    headers: {
      "User-Agent": "Grail/1.0 (+market cockpit)",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://steamcommunity.com/market/",
    },
  })

  if (!res.ok) return { series: [] as PricePoint[], raw: { status: res.status } }
  const json = (await res.json()) as any
  return { series: parseSteamPriceHistory(json), raw: json }
}

export async function fetchSkinportHistorySummary(itemName: string, currency: string) {
  const url = new URL("https://api.skinport.com/v1/sales/history")
  url.searchParams.set("app_id", "730")
  url.searchParams.set("currency", currency)
  url.searchParams.set("market_hash_name", itemName)

  const res = await fetch(url.toString(), {
    next: { revalidate: 60 * 10 },
    headers: {
      "Accept-Encoding": "br,gzip",
      "User-Agent": "Grail/1.0 (+market cockpit)",
    },
  })

  if (!res.ok) return { summary: null as any, raw: { status: res.status } }
  const json = (await res.json()) as any
  // Skinport returns an array for both single and multi item queries.
  const summary = Array.isArray(json) ? json[0] : json
  return { summary, raw: json }
}

export function skinportSnapshotFromSummary(summary: any) {
  const price =
    Number.isFinite(summary?.last_24_hours?.median) ? Number(summary.last_24_hours.median) :
    Number.isFinite(summary?.last_7_days?.median) ? Number(summary.last_7_days.median) :
    null
  const volume24h = Number.isFinite(summary?.last_24_hours?.volume) ? Number(summary.last_24_hours.volume) : null
  const change24h =
    Number.isFinite(summary?.last_24_hours?.median) && Number.isFinite(summary?.last_7_days?.median) && summary.last_7_days.median
      ? ((Number(summary.last_24_hours.median) - Number(summary.last_7_days.median)) / Number(summary.last_7_days.median)) * 100
      : null
  // Skinport summary doesn't always include clean 7d change; keep null unless present.
  return { price, volume24h, change24hPct: Number.isFinite(change24h) ? change24h : null }
}

export function toUtcDay(tsIso: string) {
  const d = new Date(tsIso)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}T00:00:00.000Z`
}

export function aggregateDailyCandles(points: PricePoint[]) {
  const byDay = new Map<string, PricePoint[]>()
  for (const p of points) {
    const key = toUtcDay(p.ts)
    const arr = byDay.get(key) ?? []
    arr.push(p)
    byDay.set(key, arr)
  }

  const out: Array<{ ts: string; open: number; high: number; low: number; close: number }> = []
  for (const [dayTs, arr] of byDay) {
    const sorted = arr.slice().sort((a, b) => a.ts.localeCompare(b.ts))
    const open = sorted[0]?.value
    const close = sorted[sorted.length - 1]?.value
    if (open === undefined || close === undefined) continue
    let high = -Infinity
    let low = Infinity
    for (const x of sorted) {
      if (x.value > high) high = x.value
      if (x.value < low) low = x.value
    }
    if (!Number.isFinite(open) || !Number.isFinite(close) || !Number.isFinite(high) || !Number.isFinite(low)) continue
    out.push({ ts: dayTs, open, high, low, close })
  }

  return out.sort((a, b) => a.ts.localeCompare(b.ts))
}

function bitskinsPriceToNumber(p: unknown): number | null {
  if (typeof p === "number" && Number.isFinite(p)) return p
  if (typeof p === "string") {
    const n = Number(p)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function bitskinsExtractMarketItems(body: any): any[] {
  const d = body?.data
  if (Array.isArray(d?.items)) return d.items
  if (Array.isArray(d)) return d
  if (Array.isArray(body?.items)) return body.items
  return []
}

function bitskinsExtractSales(body: any): any[] {
  const d = body?.data
  if (Array.isArray(d?.sales)) return d.sales
  if (Array.isArray(d?.items)) return d.items
  if (Array.isArray(d)) return d
  if (Array.isArray(body?.sales)) return body.sales
  return []
}

function bitskinsListedPriceFromItem(item: any): number | null {
  const direct =
    bitskinsPriceToNumber(item?.price) ??
    bitskinsPriceToNumber(item?.lowest_price) ??
    bitskinsPriceToNumber(item?.min_price)
  if (direct != null) return direct
  const sug = bitskinsPriceToNumber(item?.suggested_price)
  if (sug == null) return null
  // Some responses use fixed-point integers (e.g. 48200 → 48.20 USD).
  if (sug >= 10_000) return sug / 1000
  if (sug >= 1_000) return sug / 100
  return sug
}

function bitskinsSalesToSeries(sales: any[]): PricePoint[] {
  const out: PricePoint[] = []
  for (const s of sales) {
    const p = bitskinsPriceToNumber(s?.price ?? s?.sold_price)
    const t = s?.time ?? s?.sold_at ?? s?.timestamp ?? s?.created_at
    if (p == null || t == null) continue
    let ms: number
    if (typeof t === "number") ms = t < 1e12 ? t * 1000 : t
    else {
      const d = new Date(t)
      if (String(d) === "Invalid Date") continue
      ms = d.getTime()
    }
    out.push({ ts: new Date(ms).toISOString(), value: p })
  }
  return out.sort((a, b) => a.ts.localeCompare(b.ts))
}

/**
 * BitSkins API (v2): requires BITSKINS_API_KEY + BITSKINS_API_SECRET.
 * The secret is the 2FA TOTP seed shown when you enable 2FA (base32);
 * each request sends a fresh `code`.
 */
export async function fetchBitskinsPricing(itemName: string, apiKey?: string, apiSecret?: string) {
  const key = apiKey ?? process.env.BITSKINS_API_KEY
  const secret = apiSecret ?? process.env.BITSKINS_API_SECRET
  if (!key) {
    return {
      price: null as number | null,
      volume24h: null as number | null,
      series: [] as PricePoint[],
      raw: { reason: "missing_api_key" },
    }
  }
  if (!secret) {
    return {
      price: null as number | null,
      volume24h: null as number | null,
      series: [] as PricePoint[],
      raw: { reason: "missing_api_secret" },
    }
  }

  const marketRes = await bitskinsV2Get("get_price_data_for_items_on_sale", key, secret, {
    names: itemName,
  })

  const items = marketRes.ok ? bitskinsExtractMarketItems(marketRes.json) : []
  const listedPrices = items.map(bitskinsListedPriceFromItem).filter((n): n is number => n != null && Number.isFinite(n))
  const snapshotPrice = listedPrices.length ? Math.min(...listedPrices) : null

  const salesPages: any[] = []
  const rawPages: unknown[] = []
  for (let page = 1; page <= 5; page++) {
    const salesRes = await bitskinsV2Get("get_sales_info", key, secret, {
      market_hash_name: itemName,
      page,
    })
    rawPages.push(salesRes.json)
    if (!salesRes.ok) break
    const chunk = bitskinsExtractSales(salesRes.json)
    if (!chunk.length) break
    salesPages.push(...chunk)
  }

  const series = bitskinsSalesToSeries(salesPages)
  const latestFromSales = series[series.length - 1]?.value ?? null
  const price = snapshotPrice ?? latestFromSales

  const since = Date.now() - 24 * 60 * 60 * 1000
  const volume24h = series.filter((x) => new Date(x.ts).getTime() >= since).length

  return {
    price,
    volume24h,
    series,
    raw: {
      api: "bitskins_v2",
      market: marketRes.json,
      sales_pages: rawPages,
    },
  }
}

export function buildMarketplaceLinks(params: { itemName: string; marketHashName: string }) {
  const encodedItem = encodeURIComponent(params.itemName)
  const encodedHash = encodeURIComponent(params.marketHashName)
  return {
    steam: `https://steamcommunity.com/market/listings/730/${encodedHash}`,
    skinport: `https://skinport.com/market?search=${encodedHash}`,
    csfloat: `https://csfloat.com/search?q=${encodedHash}`,
    buff163: `https://buff.163.com/market/csgo#tab=selling&page_num=1&search=${encodedHash}`,
    bitskins: `https://bitskins.com/?market_hash_name=${encodedHash}`,
    dmarket: `https://dmarket.com/ingame-items/item-list/csgo-skins?title=${encodedItem}`,
    waxpeer: `https://waxpeer.com/?search=${encodedHash}`,
  }
}

export async function fetchAllMarketSnapshots(params: {
  itemName: string
  marketHashName: string
  currency: string
  bitskinsApiKey?: string
  bitskinsSecret?: string
}): Promise<MarketSnapshot[]> {
  const { itemName, marketHashName, currency, bitskinsApiKey, bitskinsSecret } = params
  const links = buildMarketplaceLinks({ itemName, marketHashName })

  const [steam, skinportSummary, bitskins, csfloat, buff163, dmarket, waxpeer] = await Promise.all([
    fetchSteamPriceOverview(marketHashName),
    fetchSkinportHistorySummary(marketHashName, currency),
    fetchBitskinsPricing(marketHashName, bitskinsApiKey, bitskinsSecret),
    scrapeMarketPrice("csfloat", links.csfloat),
    scrapeMarketPrice("buff163", links.buff163),
    scrapeMarketPrice("dmarket", links.dmarket),
    scrapeMarketPrice("waxpeer", links.waxpeer),
  ])

  const skinportSnap = skinportSnapshotFromSummary(skinportSummary.summary)
  return [
    { market: "steam", price: steam.price, volume24h: steam.volume24h, raw: steam.raw },
    { market: "skinport", price: skinportSnap.price, volume24h: skinportSnap.volume24h, raw: skinportSummary.raw },
    { market: "bitskins", price: bitskins.price, volume24h: bitskins.volume24h, raw: bitskins.raw },
    csfloat,
    buff163,
    dmarket,
    waxpeer,
  ]
}

