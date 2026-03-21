"use client"

import { useEffect, useMemo, useState, type CSSProperties } from "react"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"

import {
  applyMarketCatalogFilters,
  applyPriceBandIfPresent,
  type CatalogItemForFilter,
} from "@/components/filters/apply-market-catalog-filters"
import { ActiveFilterTags } from "@/components/filters/ActiveFilterTags"
import { FilterSidebar } from "@/components/filters/FilterSidebar"
import { MarketFilterEmptyState } from "@/components/filters/MarketFilterEmptyState"
import { totalActiveFilters } from "@/components/filters/market-filter-counts"
import { removeFilterTag } from "@/components/filters/market-filter-tag-actions"
import type { MarketFiltersState } from "@/components/filters/market-filter-types"
import { DEFAULT_MARKET_FILTERS } from "@/components/filters/market-filter-types"
import type { WearCode } from "@/components/filters/market-filter-constants"
import { AuthLink } from "@/components/auth-link"
import { MARKET_CARD_MIN_WIDTH_PX } from "@/components/market/market-card-constants"
import { MarketItemCard, type MarketCatalogItem } from "@/components/market/market-item-card"
import { MarketItemCardSkeleton } from "@/components/market/market-item-card-skeleton"

type CatalogItem = CatalogItemForFilter

function uniq(values: (string | undefined)[]) {
  return Array.from(new Set(values.filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b))
}

function setOrDelete(params: URLSearchParams, key: string, value: string) {
  if (!value || value === "all") params.delete(key)
  else params.set(key, value)
}

function parseMultiParam(value: string | null): string[] {
  if (!value) return []
  return Array.from(
    new Set(
      value
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
    )
  )
}

function parseWearParam(value: string | null): WearCode[] {
  if (!value) return []
  const allowed: WearCode[] = ["FN", "MW", "FT", "WW", "BS"]
  const list = value
    .split(",")
    .map((x) => x.trim().toUpperCase())
    .filter((x): x is WearCode => allowed.includes(x as WearCode))
  return Array.from(new Set(list))
}

function parseFloatParam(value: string | null): number | null {
  if (value === null || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function filtersFromSearchParams(params: URLSearchParams): MarketFiltersState {
  const f: MarketFiltersState = { ...DEFAULT_MARKET_FILTERS }

  f.keyword = params.get("q") ?? ""
  f.categories = parseMultiParam(params.get("types") ?? params.get("type"))
  f.weapons = parseMultiParam(params.get("weapons") ?? params.get("weapon"))
  f.rarities = parseMultiParam(params.get("rarities") ?? params.get("rarity"))
  f.wear = parseWearParam(params.get("exteriors"))

  const st = params.get("stattrak")
  if (st === "only") {
    f.statTrak = true
    f.souvenir = false
  } else if (st === "exclude") {
    f.statTrak = false
    f.souvenir = false
  }
  if (params.get("souvenir") === "1") {
    f.souvenir = true
    f.statTrak = false
  }

  const lo = parseFloatParam(params.get("floatMin"))
  const hi = parseFloatParam(params.get("floatMax"))
  if (f.wear.length > 0) {
    f.floatMin = lo
    f.floatMax = hi
  }

  f.priceMin = params.get("priceMin") ?? ""
  f.priceMax = params.get("priceMax") ?? ""
  if (params.get("marketItems") === "1") f.marketItemsOnly = true
  const prov = params.get("provider")
  if (prov) f.priceProvider = prov

  const sort = params.get("sort")
  if (
    sort === "price_asc" ||
    sort === "price_desc" ||
    sort === "float_asc" ||
    sort === "newest" ||
    sort === "name_asc" ||
    sort === "rarity_desc" ||
    sort === "weapon_asc"
  ) {
    f.sortBy = sort
  }

  const per = params.get("perPage")
  if (per === "24" || per === "48" || per === "96") f.itemsPerPage = Number(per) as 24 | 48 | 96

  if (params.get("highTier") === "1") {
    f.rarities = Array.from(new Set([...f.rarities, "Contraband", "Covert", "Classified"]))
  }

  return f
}

export default function MarketPage() {
  const [items, setItems] = useState<CatalogItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<MarketFiltersState>(DEFAULT_MARKET_FILTERS)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [shown, setShown] = useState<number>(DEFAULT_MARKET_FILTERS.itemsPerPage)
  const [recentIds, setRecentIds] = useState<string[]>([])
  const [isFiltering, setIsFiltering] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    function syncFromLocation() {
      const params = new URLSearchParams(window.location.search)
      setFilters(filtersFromSearchParams(params))
    }

    syncFromLocation()
    window.addEventListener("popstate", syncFromLocation)
    return () => window.removeEventListener("popstate", syncFromLocation)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const t = setTimeout(() => {
      const params = new URLSearchParams(window.location.search)
      setOrDelete(params, "q", filters.keyword.trim())
      if (filters.categories.length) params.set("types", filters.categories.join(","))
      else params.delete("types")
      params.delete("type")
      if (filters.weapons.length) params.set("weapons", filters.weapons.join(","))
      else params.delete("weapons")
      params.delete("weapon")
      if (filters.rarities.length) params.set("rarities", filters.rarities.join(","))
      else params.delete("rarities")
      params.delete("rarity")
      if (filters.wear.length) params.set("exteriors", filters.wear.join(","))
      else params.delete("exteriors")
      if (filters.statTrak) params.set("stattrak", "only")
      else if (filters.souvenir) {
        params.delete("stattrak")
        params.set("souvenir", "1")
      } else {
        params.delete("stattrak")
        params.delete("souvenir")
      }
      if (filters.floatMin !== null) params.set("floatMin", String(filters.floatMin))
      else params.delete("floatMin")
      if (filters.floatMax !== null) params.set("floatMax", String(filters.floatMax))
      else params.delete("floatMax")
      setOrDelete(params, "priceMin", filters.priceMin.trim())
      setOrDelete(params, "priceMax", filters.priceMax.trim())
      if (filters.marketItemsOnly) params.set("marketItems", "1")
      else params.delete("marketItems")
      if (filters.priceProvider !== DEFAULT_MARKET_FILTERS.priceProvider) params.set("provider", filters.priceProvider)
      else params.delete("provider")
      setOrDelete(params, "sort", filters.sortBy)
      params.set("perPage", String(filters.itemsPerPage))
      const next = params.toString()
      const nextUrl = next ? `/market?${next}` : "/market"
      window.history.replaceState(null, "", nextUrl)
    }, 150)
    return () => clearTimeout(t)
  }, [filters])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError(null)
      try {
        const res = await fetch("/api/catalog")
        const json = (await res.json()) as { items?: CatalogItem[]; error?: string }
        if (!res.ok || !json.items) throw new Error(json.error || "catalog_failed")
        if (!cancelled) setItems(json.items)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "catalog_failed")
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = window.localStorage.getItem("grail.recentMarket.v1")
      const ids = raw ? (JSON.parse(raw) as string[]) : []
      setRecentIds(Array.isArray(ids) ? ids : [])
    } catch {
      setRecentIds([])
    }
  }, [items])

  const raritiesCatalog = useMemo(() => uniq(items?.map((i) => i.rarityName) ?? []), [items])

  const availableWeapons = useMemo(() => {
    const raw = items?.map((i) => i.weaponName).filter(Boolean) as string[]
    return uniq(raw ?? [])
  }, [items])

  const filtered = useMemo(() => {
    const base = items ?? []
    const a = applyMarketCatalogFilters(base, filters)
    return applyPriceBandIfPresent(a, filters)
  }, [items, filters])

  useEffect(() => {
    setShown(filters.itemsPerPage)
  }, [filters])

  useEffect(() => {
    if (!items) return
    setIsFiltering(true)
    const timer = window.setTimeout(() => setIsFiltering(false), 300)
    return () => clearTimeout(timer)
  }, [items, filters])

  function clearAllFilters() {
    setFilters(DEFAULT_MARKET_FILTERS)
    setShown(DEFAULT_MARKET_FILTERS.itemsPerPage)
  }

  const resultCount = filtered.length
  const activeTotal = totalActiveFilters(filters)

  const gridClass =
    filters.viewMode === "list" ? "flex flex-col gap-2" : "grid items-stretch gap-[0.575rem]"
  const gridStyle: CSSProperties | undefined =
    filters.viewMode === "list"
      ? undefined
      : {
          gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${MARKET_CARD_MIN_WIDTH_PX}px), 1fr))`,
        }

  return (
    <main className="min-h-screen w-full min-w-0 bg-background px-10 py-8 text-foreground">
      <div className="w-full space-y-5">
        <header className="flex flex-col gap-4 border-b border-border/60 bg-background/95 py-2 md:flex-row md:items-end md:justify-between lg:sticky lg:top-14 lg:z-40 supports-[backdrop-filter]:bg-background/80">
          <div>
            <h1 className="font-mono text-2xl font-bold tracking-tight">Market</h1>
            <p className="text-xs text-text-secondary">Browse skins · Search fast · Route into Watchlist or Trades</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AuthLink
              href="/watchlist"
              variant="outline"
              loginText="Login to open Watchlist"
              className="font-mono text-xs tracking-wide"
            >
              Watchlist
            </AuthLink>
            <AuthLink href="/trade-links" variant="ghost" loginText="Login to open Trade Links" className="font-mono text-xs tracking-wide">
              Trade Links
            </AuthLink>
          </div>
        </header>

        {/* items-stretch: left column must span full row height or `position: sticky` on the filter has no tall scroll range */}
        <section className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-stretch">
          <FilterSidebar
            filters={filters}
            onFiltersChange={setFilters}
            availableRarities={raritiesCatalog}
            availableWeapons={availableWeapons}
            resultCount={resultCount}
            sheetOpen={sheetOpen}
            onSheetOpenChange={setSheetOpen}
          />

          <section className="min-w-0 space-y-2">
            <div className="lg:hidden">
              <Button type="button" variant="outline" className="w-full font-mono text-xs" onClick={() => setSheetOpen(true)}>
                Filters
              </Button>
            </div>

            {activeTotal > 0 ? (
              <ActiveFilterTags
                filters={filters}
                onRemoveTag={(id) => setFilters((prev) => removeFilterTag(prev, id))}
                onClearAll={clearAllFilters}
              />
            ) : null}

            {items && isFiltering && (
              <Card className="border-border/80 bg-surface/70 dark:bg-[radial-gradient(ellipse_120%_90%_at_50%_0%,#1a1a1a_0%,#0f0f0f_64%)]">
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="relative size-4 shrink-0">
                    <span className="absolute inset-0 animate-spin rounded-full border border-info/35 border-t-info" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[12px] uppercase tracking-wide text-info">Searching market...</p>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-none bg-background/70">
                      <div className="h-full w-1/3 animate-[pulse_1.1s_ease-in-out_infinite] bg-info/60" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {error && (
              <Card className="border-destructive/40">
                <CardContent className="py-6 text-sm text-destructive">Failed to load catalog: {error}</CardContent>
              </Card>
            )}

            {!error && !items && (
              <section className={gridClass} style={gridStyle}>
                {Array.from({ length: 12 }).map((_, idx) => (
                  <MarketItemCardSkeleton key={idx} />
                ))}
              </section>
            )}

            {items && !isFiltering && filtered.length === 0 && (
              <MarketFilterEmptyState onClearAll={clearAllFilters} />
            )}

            {items && !isFiltering && filtered.length > 0 && (
              <section className={gridClass} style={gridStyle}>
                {filtered.slice(0, shown).map((i) => (
                  <MarketItemCard key={i.id} item={i as unknown as MarketCatalogItem} />
                ))}
              </section>
            )}

            {items && isFiltering && (
              <section className={gridClass} style={gridStyle}>
                {Array.from({ length: 10 }).map((_, idx) => (
                  <MarketItemCardSkeleton key={`filter_skeleton_${idx}`} />
                ))}
              </section>
            )}

            {items && !isFiltering && filtered.length > shown && (
              <div className="flex items-center justify-center pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="font-mono text-xs tracking-wide"
                  onClick={() => setShown((n) => n + filters.itemsPerPage)}
                >
                  Load more ({Math.min(shown + filters.itemsPerPage, filtered.length).toLocaleString()} /{" "}
                  {filtered.length.toLocaleString()})
                </Button>
              </div>
            )}
          </section>
        </section>

        {items && recentIds.length > 0 && (
          <section className="space-y-3 pt-2">
            <h2 className="font-mono text-xs font-bold tracking-widest text-text-secondary">Recent views</h2>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {recentIds
                .map((id) => items.find((x) => x.id === id))
                .filter(Boolean)
                .slice(0, 8)
                .map((i) => {
                  const item = i as CatalogItem
                  return (
                    <div
                      key={`recent_${item.id}`}
                      className="flex h-full shrink-0"
                      style={{ width: MARKET_CARD_MIN_WIDTH_PX, minWidth: MARKET_CARD_MIN_WIDTH_PX }}
                    >
                      <MarketItemCard item={item as unknown as MarketCatalogItem} />
                    </div>
                  )
                })}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
