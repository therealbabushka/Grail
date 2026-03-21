/** Wear condition bands (float ranges) — see cs2-marketplace-filter-ia.md */
export const WEAR_BANDS = {
  FN: { label: "FN", full: "Factory New", min: 0, max: 0.07 },
  MW: { label: "MW", full: "Minimal Wear", min: 0.07, max: 0.15 },
  FT: { label: "FT", full: "Field-Tested", min: 0.15, max: 0.38 },
  WW: { label: "WW", full: "Well-Worn", min: 0.38, max: 0.45 },
  BS: { label: "BS", full: "Battle-Scarred", min: 0.45, max: 1 },
} as const

export type WearCode = keyof typeof WEAR_BANDS

export const WEAR_ORDER: WearCode[] = ["FN", "MW", "FT", "WW", "BS"]

/** Category grid — IA § Item Type */
export const CATEGORY_OPTIONS = [
  { id: "Rifle", label: "Rifles" },
  { id: "Pistol", label: "Pistols" },
  { id: "SMG", label: "SMGs" },
  { id: "Sniper", label: "Snipers" },
  { id: "Heavy", label: "Heavy" },
  { id: "Knife", label: "Knives" },
  { id: "Gloves", label: "Gloves" },
  { id: "Agent", label: "Agents" },
  { id: "Other", label: "Other" },
] as const

export type CategoryId = (typeof CATEGORY_OPTIONS)[number]["id"]

/** Rarity tier — IA § Rarity & Origin (colour mapping for chips) */
export const RARITY_TIERS = [
  { id: "Consumer", label: "Consumer", chipClass: "bg-zinc-200 text-zinc-900 border-zinc-400/50 dark:bg-zinc-600 dark:text-zinc-50" },
  { id: "Mil-Spec Grade", label: "Mil-Spec", chipClass: "bg-blue-600/90 text-white border-blue-400/40" },
  { id: "Restricted", label: "Restricted", chipClass: "bg-purple-600/90 text-white border-purple-400/40" },
  { id: "Classified", label: "Classified", chipClass: "bg-fuchsia-600/90 text-white border-fuchsia-400/40" },
  { id: "Covert", label: "Covert", chipClass: "bg-red-600/90 text-white border-red-400/40" },
  { id: "Contraband", label: "Contraband", chipClass: "bg-amber-600/90 text-white border-amber-400/40" },
] as const

/** Sort options — IA § Search & Sort */
export const SORT_OPTIONS = [
  { value: "price_asc", label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
  { value: "float_asc", label: "Float ↑" },
  { value: "newest", label: "Newest" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "rarity_desc", label: "Rarity tier" },
  { value: "weapon_asc", label: "Weapon A–Z" },
] as const

export type SortByValue = (typeof SORT_OPTIONS)[number]["value"]

export const ITEMS_PER_PAGE_OPTIONS = [24, 48, 96] as const

/** Representative price providers (IA mentions 40+; UI shows a curated subset + “Other”) */
export const PRICE_PROVIDER_OPTIONS = [
  "Steam",
  "Buff163",
  "Skinport",
  "CS.MONEY",
  "BitSkins",
  "Waxpeer",
  "DMarket",
  "CSFloat",
] as const

/** Keys match `market_price_snapshots.market` in Supabase. */
export const PRICE_PROVIDER_TO_MARKET: Record<(typeof PRICE_PROVIDER_OPTIONS)[number], string> = {
  Steam: "steam",
  Buff163: "buff163",
  Skinport: "skinport",
  "CS.MONEY": "csmoney",
  BitSkins: "bitskins",
  Waxpeer: "waxpeer",
  DMarket: "dmarket",
  CSFloat: "csfloat",
}

/** Doppler phase chips — IA § Pattern & Rank */
export const DOPPLER_PHASES = [
  "Phase 1",
  "Phase 2",
  "Phase 3",
  "Phase 4",
  "Ruby",
  "Sapphire",
  "Black Pearl",
] as const

/** Weapons that commonly have Doppler variants when category is Knives */
export const DOPPLER_KNIFE_WEAPON_MARKERS = [
  "karambit",
  "butterfly",
  "m9 bayonet",
  "bayonet",
  "flip knife",
  "gut knife",
  "huntsman",
  "falchion",
  "bowie",
  "shadow daggers",
  "navaja",
  "stiletto",
  "ursus",
  "skeleton",
  "nomad",
  "survival",
  "paracord",
  "classic",
] as const

/** Demo collection / case names for searchable lists (IA: long lists; real data can replace) */
export const SAMPLE_COLLECTIONS = [
  "The Dust Collection",
  "The Mirage Collection",
  "The Inferno Collection",
  "The Train Collection",
  "The Ancient Collection",
  "The Anubis Collection",
  "The Kilowatt Collection",
  "The Revolution Collection",
  "The Dreams & Nightmares Collection",
  "The Fracture Collection",
] as const

export const SAMPLE_CASES = [
  "Recoil Case",
  "Dreams & Nightmares Case",
  "Revolution Case",
  "Kilowatt Case",
  "Fracture Case",
  "Snakebite Case",
  "Operation Broken Fang Case",
  "Chroma Case",
  "Spectrum Case",
  "Clutch Case",
] as const
