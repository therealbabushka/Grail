import type { SortByValue } from "./market-filter-constants"
import type { WearCode } from "./market-filter-constants"

export type MarketFiltersState = {
  keyword: string
  sortBy: SortByValue
  itemsPerPage: 24 | 48 | 96
  groupItems: boolean

  categories: string[]
  weapons: string[]
  statTrak: boolean
  souvenir: boolean

  priceMin: string
  priceMax: string
  priceProvider: string
  marketItemsOnly: boolean

  wear: WearCode[]
  floatMin: number | null
  floatMax: number | null

  rarities: string[]
  collections: string[]
  cases: string[]

  stickers: string[]
  stickerSlots: number[]
  stickerExactMatch: boolean
  charm: string
  charmPatternMin: string
  charmPatternMax: string

  paintSeed: string
  dopplerPhases: string[]
  rankGlobalLow: string
  rankGlobalHigh: string
  rankItemLow: string
  rankItemHigh: string
  rankedOnly: boolean

  steamId: string
  excludeOwned: boolean
  viewMode: "grid" | "list"
}

export const DEFAULT_MARKET_FILTERS: MarketFiltersState = {
  keyword: "",
  sortBy: "name_asc",
  itemsPerPage: 48,
  groupItems: false,

  categories: [],
  weapons: [],
  statTrak: false,
  souvenir: false,

  priceMin: "",
  priceMax: "",
  priceProvider: "Steam",
  marketItemsOnly: false,

  wear: [],
  floatMin: null,
  floatMax: null,

  rarities: [],
  collections: [],
  cases: [],

  stickers: [],
  stickerSlots: [],
  stickerExactMatch: false,
  charm: "",
  charmPatternMin: "",
  charmPatternMax: "",

  paintSeed: "",
  dopplerPhases: [],
  rankGlobalLow: "",
  rankGlobalHigh: "",
  rankItemLow: "",
  rankItemHigh: "",
  rankedOnly: false,

  steamId: "",
  excludeOwned: false,
  viewMode: "grid",
}
