import type { MarketFiltersState } from "./market-filter-types"
import { DEFAULT_MARKET_FILTERS } from "./market-filter-types"
import type { FilterGroupId } from "./market-filter-utils"

function differs<T>(a: T, b: T) {
  return JSON.stringify(a) !== JSON.stringify(b)
}

export function countActiveInGroup(group: FilterGroupId, f: MarketFiltersState): number {
  const d = DEFAULT_MARKET_FILTERS
  switch (group) {
    case "search":
      let n = 0
      if (f.keyword.trim()) n++
      if (f.sortBy !== d.sortBy) n++
      if (f.itemsPerPage !== d.itemsPerPage) n++
      if (f.groupItems !== d.groupItems) n++
      return n
    case "itemType": {
      let c = f.categories.length + f.weapons.length
      if (f.statTrak) c++
      if (f.souvenir) c++
      return c
    }
    case "price": {
      let c = 0
      if (f.priceMin.trim()) c++
      if (f.priceMax.trim()) c++
      if (f.priceProvider !== d.priceProvider) c++
      if (f.marketItemsOnly) c++
      return c
    }
    case "condition": {
      let c = f.wear.length
      if (f.floatMin !== null || f.floatMax !== null) c++
      return c
    }
    case "rarity":
      return f.rarities.length + f.collections.length + f.cases.length
    case "sticker": {
      let c = f.stickers.length + f.stickerSlots.length
      if (f.stickerExactMatch) c++
      if (f.charm.trim()) c++
      if (f.charmPatternMin.trim() || f.charmPatternMax.trim()) c++
      return c
    }
    case "pattern": {
      let c = f.dopplerPhases.length
      if (f.paintSeed.trim()) c++
      if (f.rankGlobalLow.trim() || f.rankGlobalHigh.trim()) c++
      if (f.rankItemLow.trim() || f.rankItemHigh.trim()) c++
      if (f.rankedOnly) c++
      return c
    }
    case "utility": {
      let c = 0
      if (f.steamId.trim()) c++
      if (f.excludeOwned) c++
      if (f.viewMode !== d.viewMode) c++
      return c
    }
    default:
      return 0
  }
}

export function totalActiveFilters(f: MarketFiltersState): number {
  const groups: FilterGroupId[] = [
    "search",
    "itemType",
    "price",
    "condition",
    "rarity",
    "sticker",
    "pattern",
    "utility",
  ]
  return groups.reduce((acc, g) => acc + countActiveInGroup(g, f), 0)
}

export function isDirty(f: MarketFiltersState): boolean {
  return differs(f, DEFAULT_MARKET_FILTERS)
}

export function resetGroup(group: FilterGroupId, f: MarketFiltersState): MarketFiltersState {
  const d = DEFAULT_MARKET_FILTERS
  switch (group) {
    case "search":
      return {
        ...f,
        keyword: d.keyword,
        sortBy: d.sortBy,
        itemsPerPage: d.itemsPerPage,
        groupItems: d.groupItems,
      }
    case "itemType":
      return {
        ...f,
        categories: d.categories,
        weapons: d.weapons,
        statTrak: d.statTrak,
        souvenir: d.souvenir,
      }
    case "price":
      return {
        ...f,
        priceMin: d.priceMin,
        priceMax: d.priceMax,
        priceProvider: d.priceProvider,
        marketItemsOnly: d.marketItemsOnly,
      }
    case "condition":
      return {
        ...f,
        wear: d.wear,
        floatMin: d.floatMin,
        floatMax: d.floatMax,
      }
    case "rarity":
      return { ...f, rarities: d.rarities, collections: d.collections, cases: d.cases }
    case "sticker":
      return {
        ...f,
        stickers: d.stickers,
        stickerSlots: d.stickerSlots,
        stickerExactMatch: d.stickerExactMatch,
        charm: d.charm,
        charmPatternMin: d.charmPatternMin,
        charmPatternMax: d.charmPatternMax,
      }
    case "pattern":
      return {
        ...f,
        paintSeed: d.paintSeed,
        dopplerPhases: d.dopplerPhases,
        rankGlobalLow: d.rankGlobalLow,
        rankGlobalHigh: d.rankGlobalHigh,
        rankItemLow: d.rankItemLow,
        rankItemHigh: d.rankItemHigh,
        rankedOnly: d.rankedOnly,
      }
    case "utility":
      return {
        ...f,
        steamId: d.steamId,
        excludeOwned: d.excludeOwned,
        viewMode: d.viewMode,
      }
    default:
      return f
  }
}
