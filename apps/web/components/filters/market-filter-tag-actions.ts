import type { MarketFiltersState } from "./market-filter-types"
import { DEFAULT_MARKET_FILTERS } from "./market-filter-types"
import { unionWearFloatBounds } from "./market-filter-utils"

/** Apply removal of a single active-filter tag id produced by `buildTags`. */
export function removeFilterTag(f: MarketFiltersState, tagId: string): MarketFiltersState {
  const d = DEFAULT_MARKET_FILTERS

  if (tagId === "keyword") return { ...f, keyword: d.keyword }
  if (tagId === "sort") return { ...f, sortBy: d.sortBy }
  if (tagId === "perPage") return { ...f, itemsPerPage: d.itemsPerPage }
  if (tagId === "group") return { ...f, groupItems: d.groupItems }

  if (tagId.startsWith("cat:")) {
    const cat = decodeURIComponent(tagId.slice(4))
    return { ...f, categories: f.categories.filter((c) => c !== cat) }
  }
  if (tagId.startsWith("weapon:")) {
    const w = decodeURIComponent(tagId.slice(7))
    return { ...f, weapons: f.weapons.filter((x) => x !== w) }
  }
  if (tagId === "st") return { ...f, statTrak: false }
  if (tagId === "sv") return { ...f, souvenir: false }

  if (tagId === "price") return { ...f, priceMin: d.priceMin, priceMax: d.priceMax }
  if (tagId === "prov") return { ...f, priceProvider: d.priceProvider }
  if (tagId === "mkt") return { ...f, marketItemsOnly: false }

  if (tagId === "wear:group") return { ...f, wear: d.wear, floatMin: d.floatMin, floatMax: d.floatMax }
  if (tagId.startsWith("wear:") && tagId !== "wear:group") {
    const code = tagId.slice(5)
    const nextWear = f.wear.filter((x) => x !== code)
    if (!nextWear.length) return { ...f, wear: [], floatMin: null, floatMax: null }
    const u = unionWearFloatBounds(nextWear)
    return { ...f, wear: nextWear, floatMin: u.min, floatMax: u.max }
  }
  if (tagId === "float") {
    const u = unionWearFloatBounds(f.wear)
    return { ...f, floatMin: u.min, floatMax: u.max }
  }

  if (tagId.startsWith("rarity:")) {
    const r = decodeURIComponent(tagId.slice(7))
    return { ...f, rarities: f.rarities.filter((x) => x !== r) }
  }
  if (tagId.startsWith("collection:")) {
    const c = decodeURIComponent(tagId.slice(11))
    return { ...f, collections: f.collections.filter((x) => x !== c) }
  }
  if (tagId.startsWith("case:")) {
    const c = decodeURIComponent(tagId.slice(5))
    return { ...f, cases: f.cases.filter((x) => x !== c) }
  }

  if (tagId.startsWith("sticker:")) {
    const s = decodeURIComponent(tagId.slice(8))
    return { ...f, stickers: f.stickers.filter((x) => x !== s) }
  }
  if (tagId === "charm") return { ...f, charm: d.charm, charmPatternMin: d.charmPatternMin, charmPatternMax: d.charmPatternMax }

  if (tagId.startsWith("phase:")) {
    const p = decodeURIComponent(tagId.slice(6))
    return { ...f, dopplerPhases: f.dopplerPhases.filter((x) => x !== p) }
  }
  if (tagId === "seed") return { ...f, paintSeed: d.paintSeed }

  if (tagId === "steam") return { ...f, steamId: d.steamId }

  return f
}
