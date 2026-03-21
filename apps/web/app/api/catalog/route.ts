import { NextResponse } from "next/server"
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase/database.types"

type RemoteSkin = {
  id?: string
  name: string
  description?: string
  weapon?: { id?: string; name?: string }
  category?: { id?: string; name?: string }
  min_float?: number | null
  max_float?: number | null
  rarity?: { id?: string; name?: string; color?: string }
  stattrak?: boolean | null
  image?: string
}

export type CatalogItem = {
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
  /** Primary Steam USD quote when merged from snapshots */
  referencePrice?: number
  /** Latest USD per market key (steam, buff163, …) from `market_price_snapshots` */
  marketPrices?: Record<string, number>
}

const REMOTE_DATASETS: Array<{ url: string; fallbackType: string }> = [
  { url: "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json", fallbackType: "Weapon Skin" },
  { url: "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/stickers.json", fallbackType: "Sticker" },
  { url: "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/agents.json", fallbackType: "Agent" },
  { url: "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/containers.json", fallbackType: "Container" },
  { url: "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/patches.json", fallbackType: "Patch" },
  { url: "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/charms.json", fallbackType: "Charm" },
]
const ALL_EXTERIORS = ["FN", "MW", "FT", "WW", "BS"] as const
const RARITY_NAME_BY_DB_VALUE: Record<string, string> = {
  consumer: "Consumer",
  industrial: "Industrial",
  milspec: "Mil-Spec Grade",
  restricted: "Restricted",
  classified: "Classified",
  covert: "Covert",
  gold: "Contraband",
}
const RARITY_COLOR_BY_DB_VALUE: Record<string, string> = {
  consumer: "#b0c3d9",
  industrial: "#5e98d9",
  milspec: "#4b69ff",
  restricted: "#8847ff",
  classified: "#d32ce6",
  covert: "#eb4b4b",
  gold: "#ffd700",
}
const UNKNOWN_LABELS = new Set(["unknown", "n/a", "na", "-", "none"])

type DbItemRow = {
  name: string
  weapon_type: string | null
  rarity: string | null
  image_url: string | null
}

function exteriorsFromFloatRange(min: number, max: number): Array<"FN" | "MW" | "FT" | "WW" | "BS"> {
  // CS2 float wear tiers:
  // FN: [0.00, 0.07]
  // MW: (0.07, 0.15]
  // FT: (0.15, 0.38]
  // WW: (0.38, 0.45]
  // BS: (0.45, 1.00]
  const tiers: Array<["FN" | "MW" | "FT" | "WW" | "BS", number, number]> = [
    ["FN", 0.0, 0.07],
    ["MW", 0.07, 0.15],
    ["FT", 0.15, 0.38],
    ["WW", 0.38, 0.45],
    ["BS", 0.45, 1.0],
  ]

  const out: Array<"FN" | "MW" | "FT" | "WW" | "BS"> = []
  for (const [label, a, b] of tiers) {
    // Overlap test for [min,max] with (a,b] style tiers; close enough for availability.
    const overlaps = max > a && min <= b
    if (overlaps) out.push(label)
  }
  return out
}

function cleanLabel(value?: string | null) {
  if (!value) return undefined
  const v = value.trim()
  if (!v) return undefined
  if (UNKNOWN_LABELS.has(v.toLowerCase())) return undefined
  return v
}

function normalizeDbItem(row: DbItemRow): CatalogItem {
  const rarityKey = (row.rarity ?? "").toLowerCase()
  const rarityName = RARITY_NAME_BY_DB_VALUE[rarityKey]
  return {
    id: row.name,
    name: row.name,
    weaponName: cleanLabel(row.weapon_type),
    rarityName,
    rarityId: rarityKey || undefined,
    rarityColor: RARITY_COLOR_BY_DB_VALUE[rarityKey],
    imageUrl: row.image_url ?? undefined,
    exteriors: [...ALL_EXTERIORS],
    hasStatTrak: /stattrak/i.test(row.name),
  }
}

const PRICE_BATCH = 120
const PRICE_BATCH_CONCURRENCY = 4

const EXTERIOR_SUFFIXES = [
  " (Factory New)",
  " (Minimal Wear)",
  " (Field-Tested)",
  " (Well-Worn)",
  " (Battle-Scarred)",
]

/** Strip exterior suffix from market_hash_name to get base item name. */
function baseNameFromMarketHash(marketHash: string): string {
  for (const suffix of EXTERIOR_SUFFIXES) {
    if (marketHash.endsWith(suffix)) return marketHash.slice(0, -suffix.length)
  }
  return marketHash
}

async function attachMarketPricesFromSnapshots(
  supabase: SupabaseClient<Database>,
  items: CatalogItem[]
): Promise<CatalogItem[]> {
  const names = [...new Set(items.map((i) => i.name))].filter(Boolean)
  if (names.length === 0) return items

  const marketPricesByItem = new Map<string, Record<string, number>>()

  /** Build item_name list: base + base (Exterior) for each. Price Empire uses market_hash_name like "X (Field-Tested)". */
  const itemNamesToQuery = new Set<string>()
  for (const n of names) {
    itemNamesToQuery.add(n)
    for (const suffix of EXTERIOR_SUFFIXES) {
      itemNamesToQuery.add(n + suffix)
    }
  }
  const allNames = [...itemNamesToQuery]

  async function runBatch(batch: string[]) {
    const { data, error } = await supabase
      .from("market_price_snapshots")
      .select("item_name, market, price, fetched_at")
      .eq("currency", "USD")
      .in("item_name", batch)
      .order("fetched_at", { ascending: false })

    if (error || !data) return

    for (const row of data) {
      const baseName = baseNameFromMarketHash(row.item_name)
      const m = row.market
      const p = typeof row.price === "number" ? row.price : row.price == null ? null : Number(row.price)
      if (p === null || !Number.isFinite(p)) continue
      let rec = marketPricesByItem.get(baseName)
      if (!rec) {
        rec = {}
        marketPricesByItem.set(baseName, rec)
      }
      if (rec[m] === undefined) rec[m] = p
    }
  }

  const chunks: string[][] = []
  for (let i = 0; i < allNames.length; i += PRICE_BATCH) {
    chunks.push(allNames.slice(i, i + PRICE_BATCH))
  }

  for (let i = 0; i < chunks.length; i += PRICE_BATCH_CONCURRENCY) {
    const slice = chunks.slice(i, i + PRICE_BATCH_CONCURRENCY)
    await Promise.all(slice.map((batch) => runBatch(batch)))
  }

  return items.map((item) => {
    const mp = marketPricesByItem.get(item.name)
    if (!mp || Object.keys(mp).length === 0) return item
    const referencePrice = mp.steam ?? mp.buff163
    return {
      ...item,
      ...(typeof referencePrice === "number" ? { referencePrice } : {}),
      marketPrices: mp,
    }
  })
}

async function loadItemsFromSupabase(): Promise<CatalogItem[] | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null

  const supabase = createSupabaseClient<Database>(url, anonKey)
  const { data, error } = await supabase
    .from("items")
    .select("name, weapon_type, rarity, image_url")
    .order("name", { ascending: true })
    .limit(50000)

  if (error || !data || data.length === 0) return null
  const base = data.map((row) => normalizeDbItem(row as DbItemRow))
  try {
    return await attachMarketPricesFromSnapshots(supabase, base)
  } catch {
    return base
  }
}

function mapRemoteItem(raw: RemoteSkin, fallbackType: string): CatalogItem | null {
  if (typeof raw?.name !== "string" || raw.name.length === 0) return null
  const id = raw.id ?? raw.name
  const floatMin = typeof raw.min_float === "number" ? raw.min_float : undefined
  const floatMax = typeof raw.max_float === "number" ? raw.max_float : undefined
  const exteriors =
    typeof floatMin === "number" && typeof floatMax === "number"
      ? exteriorsFromFloatRange(floatMin, floatMax)
      : [...ALL_EXTERIORS]

  return {
    id,
    name: raw.name,
    weaponName: cleanLabel(raw.weapon?.name ?? raw.category?.name ?? fallbackType),
    rarityName: cleanLabel(raw.rarity?.name),
    rarityId: raw.rarity?.id,
    rarityColor: raw.rarity?.color,
    imageUrl: raw.image,
    floatMin,
    floatMax,
    exteriors,
    hasStatTrak: Boolean(raw.stattrak) || /stattrak/i.test(raw.name),
  }
}

async function loadItemsFromRemote(): Promise<CatalogItem[]> {
  const responses = await Promise.all(
    REMOTE_DATASETS.map(async (dataset) => {
      const res = await fetch(dataset.url, { next: { revalidate: 60 * 60 } })
      if (!res.ok) return []
      const data = (await res.json()) as RemoteSkin[]
      return data
        .map((raw) => mapRemoteItem(raw, dataset.fallbackType))
        .filter((item): item is CatalogItem => Boolean(item))
    })
  )

  // De-dupe by id/name across datasets.
  const byId = new Map<string, CatalogItem>()
  for (const list of responses) {
    for (const item of list) {
      if (!byId.has(item.id)) byId.set(item.id, item)
    }
  }
  return Array.from(byId.values())
}

export async function GET() {
  const dbItems = await loadItemsFromSupabase()
  if (dbItems && dbItems.length > 0) {
    return NextResponse.json({ items: dbItems, source: "supabase" })
  }

  const items = await loadItemsFromRemote()
  if (items.length === 0) {
    return NextResponse.json({ error: "catalog_fetch_failed" }, { status: 502 })
  }

  return NextResponse.json({ items, source: "remote" })
}

