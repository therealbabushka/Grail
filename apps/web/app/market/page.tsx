"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { MarketItemCard, type MarketCatalogItem } from "@/components/market/market-item-card"

type CatalogItem = {
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
}

type SortMode = "name_asc" | "rarity_desc" | "weapon_asc"
type ExteriorCode = "FN" | "MW" | "FT" | "WW" | "BS"
type StatTrakMode = "all" | "only" | "exclude"
type ViewDensity = "comfortable" | "compact"
type FilterSection =
  | "type"
  | "weapon"
  | "rarity"
  | "exterior"
  | "stattrak"
  | "float"
  | "highTier"
  | "collection"
  | "nameTag"
  | "paintSeed"
  | "listing"

type FilterState = {
  query: string
  types: string[]
  weapons: string[]
  rarities: string[]
  exteriors: ExteriorCode[]
  stattrak: StatTrakMode
  floatMin: string
  floatMax: string
  highTierOnly: boolean
  collectionQuery: string
  nameTagQuery: string
  paintSeedQuery: string
}

function norm(s: string) {
  return s.trim().toLowerCase()
}

const RARITY_TIER: Record<string, number> = {
  Contraband: 0,
  Covert: 1,
  Classified: 2,
  Restricted: 3,
  "Mil-Spec Grade": 4,
  Industrial: 5,
  Consumer: 6,
}

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

function parseExteriorParam(value: string | null): ExteriorCode[] {
  if (!value) return []
  const allowed: ExteriorCode[] = ["FN", "MW", "FT", "WW", "BS"]
  const list = value
    .split(",")
    .map((x) => x.trim().toUpperCase())
    .filter((x): x is ExteriorCode => allowed.includes(x as ExteriorCode))
  return Array.from(new Set(list))
}

function weaponTypeGroup(weaponName?: string): string {
  const weapon = (weaponName ?? "").toLowerCase()
  if (!weapon) return "Other"
  if (weapon.includes("knife") || weapon.includes("bayonet") || weapon.includes("karambit")) return "Knife"
  if (weapon.includes("gloves") || weapon.includes("hand wraps") || weapon.includes("driver gloves")) return "Gloves"
  if (weapon.includes("ak-47") || weapon.includes("m4") || weapon.includes("galil") || weapon.includes("famas") || weapon.includes("aug") || weapon.includes("sg 553")) {
    return "Rifle"
  }
  if (weapon.includes("awp") || weapon.includes("ssg 08") || weapon.includes("scar-20") || weapon.includes("g3sg1")) {
    return "Sniper"
  }
  if (weapon.includes("glock") || weapon.includes("usp") || weapon.includes("deagle") || weapon.includes("p250") || weapon.includes("tec-9") || weapon.includes("five-seven") || weapon.includes("cz75") || weapon.includes("dual berettas")) {
    return "Pistol"
  }
  if (weapon.includes("mac-10") || weapon.includes("mp9") || weapon.includes("mp7") || weapon.includes("ump-45") || weapon.includes("p90") || weapon.includes("pp-bizon")) {
    return "SMG"
  }
  if (weapon.includes("nova") || weapon.includes("xm1014") || weapon.includes("mag-7") || weapon.includes("sawed-off") || weapon.includes("m249") || weapon.includes("negev")) {
    return "Heavy"
  }
  return "Other"
}

function parseNumberInput(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

export default function MarketPage() {
  const DEFAULT_FILTERS: FilterState = {
    query: "",
    types: [],
    weapons: [],
    rarities: [],
    exteriors: [],
    stattrak: "all",
    floatMin: "",
    floatMax: "",
    highTierOnly: false,
    collectionQuery: "",
    nameTagQuery: "",
    paintSeedQuery: "",
  }

  const [items, setItems] = useState<CatalogItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState(DEFAULT_FILTERS.query)
  const [types, setTypes] = useState<string[]>(DEFAULT_FILTERS.types)
  const [weaponsSelected, setWeaponsSelected] = useState<string[]>(DEFAULT_FILTERS.weapons)
  const [raritiesSelected, setRaritiesSelected] = useState<string[]>(DEFAULT_FILTERS.rarities)
  const [exteriors, setExteriors] = useState<ExteriorCode[]>([])
  const [stattrak, setStatTrak] = useState<StatTrakMode>(DEFAULT_FILTERS.stattrak)
  const [floatMin, setFloatMin] = useState(DEFAULT_FILTERS.floatMin)
  const [floatMax, setFloatMax] = useState(DEFAULT_FILTERS.floatMax)
  const [highTierOnly, setHighTierOnly] = useState(DEFAULT_FILTERS.highTierOnly)
  const [collectionQuery, setCollectionQuery] = useState(DEFAULT_FILTERS.collectionQuery)
  const [nameTagQuery, setNameTagQuery] = useState(DEFAULT_FILTERS.nameTagQuery)
  const [paintSeedQuery, setPaintSeedQuery] = useState(DEFAULT_FILTERS.paintSeedQuery)
  const [sort, setSort] = useState<SortMode>("name_asc")
  const [viewDensity, setViewDensity] = useState<ViewDensity>("compact")
  const [shown, setShown] = useState(48)
  const [recentIds, setRecentIds] = useState<string[]>([])
  const [desktopSection, setDesktopSection] = useState<FilterSection>("type")
  const [activeSidebarSection, setActiveSidebarSection] = useState<FilterSection | null>(null)
  const [focusedTypeForWeapons, setFocusedTypeForWeapons] = useState<string>("")
  const [typeWeaponsPaneOpen, setTypeWeaponsPaneOpen] = useState(false)
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [mobileSection, setMobileSection] = useState<FilterSection>("type")
  const [mobileDraft, setMobileDraft] = useState<FilterState>(DEFAULT_FILTERS)
  const [isFiltering, setIsFiltering] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    function syncFromLocation() {
      const params = new URLSearchParams(window.location.search)
      setQuery(params.get("q") ?? "")
      setTypes(parseMultiParam(params.get("types") ?? params.get("type")))
      setWeaponsSelected(parseMultiParam(params.get("weapons") ?? params.get("weapon")))
      setRaritiesSelected(parseMultiParam(params.get("rarities") ?? params.get("rarity")))
      setExteriors(parseExteriorParam(params.get("exteriors")))
      const stattrakParam = params.get("stattrak")
      setStatTrak(
        stattrakParam === "only" || stattrakParam === "exclude" ? stattrakParam : "all"
      )
      setFloatMin(params.get("floatMin") ?? "")
      setFloatMax(params.get("floatMax") ?? "")
      setHighTierOnly(params.get("highTier") === "1")
      setCollectionQuery(params.get("collection") ?? "")
      setNameTagQuery(params.get("nameTag") ?? "")
      setPaintSeedQuery(params.get("paintSeed") ?? "")
      setSort(((params.get("sort") as SortMode | null) ?? "name_asc") as SortMode)
      setShown(48)
    }

    syncFromLocation()
    window.addEventListener("popstate", syncFromLocation)
    return () => window.removeEventListener("popstate", syncFromLocation)
  }, [])

  // Push local state → URL (debounced for typing).
  useEffect(() => {
    if (typeof window === "undefined") return
    const t = setTimeout(() => {
      const params = new URLSearchParams(window.location.search)
      setOrDelete(params, "q", query.trim())
      if (types.length) params.set("types", types.join(","))
      else params.delete("types")
      params.delete("type")
      if (weaponsSelected.length) params.set("weapons", weaponsSelected.join(","))
      else params.delete("weapons")
      params.delete("weapon")
      if (raritiesSelected.length) params.set("rarities", raritiesSelected.join(","))
      else params.delete("rarities")
      params.delete("rarity")
      if (exteriors.length) params.set("exteriors", exteriors.join(","))
      else params.delete("exteriors")
      setOrDelete(params, "stattrak", stattrak)
      setOrDelete(params, "floatMin", floatMin.trim())
      setOrDelete(params, "floatMax", floatMax.trim())
      if (highTierOnly) params.set("highTier", "1")
      else params.delete("highTier")
      setOrDelete(params, "collection", collectionQuery.trim())
      setOrDelete(params, "nameTag", nameTagQuery.trim())
      setOrDelete(params, "paintSeed", paintSeedQuery.trim())
      setOrDelete(params, "sort", sort)
      const next = params.toString()
      const nextUrl = next ? `/market?${next}` : "/market"
      window.history.replaceState(null, "", nextUrl)
    }, 150)
    return () => clearTimeout(t)
  }, [
    query,
    types,
    weaponsSelected,
    raritiesSelected,
    exteriors,
    stattrak,
    floatMin,
    floatMax,
    highTierOnly,
    collectionQuery,
    nameTagQuery,
    paintSeedQuery,
    sort,
  ])

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

  const weapons = useMemo(() => uniq(items?.map((i) => i.weaponName) ?? []), [items])
  const rarities = useMemo(() => uniq(items?.map((i) => i.rarityName) ?? []), [items])
  const typeOptions = useMemo(
    () => uniq(items?.map((i) => weaponTypeGroup(i.weaponName)) ?? []),
    [items]
  )
  const weaponsByType = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const t of typeOptions) {
      map.set(
        t,
        weapons.filter((w) => weaponTypeGroup(w) === t)
      )
    }
    return map
  }, [typeOptions, weapons])

  useEffect(() => {
    if (!focusedTypeForWeapons && typeOptions.length > 0) {
      const first = typeOptions[0]
      if (first) setFocusedTypeForWeapons(first)
    }
  }, [focusedTypeForWeapons, typeOptions])

  function toggleSidebarSection(section: FilterSection) {
    setActiveSidebarSection((prev) => {
      const next = prev === section ? null : section
      if (next !== "type") setTypeWeaponsPaneOpen(false)
      return next
    })
    setDesktopSection(section)
  }

  const floatMinFilter = useMemo(() => parseNumberInput(floatMin), [floatMin])
  const floatMaxFilter = useMemo(() => parseNumberInput(floatMax), [floatMax])

  const filtered = useMemo(() => {
    const q = norm(query)
    const list = items ?? []
    return list
      .filter((i) => {
        if (types.length > 0 && !types.includes(weaponTypeGroup(i.weaponName))) return false
        if (weaponsSelected.length > 0 && !weaponsSelected.includes(i.weaponName ?? "")) return false
        if (raritiesSelected.length > 0 && !raritiesSelected.includes(i.rarityName ?? "")) return false
        if (exteriors.length > 0 && !exteriors.some((x) => i.exteriors?.includes(x))) return false
        if (stattrak === "only" && !i.hasStatTrak) return false
        if (stattrak === "exclude" && i.hasStatTrak) return false
        if (typeof floatMinFilter === "number" && (typeof i.floatMin !== "number" || i.floatMin < floatMinFilter)) {
          return false
        }
        if (typeof floatMaxFilter === "number" && (typeof i.floatMax !== "number" || i.floatMax > floatMaxFilter)) {
          return false
        }
        if (highTierOnly) {
          const rarityName = i.rarityName ?? ""
          if (!["Contraband", "Covert", "Classified"].includes(rarityName)) return false
        }
        if (collectionQuery.trim()) {
          const c = norm(collectionQuery)
          if (!norm(i.name).includes(c)) return false
        }
        if (nameTagQuery.trim()) {
          const n = norm(nameTagQuery)
          if (!norm(i.name).includes(n)) return false
        }
        if (paintSeedQuery.trim()) {
          const p = norm(paintSeedQuery)
          if (!norm(i.name).includes(p)) return false
        }
        if (q && !norm(i.name).includes(q)) return false
        return true
      })
      .sort((a, b) => {
        if (sort === "weapon_asc") return (a.weaponName ?? "").localeCompare(b.weaponName ?? "")
        if (sort === "rarity_desc") {
          const ra = RARITY_TIER[a.rarityName ?? ""] ?? 999
          const rb = RARITY_TIER[b.rarityName ?? ""] ?? 999
          if (ra !== rb) return ra - rb
          return a.name.localeCompare(b.name)
        }
        return a.name.localeCompare(b.name)
      })
  }, [
    items,
    query,
    types,
    weaponsSelected,
    raritiesSelected,
    exteriors,
    stattrak,
    floatMinFilter,
    floatMaxFilter,
    highTierOnly,
    collectionQuery,
    nameTagQuery,
    paintSeedQuery,
    sort,
  ])

  useEffect(() => {
    if (!items) return
    setIsFiltering(true)
    const timer = window.setTimeout(() => {
      setIsFiltering(false)
    }, 220)
    return () => window.clearTimeout(timer)
  }, [
    items,
    query,
    types,
    weaponsSelected,
    raritiesSelected,
    exteriors,
    stattrak,
    floatMin,
    floatMax,
    highTierOnly,
    collectionQuery,
    nameTagQuery,
    paintSeedQuery,
    sort,
  ])

  function clearAllFilters() {
    setQuery(DEFAULT_FILTERS.query)
    setTypes(DEFAULT_FILTERS.types)
    setWeaponsSelected(DEFAULT_FILTERS.weapons)
    setRaritiesSelected(DEFAULT_FILTERS.rarities)
    setExteriors(DEFAULT_FILTERS.exteriors)
    setStatTrak(DEFAULT_FILTERS.stattrak)
    setFloatMin(DEFAULT_FILTERS.floatMin)
    setFloatMax(DEFAULT_FILTERS.floatMax)
    setHighTierOnly(DEFAULT_FILTERS.highTierOnly)
    setCollectionQuery(DEFAULT_FILTERS.collectionQuery)
    setNameTagQuery(DEFAULT_FILTERS.nameTagQuery)
    setPaintSeedQuery(DEFAULT_FILTERS.paintSeedQuery)
    setSort("name_asc")
    setShown(48)
  }

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string }> = []
    if (query.trim()) chips.push({ key: "q", label: `Search: ${query.trim()}` })
    if (types.length > 0) chips.push({ key: "types", label: `Type: ${types.join(", ")}` })
    if (weaponsSelected.length > 0) chips.push({ key: "weapons", label: `Weapon: ${weaponsSelected.join(", ")}` })
    if (raritiesSelected.length > 0) chips.push({ key: "rarities", label: `Rarity: ${raritiesSelected.join(", ")}` })
    if (exteriors.length > 0) chips.push({ key: "exteriors", label: `Exterior: ${exteriors.join(", ")}` })
    if (stattrak !== "all") chips.push({ key: "stattrak", label: `StatTrak: ${stattrak}` })
    if (floatMin.trim()) chips.push({ key: "floatMin", label: `Float min: ${floatMin.trim()}` })
    if (floatMax.trim()) chips.push({ key: "floatMax", label: `Float max: ${floatMax.trim()}` })
    if (highTierOnly) chips.push({ key: "highTier", label: "High tier only" })
    if (collectionQuery.trim()) chips.push({ key: "collection", label: `Collection: ${collectionQuery.trim()}` })
    if (nameTagQuery.trim()) chips.push({ key: "nameTag", label: `Name tag: ${nameTagQuery.trim()}` })
    if (paintSeedQuery.trim()) chips.push({ key: "paintSeed", label: `Paint seed: ${paintSeedQuery.trim()}` })
    return chips
  }, [
    query,
    types,
    weaponsSelected,
    raritiesSelected,
    exteriors,
    stattrak,
    floatMin,
    floatMax,
    highTierOnly,
    collectionQuery,
    nameTagQuery,
    paintSeedQuery,
  ])

  function clearFilterByKey(key: string) {
    if (key === "q") setQuery("")
    if (key === "types") setTypes([])
    if (key === "weapons") setWeaponsSelected([])
    if (key === "rarities") setRaritiesSelected([])
    if (key === "exteriors") setExteriors([])
    if (key === "stattrak") setStatTrak("all")
    if (key === "floatMin") setFloatMin("")
    if (key === "floatMax") setFloatMax("")
    if (key === "highTier") setHighTierOnly(false)
    if (key === "collection") setCollectionQuery("")
    if (key === "nameTag") setNameTagQuery("")
    if (key === "paintSeed") setPaintSeedQuery("")
    setShown(48)
  }

  function toggleStringValue(current: string[], value: string): string[] {
    return current.includes(value) ? current.filter((x) => x !== value) : [...current, value]
  }

  function getCurrentFilterState(): FilterState {
    return {
      query,
      types,
      weapons: weaponsSelected,
      rarities: raritiesSelected,
      exteriors,
      stattrak,
      floatMin,
      floatMax,
      highTierOnly,
      collectionQuery,
      nameTagQuery,
      paintSeedQuery,
    }
  }

  function applyFilterState(next: FilterState) {
    setQuery(next.query)
    setTypes(next.types)
    setWeaponsSelected(next.weapons)
    setRaritiesSelected(next.rarities)
    setExteriors(next.exteriors)
    setStatTrak(next.stattrak)
    setFloatMin(next.floatMin)
    setFloatMax(next.floatMax)
    setHighTierOnly(next.highTierOnly)
    setCollectionQuery(next.collectionQuery)
    setNameTagQuery(next.nameTagQuery)
    setPaintSeedQuery(next.paintSeedQuery)
    setShown(48)
  }

  function sectionSummary(section: FilterSection, state: FilterState): string {
    if (section === "type") return state.types.length ? state.types.join(", ") : "Any"
    if (section === "weapon") return state.weapons.length ? `${state.weapons.length} selected` : "Any"
    if (section === "rarity") return state.rarities.length ? state.rarities.join(", ") : "Any"
    if (section === "exterior") return state.exteriors.length ? state.exteriors.join(", ") : "Any"
    if (section === "stattrak") return state.stattrak === "all" ? "Any" : state.stattrak
    if (section === "float") return state.floatMin || state.floatMax ? `${state.floatMin || "0"}-${state.floatMax || "1"}` : "Any"
    if (section === "highTier") return state.highTierOnly ? "Enabled" : "Disabled"
    if (section === "collection") return state.collectionQuery || "Any"
    if (section === "nameTag") return state.nameTagQuery || "Any"
    if (section === "paintSeed") return state.paintSeedQuery || "Any"
    return "Locked"
  }

  const sectionMeta: Array<{ key: FilterSection; label: string }> = [
    { key: "type", label: "Type" },
    { key: "weapon", label: "Weapon" },
    { key: "rarity", label: "Rarity" },
    { key: "exterior", label: "Exterior" },
    { key: "stattrak", label: "StatTrak" },
    { key: "float", label: "Float" },
    { key: "highTier", label: "High tier" },
    { key: "collection", label: "Collection" },
    { key: "nameTag", label: "Name tag" },
    { key: "paintSeed", label: "Paint seed" },
    { key: "listing", label: "Listing-level" },
  ]

  function renderFilterSectionPanel(
    section: FilterSection,
    state: FilterState,
    update: (updater: (prev: FilterState) => FilterState) => void
  ) {
    if (section === "type") {
      return (
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase text-text-secondary">Select one or more types</p>
          <div className="grid grid-cols-2 gap-1.5">
            {typeOptions.map((t) => (
              <Button
                key={t}
                size="xs"
                variant={state.types.includes(t) ? "default" : "outline"}
                onClick={() => update((prev) => ({ ...prev, types: toggleStringValue(prev.types, t) }))}
                className="justify-start font-mono text-[10px]"
              >
                {t}
              </Button>
            ))}
          </div>
        </div>
      )
    }
    if (section === "weapon") {
      return (
        <div className="space-y-2">
          <div className="max-h-56 space-y-1 overflow-auto pr-1">
            {weapons
              .map((w) => (
                <button
                  key={w}
                  type="button"
                  className="flex w-full items-center justify-between border border-border bg-background/40 px-2 py-1 text-left text-xs"
                  onClick={() => update((prev) => ({ ...prev, weapons: toggleStringValue(prev.weapons, w) }))}
                >
                  <span>{w}</span>
                  <span>{state.weapons.includes(w) ? "✓" : ""}</span>
                </button>
              ))}
          </div>
        </div>
      )
    }
    if (section === "rarity") {
      return (
        <div className="grid grid-cols-1 gap-1.5">
          {rarities.map((r) => (
            <button
              key={r}
              type="button"
              className="flex items-center justify-between border border-border bg-background/40 px-2 py-1 text-left text-xs"
              onClick={() => update((prev) => ({ ...prev, rarities: toggleStringValue(prev.rarities, r) }))}
            >
              <span>{r}</span>
              <span>{state.rarities.includes(r) ? "✓" : ""}</span>
            </button>
          ))}
        </div>
      )
    }
    if (section === "exterior") {
      return (
        <div className="grid grid-cols-2 gap-1.5">
          {(["FN", "MW", "FT", "WW", "BS"] as ExteriorCode[]).map((x) => (
            <Button
              key={x}
              size="xs"
              variant={state.exteriors.includes(x) ? "default" : "outline"}
              className="justify-start font-mono text-[10px]"
              onClick={() => update((prev) => ({ ...prev, exteriors: toggleStringValue(prev.exteriors, x) as ExteriorCode[] }))}
            >
              {x}
            </Button>
          ))}
        </div>
      )
    }
    if (section === "stattrak") {
      return (
        <div className="flex flex-wrap gap-2">
          {(["all", "only", "exclude"] as StatTrakMode[]).map((s) => (
            <Button
              key={s}
              size="xs"
              variant={state.stattrak === s ? "default" : "outline"}
              onClick={() => update((prev) => ({ ...prev, stattrak: s }))}
              className="font-mono text-[10px]"
            >
              {s === "all" ? "Any" : s}
            </Button>
          ))}
        </div>
      )
    }
    if (section === "float") {
      return (
        <div className="grid grid-cols-2 gap-2">
          <Input value={state.floatMin} onChange={(e) => update((p) => ({ ...p, floatMin: e.target.value }))} placeholder="Min" className="h-8 font-mono text-xs" />
          <Input value={state.floatMax} onChange={(e) => update((p) => ({ ...p, floatMax: e.target.value }))} placeholder="Max" className="h-8 font-mono text-xs" />
        </div>
      )
    }
    if (section === "highTier") {
      return (
        <Button
          size="xs"
          variant={state.highTierOnly ? "default" : "outline"}
          onClick={() => update((p) => ({ ...p, highTierOnly: !p.highTierOnly }))}
          className="font-mono text-[10px]"
        >
          Contraband / Covert / Classified
        </Button>
      )
    }
    if (section === "collection") {
      return <Input value={state.collectionQuery} onChange={(e) => update((p) => ({ ...p, collectionQuery: e.target.value }))} placeholder="Collection keyword" className="h-8 font-mono text-xs" />
    }
    if (section === "nameTag") {
      return <Input value={state.nameTagQuery} onChange={(e) => update((p) => ({ ...p, nameTagQuery: e.target.value }))} placeholder="Name tag keyword" className="h-8 font-mono text-xs" />
    }
    if (section === "paintSeed") {
      return <Input value={state.paintSeedQuery} onChange={(e) => update((p) => ({ ...p, paintSeedQuery: e.target.value }))} placeholder="Paint seed keyword" className="h-8 font-mono text-xs" />
    }
    return (
      <div className="space-y-2 text-[10px] text-text-muted">
        <p>Requires listing metadata feed.</p>
        <div className="grid grid-cols-2 gap-1.5">
          {["Trade hold", "Fade", "Blue tier", "Fire & Ice", "Stickers", "Phase", "Container", "Pattern seed"].map((x) => (
            <label key={x} className="inline-flex items-center gap-1">
              <input type="checkbox" disabled className="size-3" /> {x}
            </label>
          ))}
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground lg:px-6">
      <div className="w-full space-y-5">
        <header className="lg:sticky lg:top-14 lg:z-40 flex flex-col gap-4 border-b border-border/60 bg-background/95 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-mono text-2xl font-bold tracking-tight">Market</h1>
            <p className="text-xs text-text-secondary">
              Browse skins · Search fast · Route into Watchlist or Trades
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="font-mono text-xs tracking-wide">
              <Link href="/watchlist">Watchlist</Link>
            </Button>
            <Button asChild className="font-mono text-xs tracking-wide">
              <Link href="/trade-links">Trade Links</Link>
            </Button>
          </div>
        </header>

        <section className="grid gap-4 lg:items-start lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="relative hidden w-[240px] self-start lg:sticky lg:top-[8rem] lg:z-50 lg:block">
            <aside className="relative z-50 h-fit max-h-[calc(100vh-9rem)] border border-border bg-surface/60 p-2">
              <div className="max-h-[calc(100vh-10rem)] space-y-1 overflow-y-auto pr-1">
                <div className="space-y-1 border border-border bg-background/50 p-2">
                  <label className="block font-mono text-[10px] uppercase text-text-secondary">Sort by</label>
                  <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name_asc">Name A–Z</SelectItem>
                      <SelectItem value="rarity_desc">Rarity</SelectItem>
                      <SelectItem value="weapon_asc">Weapon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="pb-1 font-mono text-[10px] uppercase tracking-wider text-text-secondary">Basic Filters</div>
                {[
                  { key: "type" as FilterSection, label: "Type" },
                  { key: "float" as FilterSection, label: "Price / Float" },
                  { key: "exterior" as FilterSection, label: "Exterior" },
                  { key: "rarity" as FilterSection, label: "Quality" },
                  { key: "stattrak" as FilterSection, label: "Category" },
                  { key: "listing" as FilterSection, label: "Trade hold" },
                ].map((row) => (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => toggleSidebarSection(row.key)}
                    className="flex w-full items-center justify-between border border-border bg-background/50 px-2 py-1.5 text-left"
                  >
                    <div>
                      <div className="font-mono text-[10px] uppercase">{row.label}</div>
                      <div className="text-[10px] text-text-muted">{sectionSummary(row.key, getCurrentFilterState())}</div>
                    </div>
                    <span className="text-text-muted">{activeSidebarSection === row.key ? "◀" : "▶"}</span>
                  </button>
                ))}
                <div className="pt-2 font-mono text-[10px] uppercase tracking-wider text-text-secondary">Advanced Filters</div>
                {[
                  { key: "highTier" as FilterSection, label: "High Tier" },
                  { key: "collection" as FilterSection, label: "Collection" },
                  { key: "nameTag" as FilterSection, label: "Name Tag" },
                  { key: "paintSeed" as FilterSection, label: "Paint seed" },
                ].map((row) => (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => toggleSidebarSection(row.key)}
                    className="flex w-full items-center justify-between border border-border bg-background/50 px-2 py-1.5 text-left"
                  >
                    <div>
                      <div className="font-mono text-[10px] uppercase">{row.label}</div>
                      <div className="text-[10px] text-text-muted">{sectionSummary(row.key, getCurrentFilterState())}</div>
                    </div>
                    <span className="text-text-muted">{activeSidebarSection === row.key ? "◀" : "▶"}</span>
                  </button>
                ))}
                <Button type="button" variant="outline" className="mt-2 w-full font-mono text-[10px]" onClick={clearAllFilters}>
                  Clear all filters
                </Button>
              </div>

              {activeSidebarSection && (
                <div className="absolute top-0 left-[calc(100%+8px)] z-[70] min-h-[360px] w-[300px] border border-border bg-surface p-2 shadow-2xl">
                  {activeSidebarSection === "type" ? (
                    <div className="space-y-1 overflow-auto border border-border bg-background/50 p-2">
                      <div className="flex items-center justify-between font-mono text-[10px] uppercase text-text-secondary">
                        <span>Type</span>
                        <Button type="button" size="xs" variant="outline" onClick={() => setActiveSidebarSection(null)}>
                          Close
                        </Button>
                      </div>
                      <p className="text-[10px] text-text-muted">Click a type to open its weapon panel.</p>
                        {typeOptions.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setFocusedTypeForWeapons(t)
                              setTypeWeaponsPaneOpen(true)
                            }}
                            className={`flex w-full items-center justify-between border px-2 py-1 text-left text-xs ${
                              focusedTypeForWeapons === t ? "border-emerald-400/70 bg-emerald-500/10" : "border-border bg-background/40"
                            }`}
                          >
                            <span>{t}</span>
                            <span>{types.includes(t) ? "✓" : "▶"}</span>
                          </button>
                        ))}
                    </div>
                  ) : (
                    <div className="space-y-2 overflow-auto border border-border bg-background/50 p-2">
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-[10px] uppercase text-text-secondary">
                          {sectionMeta.find((x) => x.key === activeSidebarSection)?.label}
                        </p>
                        <Button type="button" size="xs" variant="outline" onClick={() => setActiveSidebarSection(null)}>
                          Close
                        </Button>
                      </div>
                      {renderFilterSectionPanel(activeSidebarSection, getCurrentFilterState(), (updater) => {
                        applyFilterState(updater(getCurrentFilterState()))
                      })}
                    </div>
                  )}
                </div>
              )}
              {activeSidebarSection === "type" && typeWeaponsPaneOpen && (
                <div className="absolute top-0 left-[calc(100%+316px)] z-[75] min-h-[360px] w-[300px] border border-border bg-surface p-2 shadow-2xl">
                  <div className="space-y-1 overflow-auto border border-border bg-background/50 p-2">
                    <div className="flex items-center justify-between font-mono text-[10px] uppercase text-text-secondary">
                      <span>{focusedTypeForWeapons || "Weapon"}</span>
                      <div className="flex items-center gap-1">
                        {focusedTypeForWeapons && (
                          <Button
                            type="button"
                            size="xs"
                            variant={types.includes(focusedTypeForWeapons) ? "default" : "outline"}
                            className="h-6 px-2 text-[10px]"
                            onClick={() => setTypes((prev) => toggleStringValue(prev, focusedTypeForWeapons))}
                          >
                            {types.includes(focusedTypeForWeapons) ? "Type ✓" : "Add type"}
                          </Button>
                        )}
                        <Button type="button" size="xs" variant="outline" onClick={() => setTypeWeaponsPaneOpen(false)}>
                          Close
                        </Button>
                      </div>
                    </div>
                    {(weaponsByType.get(focusedTypeForWeapons) ?? []).map((w) => (
                      <button
                        key={w}
                        type="button"
                        className="flex w-full items-center justify-between border border-border bg-background/40 px-2 py-1 text-left text-xs"
                        onClick={() => setWeaponsSelected((prev) => toggleStringValue(prev, w))}
                      >
                        <span>{w}</span>
                        <span>{weaponsSelected.includes(w) ? "✓" : ""}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>

          <section className="space-y-2">
              <div className="xl:hidden">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full font-mono text-xs"
                  onClick={() => {
                    setMobileDraft(getCurrentFilterState())
                    setMobileFilterOpen(true)
                  }}
                >
                  Open filters
                </Button>
              </div>
              {activeFilterChips.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {activeFilterChips.map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      className="inline-flex items-center gap-1 rounded-none border border-border bg-background/60 px-2 py-1 font-mono text-[10px] text-text-secondary hover:bg-surface"
                      onClick={() => clearFilterByKey(chip.key)}
                    >
                      {chip.label}
                      <span className="text-text-muted">×</span>
                    </button>
                  ))}
                </div>
              )}

              {items && isFiltering && (
                <Card className="border-border/80 bg-surface/70">
                  <CardContent className="flex items-center gap-3 py-3">
                    <div className="relative size-4 shrink-0">
                      <span className="absolute inset-0 animate-spin rounded-full border border-info/35 border-t-info" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] uppercase tracking-wide text-info">Searching market...</p>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-none bg-background/70">
                        <div className="h-full w-1/3 animate-[pulse_1.1s_ease-in-out_infinite] bg-info/60" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {error && (
                <Card className="border-destructive/40">
                  <CardContent className="py-6 text-sm text-destructive">
                    Failed to load catalog: {error}
                  </CardContent>
                </Card>
              )}

              {!error && !items && (
                <section className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(100%,210px),1fr))]">
                  {Array.from({ length: 12 }).map((_, idx) => (
                    <Card key={idx} className="h-[176px] overflow-hidden border-border bg-surface">
                      <CardContent className="p-3">
                        <div className="h-24 w-full animate-pulse rounded-none bg-background/40" />
                        <div className="mt-3 space-y-2">
                          <div className="h-3 w-4/5 animate-pulse rounded-none bg-background/40" />
                          <div className="h-3 w-2/5 animate-pulse rounded-none bg-background/30" />
                          <div className="flex gap-2 pt-1">
                            <div className="h-4 w-10 animate-pulse rounded-none bg-background/30" />
                            <div className="h-4 w-10 animate-pulse rounded-none bg-background/30" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </section>
              )}

              {items && !isFiltering && (
                <section className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(100%,210px),1fr))]">
                  {filtered.slice(0, shown).map((i) => (
                    <MarketItemCard
                      key={i.id}
                      item={i as unknown as MarketCatalogItem}
                      isRecent={recentIds.includes(i.id)}
                      dense={viewDensity === "compact"}
                    />
                  ))}
                </section>
              )}

              {items && isFiltering && (
                <section className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(100%,210px),1fr))]">
                  {Array.from({ length: 10 }).map((_, idx) => (
                    <Card key={`filter_skeleton_${idx}`} className="h-[176px] overflow-hidden border-border bg-surface">
                      <CardContent className="p-3">
                        <div className="h-24 w-full animate-pulse rounded-none bg-background/40" />
                        <div className="mt-3 space-y-2">
                          <div className="h-3 w-4/5 animate-pulse rounded-none bg-background/40" />
                          <div className="h-3 w-2/5 animate-pulse rounded-none bg-background/30" />
                          <div className="flex gap-2 pt-1">
                            <div className="h-4 w-10 animate-pulse rounded-none bg-background/30" />
                            <div className="h-4 w-10 animate-pulse rounded-none bg-background/30" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </section>
              )}

              {items && !isFiltering && filtered.length > shown && (
                <div className="flex items-center justify-center pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="font-mono text-xs tracking-wide"
                    onClick={() => setShown((n) => n + 48)}
                  >
                    Load more ({Math.min(shown + 48, filtered.length).toLocaleString()} / {filtered.length.toLocaleString()})
                  </Button>
                </div>
              )}
            </section>

            <Dialog open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
              <DialogContent className="max-w-[calc(100%-1rem)] gap-0 p-0 sm:max-w-[calc(100%-2rem)]" showCloseButton={false}>
                <DialogHeader className="border-b border-border px-3 py-2">
                  <DialogTitle className="font-mono text-xs uppercase">Filters</DialogTitle>
                </DialogHeader>
                <div className="grid max-h-[70vh] grid-cols-[124px_minmax(0,1fr)] gap-2 overflow-hidden p-2">
                  <div className="space-y-1 overflow-auto pr-1">
                    {sectionMeta.map((section) => (
                      <button
                        key={`m_${section.key}`}
                        type="button"
                        onClick={() => setMobileSection(section.key)}
                        className={`w-full border px-2 py-1.5 text-left ${
                          mobileSection === section.key ? "border-emerald-400/70 bg-emerald-500/10" : "border-border bg-background/40"
                        }`}
                      >
                        <div className="font-mono text-[10px] uppercase">{section.label}</div>
                        <div className="truncate text-[10px] text-text-muted">{sectionSummary(section.key, mobileDraft)}</div>
                      </button>
                    ))}
                  </div>
                  <div className="overflow-auto border border-border bg-background/40 p-2">
                    {renderFilterSectionPanel(mobileSection, mobileDraft, (updater) => setMobileDraft((prev) => updater(prev)))}
                  </div>
                </div>
                <div className="sticky bottom-0 flex gap-2 border-t border-border bg-background/95 p-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 font-mono text-xs"
                    onClick={() => setMobileDraft(DEFAULT_FILTERS)}
                  >
                    Reset
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 font-mono text-xs"
                    onClick={() => {
                      applyFilterState(mobileDraft)
                      setMobileFilterOpen(false)
                    }}
                  >
                    Apply
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
        </section>

        {items && recentIds.length > 0 && (
          <section className="space-y-3 pt-2">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-text-secondary">
              Recent views
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {recentIds
                .map((id) => items.find((x) => x.id === id))
                .filter(Boolean)
                .slice(0, 8)
                .map((i) => {
                  const item = i as CatalogItem
                  return (
                    <div key={`recent_${item.id}`} className="w-[210px] min-w-[210px] shrink-0">
                      <MarketItemCard item={item as unknown as MarketCatalogItem} isRecent dense />
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

