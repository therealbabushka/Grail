import { DOPPLER_KNIFE_WEAPON_MARKERS, WEAR_BANDS, type WearCode } from "./market-filter-constants"
import type { MarketFiltersState } from "./market-filter-types"

export function norm(s: string) {
  return s.trim().toLowerCase()
}

/** Maps catalog weapon name to IA category bucket (aligned with existing market page logic + Agents). */
export function weaponCategoryFromWeaponName(weaponName?: string): string {
  const weapon = (weaponName ?? "").toLowerCase()
  if (!weapon) return "Other"
  if (
    weapon.includes("sticker") ||
    weapon.includes("patch") ||
    weapon.includes("graffiti") ||
    weapon.includes("container") ||
    weapon.includes("charm") ||
    weapon.includes("music kit") ||
    weapon.includes("collectible")
  ) {
    return "Other"
  }
  if (weapon.includes("agent") || weapon.includes("swat") || weapon.includes("sas")) return "Agent"
  if (weapon.includes("knife") || weapon.includes("bayonet") || weapon.includes("karambit")) return "Knife"
  if (weapon.includes("gloves") || weapon.includes("hand wraps") || weapon.includes("driver gloves")) return "Gloves"
  if (
    weapon.includes("ak-47") ||
    weapon.includes("m4") ||
    weapon.includes("galil") ||
    weapon.includes("famas") ||
    weapon.includes("aug") ||
    weapon.includes("sg 553")
  ) {
    return "Rifle"
  }
  if (weapon.includes("awp") || weapon.includes("ssg 08") || weapon.includes("scar-20") || weapon.includes("g3sg1")) {
    return "Sniper"
  }
  if (
    weapon.includes("glock") ||
    weapon.includes("usp") ||
    weapon.includes("deagle") ||
    weapon.includes("p250") ||
    weapon.includes("tec-9") ||
    weapon.includes("five-seven") ||
    weapon.includes("cz75") ||
    weapon.includes("dual berettas")
  ) {
    return "Pistol"
  }
  if (
    weapon.includes("mac-10") ||
    weapon.includes("mp9") ||
    weapon.includes("mp7") ||
    weapon.includes("ump-45") ||
    weapon.includes("p90") ||
    weapon.includes("pp-bizon")
  ) {
    return "SMG"
  }
  if (
    weapon.includes("nova") ||
    weapon.includes("xm1014") ||
    weapon.includes("mag-7") ||
    weapon.includes("sawed-off") ||
    weapon.includes("m249") ||
    weapon.includes("negev")
  ) {
    return "Heavy"
  }
  return "Other"
}

export function unionWearFloatBounds(wear: WearCode[]): { min: number; max: number } {
  if (!wear.length) return { min: 0, max: 1 }
  let min = 1
  let max = 0
  for (const w of wear) {
    const b = WEAR_BANDS[w]
    min = Math.min(min, b.min)
    max = Math.max(max, b.max)
  }
  return { min, max }
}

export function rangesOverlap(
  aMin: number | null | undefined,
  aMax: number | null | undefined,
  bMin: number,
  bMax: number
): boolean {
  const lo = typeof aMin === "number" && Number.isFinite(aMin) ? aMin : 0
  const hi = typeof aMax === "number" && Number.isFinite(aMax) ? aMax : 1
  return lo <= bMax && hi >= bMin
}

export function isDopplerWeaponSelected(state: Pick<MarketFiltersState, "categories" | "weapons">): boolean {
  const cat = state.categories
  if (!cat.includes("Knife")) return false
  if (!state.weapons.length) return false
  return state.weapons.some((w) => {
    const n = norm(w)
    return DOPPLER_KNIFE_WEAPON_MARKERS.some((m) => n.includes(m))
  })
}

const STEAM_ID64 = /^\d{17}$/

export function validateSteamIdInput(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  if (STEAM_ID64.test(t)) return null
  if (/^[a-z0-9_-]{3,64}$/i.test(t)) return null
  return "Enter a valid Steam ID64 or profile URL"
}

export type FilterGroupId =
  | "search"
  | "itemType"
  | "price"
  | "condition"
  | "rarity"
  | "sticker"
  | "pattern"
  | "utility"
