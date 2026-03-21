import type { MarketFiltersState } from "./market-filter-types"
import { PRICE_PROVIDER_TO_MARKET } from "./market-filter-constants"
import { norm, rangesOverlap, unionWearFloatBounds, weaponCategoryFromWeaponName } from "./market-filter-utils"

const RARITY_SORT: Record<string, number> = {
  Contraband: 0,
  Covert: 1,
  Classified: 2,
  Restricted: 3,
  "Mil-Spec Grade": 4,
  Industrial: 5,
  Consumer: 6,
}

export type CatalogItemForFilter = {
  id: string
  name: string
  weaponName?: string
  rarityName?: string
  floatMin?: number
  floatMax?: number
  exteriors: Array<"FN" | "MW" | "FT" | "WW" | "BS">
  hasStatTrak: boolean
  /** Steam or primary reference when only one market is attached */
  referencePrice?: number
  /** USD prices keyed by `market_price_snapshots.market` (e.g. steam, buff163) */
  marketPrices?: Record<string, number>
}

function parseMoney(s: string): number | null {
  const t = s.trim().replace(/[^0-9.-]/g, "")
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

function pickPriceUsd(item: CatalogItemForFilter, provider: string): number | undefined {
  const key = PRICE_PROVIDER_TO_MARKET[provider as keyof typeof PRICE_PROVIDER_TO_MARKET] ?? "steam"
  const mp = item.marketPrices
  if (mp && typeof mp[key] === "number" && Number.isFinite(mp[key])) return mp[key]
  if (typeof item.referencePrice === "number" && Number.isFinite(item.referencePrice)) return item.referencePrice
  return undefined
}

function keywordHaystack(item: CatalogItemForFilter): string {
  const parts = [item.name, item.weaponName ?? "", item.rarityName ?? "", item.id]
  return norm(parts.filter(Boolean).join(" "))
}

function passesSteamIdFilter(_item: CatalogItemForFilter, steamId: string): boolean {
  if (!steamId.trim()) return true
  // Listing owner not available on static catalog — keep all until feed supports it.
  return true
}

export function applyMarketCatalogFilters(
  items: CatalogItemForFilter[],
  f: MarketFiltersState
): CatalogItemForFilter[] {
  const q = norm(f.keyword)

  const out = items.filter((i) => {
    if (q && !keywordHaystack(i).includes(q)) return false

    if (f.categories.length > 0) {
      const cat = weaponCategoryFromWeaponName(i.weaponName)
      if (!f.categories.includes(cat)) return false
    }

    if (f.weapons.length > 0 && !f.weapons.includes(i.weaponName ?? "")) return false

    if (f.statTrak && !i.hasStatTrak) return false
    if (f.souvenir && !norm(i.name).includes("souvenir")) return false

    if (f.rarities.length > 0 && !f.rarities.includes(i.rarityName ?? "")) return false

    if (f.wear.length > 0) {
      const ok = f.wear.some((w) => i.exteriors?.includes(w))
      if (!ok) return false
      const u = unionWearFloatBounds(f.wear)
      const lo = f.floatMin ?? u.min
      const hi = f.floatMax ?? u.max
      if (!rangesOverlap(i.floatMin, i.floatMax, lo, hi)) return false
    }

    for (const col of f.collections) {
      if (!norm(i.name).includes(norm(col))) return false
    }
    for (const c of f.cases) {
      if (!norm(i.name).includes(norm(c))) return false
    }

    if (f.paintSeed.trim()) {
      const n = norm(i.name)
      const seed = norm(f.paintSeed)
      if (!n.includes(seed)) return false
    }
    if (f.dopplerPhases.length > 0) {
      const n = norm(i.name)
      const ok = f.dopplerPhases.some((p) => n.includes(norm(p)))
      if (!ok) return false
    }

    if (f.stickers.length > 0) {
      const n = norm(i.name)
      for (const s of f.stickers) {
        if (!n.includes(norm(s))) return false
      }
    }

    if (f.charm.trim() && !norm(i.name).includes(norm(f.charm))) return false

    if (f.marketItemsOnly) {
      const p = pickPriceUsd(i, f.priceProvider)
      if (p === undefined) return false
    }

    if (!passesSteamIdFilter(i, f.steamId)) return false

    return true
  })

  const sorted = [...out].sort((a, b) => {
    if (f.sortBy === "name_asc") return a.name.localeCompare(b.name)
    if (f.sortBy === "float_asc") {
      const fa = typeof a.floatMin === "number" ? a.floatMin : 999
      const fb = typeof b.floatMin === "number" ? b.floatMin : 999
      if (fa !== fb) return fa - fb
      return a.name.localeCompare(b.name)
    }
    if (f.sortBy === "newest") return b.id.localeCompare(a.id)
    if (f.sortBy === "rarity_desc") {
      const ra = RARITY_SORT[a.rarityName ?? ""] ?? 999
      const rb = RARITY_SORT[b.rarityName ?? ""] ?? 999
      if (ra !== rb) return ra - rb
      return a.name.localeCompare(b.name)
    }
    if (f.sortBy === "weapon_asc") {
      return (a.weaponName ?? "").localeCompare(b.weaponName ?? "")
    }
    if (f.sortBy === "price_asc" || f.sortBy === "price_desc") {
      const pa = pickPriceUsd(a, f.priceProvider)
      const pb = pickPriceUsd(b, f.priceProvider)
      const aMissing = pa === undefined
      const bMissing = pb === undefined
      if (aMissing && bMissing) return a.name.localeCompare(b.name)
      if (aMissing) return 1
      if (bMissing) return -1
      if (pa !== pb) return f.sortBy === "price_asc" ? pa - pb : pb - pa
      return a.name.localeCompare(b.name)
    }
    return a.name.localeCompare(b.name)
  })

  return sorted
}

/** Client-side price band using merged snapshot prices when present. */
export function applyPriceBandIfPresent<T extends CatalogItemForFilter>(items: T[], f: MarketFiltersState): T[] {
  const lo = parseMoney(f.priceMin)
  const hi = parseMoney(f.priceMax)
  if (lo === null && hi === null) return items
  return items.filter((i) => {
    const p = pickPriceUsd(i, f.priceProvider)
    if (p === undefined) return false
    if (lo !== null && p < lo) return false
    if (hi !== null && p > hi) return false
    return true
  })
}
