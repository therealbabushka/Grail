"use client"

import {
  ChartLineIcon,
  CurrencyDollarIcon,
  GameControllerIcon,
  GearSixIcon,
  HashStraightIcon,
  MagnifyingGlassIcon,
  PaintBrushIcon,
  StarIcon,
} from "@phosphor-icons/react"

import { Button } from "@workspace/ui/components/button"

import type { MarketFiltersState } from "./market-filter-types"
import { DEFAULT_MARKET_FILTERS } from "./market-filter-types"
import { WEAR_BANDS, type WearCode } from "./market-filter-constants"
import { totalActiveFilters } from "./market-filter-counts"

export type ActiveFilterTag = {
  id: string
  icon: React.ReactNode
  label: string
}

function enc(s: string) {
  return encodeURIComponent(s)
}

export function buildTags(f: MarketFiltersState): ActiveFilterTag[] {
  const tags: ActiveFilterTag[] = []
  const d = DEFAULT_MARKET_FILTERS

  if (f.keyword.trim()) {
    tags.push({
      id: "keyword",
      icon: <MagnifyingGlassIcon className="size-3.5 text-muted-foreground" />,
      label: `Search: ${f.keyword.trim()}`,
    })
  }
  if (f.sortBy !== d.sortBy) {
    tags.push({
      id: "sort",
      icon: <MagnifyingGlassIcon className="size-3.5 text-muted-foreground" />,
      label: `Sort: ${f.sortBy}`,
    })
  }
  if (f.itemsPerPage !== d.itemsPerPage) {
    tags.push({
      id: "perPage",
      icon: <MagnifyingGlassIcon className="size-3.5 text-muted-foreground" />,
      label: `Per page: ${f.itemsPerPage}`,
    })
  }
  if (f.groupItems) {
    tags.push({
      id: "group",
      icon: <MagnifyingGlassIcon className="size-3.5 text-muted-foreground" />,
      label: "Grouped items",
    })
  }

  f.categories.forEach((c) => {
    tags.push({
      id: `cat:${enc(c)}`,
      icon: <GameControllerIcon className="size-3.5 text-muted-foreground" />,
      label: `Category: ${c}`,
    })
  })
  f.weapons.forEach((w) => {
    tags.push({
      id: `weapon:${enc(w)}`,
      icon: <GameControllerIcon className="size-3.5 text-muted-foreground" />,
      label: `Weapon: ${w}`,
    })
  })
  if (f.statTrak) {
    tags.push({
      id: "st",
      icon: <GameControllerIcon className="size-3.5 text-muted-foreground" />,
      label: "StatTrak™",
    })
  }
  if (f.souvenir) {
    tags.push({
      id: "sv",
      icon: <GameControllerIcon className="size-3.5 text-muted-foreground" />,
      label: "Souvenir",
    })
  }

  if (f.priceMin.trim() || f.priceMax.trim()) {
    tags.push({
      id: "price",
      icon: <CurrencyDollarIcon className="size-3.5 text-muted-foreground" />,
      label: `Price: ${f.priceMin || "0"} – ${f.priceMax || "∞"}`,
    })
  }
  if (f.priceProvider !== d.priceProvider) {
    tags.push({
      id: "prov",
      icon: <CurrencyDollarIcon className="size-3.5 text-muted-foreground" />,
      label: `Provider: ${f.priceProvider}`,
    })
  }
  if (f.marketItemsOnly) {
    tags.push({
      id: "mkt",
      icon: <CurrencyDollarIcon className="size-3.5 text-muted-foreground" />,
      label: "Market items only",
    })
  }

  if (f.wear.length > 2) {
    tags.push({
      id: "wear:group",
      icon: <ChartLineIcon className="size-3.5 text-muted-foreground" />,
      label: `Wear: ${f.wear.length} selected`,
    })
  } else {
    f.wear.forEach((w) => {
      tags.push({
        id: `wear:${w}`,
        icon: <ChartLineIcon className="size-3.5 text-muted-foreground" />,
        label: `Wear: ${WEAR_BANDS[w as WearCode]?.label ?? w}`,
      })
    })
  }
  if (f.wear.length > 0 && (f.floatMin !== null || f.floatMax !== null)) {
    const lo = f.floatMin ?? 0
    const hi = f.floatMax ?? 1
    tags.push({
      id: "float",
      icon: <ChartLineIcon className="size-3.5 text-muted-foreground" />,
      label: `Float: ${lo.toFixed(2)} – ${hi.toFixed(2)}`,
    })
  }

  f.rarities.forEach((r) => {
    tags.push({
      id: `rarity:${enc(r)}`,
      icon: <StarIcon className="size-3.5 text-muted-foreground" />,
      label: `Rarity: ${r}`,
    })
  })
  f.collections.forEach((c) => {
    tags.push({
      id: `collection:${enc(c)}`,
      icon: <StarIcon className="size-3.5 text-muted-foreground" />,
      label: `Collection: ${c}`,
    })
  })
  f.cases.forEach((c) => {
    tags.push({
      id: `case:${enc(c)}`,
      icon: <StarIcon className="size-3.5 text-muted-foreground" />,
      label: `Case: ${c}`,
    })
  })

  f.stickers.forEach((s) => {
    tags.push({
      id: `sticker:${enc(s)}`,
      icon: <PaintBrushIcon className="size-3.5 text-muted-foreground" />,
      label: `Sticker: ${s}`,
    })
  })
  if (f.charm.trim()) {
    tags.push({
      id: "charm",
      icon: <PaintBrushIcon className="size-3.5 text-muted-foreground" />,
      label: `Charm: ${f.charm.trim()}`,
    })
  }

  f.dopplerPhases.forEach((p) => {
    tags.push({
      id: `phase:${enc(p)}`,
      icon: <HashStraightIcon className="size-3.5 text-muted-foreground" />,
      label: `Phase: ${p}`,
    })
  })
  if (f.paintSeed.trim()) {
    tags.push({
      id: "seed",
      icon: <HashStraightIcon className="size-3.5 text-muted-foreground" />,
      label: `Seed: ${f.paintSeed.trim()}`,
    })
  }

  if (f.steamId.trim()) {
    tags.push({
      id: "steam",
      icon: <GearSixIcon className="size-3.5 text-muted-foreground" />,
      label: `Steam: ${f.steamId.trim()}`,
    })
  }

  return tags
}

type Props = {
  filters: MarketFiltersState
  onRemoveTag: (id: string) => void
  onClearAll: () => void
}

export function ActiveFilterTags({ filters, onRemoveTag, onClearAll }: Props) {
  const tags = buildTags(filters)
  const n = totalActiveFilters(filters)
  if (n === 0) return null

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {tags.map((t) => (
          <button
            key={t.id}
            type="button"
            className="inline-flex shrink-0 items-center gap-1.5 border border-border bg-background/80 px-2 py-1 font-mono text-[12px] text-muted-foreground hover:bg-muted"
            onClick={() => onRemoveTag(t.id)}
          >
            {t.icon}
            <span className="whitespace-nowrap text-foreground">{t.label}</span>
            <span className="text-muted-foreground">✕</span>
          </button>
        ))}
      </div>
      <Button type="button" variant="outline" size="xs" className="shrink-0 font-mono text-[12px]" onClick={onClearAll}>
        Clear all
      </Button>
    </div>
  )
}
