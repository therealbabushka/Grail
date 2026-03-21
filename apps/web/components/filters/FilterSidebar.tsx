"use client"

import * as React from "react"
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
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@workspace/ui/components/sheet"
import { cn } from "@workspace/ui/lib/utils"

import { FilterAccordion } from "./FilterAccordion"
import { FilterSearch } from "./FilterSearch"
import { FilterItemType } from "./FilterItemType"
import { FilterPriceRange } from "./FilterPriceRange"
import { FilterWearCondition } from "./FilterWearCondition"
import { FilterRarity } from "./FilterRarity"
import { FilterSticker } from "./FilterSticker"
import { FilterPattern } from "./FilterPattern"
import { FilterUtility } from "./FilterUtility"
import type { MarketFiltersState } from "./market-filter-types"
import { DEFAULT_MARKET_FILTERS } from "./market-filter-types"
import { isDopplerWeaponSelected } from "./market-filter-utils"
import { countActiveInGroup, resetGroup, totalActiveFilters } from "./market-filter-counts"
import { useViewportBreakpoint } from "./use-viewport-breakpoint"

const ACCORDION_KEY = "grail.market.filterAccordion.v1"

type Props = {
  filters: MarketFiltersState
  onFiltersChange: (next: MarketFiltersState | ((prev: MarketFiltersState) => MarketFiltersState)) => void
  availableRarities?: string[]
  /** Distinct weapon names from catalog for the weapon multi-select */
  availableWeapons?: string[]
  resultCount: number
  /** Mobile / tablet sheet open */
  sheetOpen?: boolean
  onSheetOpenChange?: (open: boolean) => void
}

function loadAccordionState(): Record<string, boolean> {
  if (typeof window === "undefined") return {}
  try {
    const raw = sessionStorage.getItem(ACCORDION_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, boolean>
  } catch {
    return {}
  }
}

export function FilterPanelBody({
  filters,
  onFiltersChange,
  availableRarities,
  availableWeapons,
  resultCount,
}: Omit<Props, "sheetOpen" | "onSheetOpenChange">) {
  const set = (next: MarketFiltersState) => onFiltersChange(next)

  const [openMap, setOpenMap] = React.useState<Record<string, boolean>>({
    condition: false,
    rarity: false,
    sticker: false,
    pattern: false,
    utility: false,
  })

  React.useEffect(() => {
    const stored = loadAccordionState()
    if (Object.keys(stored).length) {
      setOpenMap((prev) => ({ ...prev, ...stored }))
    }
  }, [])

  React.useEffect(() => {
    if (typeof window === "undefined") return
    sessionStorage.setItem(ACCORDION_KEY, JSON.stringify(openMap))
  }, [openMap])

  const showDoppler =
    filters.categories.includes("Knife") && (!filters.weapons.length || isDopplerWeaponSelected(filters))
  const weaponSelected = filters.weapons.length > 0 || filters.categories.length > 0

  const total = totalActiveFilters(filters)

  function toggleAccordion(key: string, open: boolean) {
    setOpenMap((m) => ({ ...m, [key]: open }))
  }

  function clearAll() {
    onFiltersChange(DEFAULT_MARKET_FILTERS)
    setOpenMap({
      condition: false,
      rarity: false,
      sticker: false,
      pattern: false,
      utility: false,
    })
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-2">
        {total > 0 ? (
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border border-border bg-background/95 px-2 py-2 font-mono text-[12px] backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <span className="text-muted-foreground">
              {total} active{" "}
              {total === 1 ? "filter" : "filters"}
            </span>
            <Button type="button" variant="outline" size="xs" className="shrink-0 font-mono text-[12px]" onClick={clearAll}>
              Clear all
            </Button>
          </div>
        ) : null}

        <FilterAccordion
          icon={<MagnifyingGlassIcon className="size-4" />}
          title="Search & sort"
          activeCount={countActiveInGroup("search", filters)}
          open
          onOpenChange={() => {}}
          pinned
          onReset={countActiveInGroup("search", filters) ? () => set(resetGroup("search", filters)) : undefined}
        >
          <FilterSearch value={filters} onChange={set} />
        </FilterAccordion>

        <FilterAccordion
          icon={<GameControllerIcon className="size-4" />}
          title="Item type"
          activeCount={countActiveInGroup("itemType", filters)}
          open
          onOpenChange={() => {}}
          pinned
          onReset={countActiveInGroup("itemType", filters) ? () => set(resetGroup("itemType", filters)) : undefined}
        >
          <FilterItemType value={filters} onChange={set} availableWeapons={availableWeapons} />
        </FilterAccordion>

        <FilterAccordion
          icon={<CurrencyDollarIcon className="size-4" />}
          title="Price"
          activeCount={countActiveInGroup("price", filters)}
          open
          onOpenChange={() => {}}
          pinned
          onReset={countActiveInGroup("price", filters) ? () => set(resetGroup("price", filters)) : undefined}
        >
          <FilterPriceRange value={filters} onChange={set} />
        </FilterAccordion>

        <FilterAccordion
          icon={<ChartLineIcon className="size-4" />}
          title="Condition & float"
          activeCount={countActiveInGroup("condition", filters)}
          open={openMap.condition ?? false}
          onOpenChange={(o) => toggleAccordion("condition", o)}
          onReset={countActiveInGroup("condition", filters) ? () => set(resetGroup("condition", filters)) : undefined}
        >
          <FilterWearCondition value={filters} onChange={set} />
        </FilterAccordion>

        <FilterAccordion
          icon={<StarIcon className="size-4" />}
          title="Rarity & origin"
          activeCount={countActiveInGroup("rarity", filters)}
          open={openMap.rarity ?? false}
          onOpenChange={(o) => toggleAccordion("rarity", o)}
          onReset={countActiveInGroup("rarity", filters) ? () => set(resetGroup("rarity", filters)) : undefined}
        >
          <FilterRarity value={filters} onChange={set} availableRarities={availableRarities} />
        </FilterAccordion>

        <FilterAccordion
          icon={<PaintBrushIcon className="size-4" />}
          title="Sticker & charm"
          activeCount={countActiveInGroup("sticker", filters)}
          open={openMap.sticker ?? false}
          onOpenChange={(o) => toggleAccordion("sticker", o)}
          onReset={countActiveInGroup("sticker", filters) ? () => set(resetGroup("sticker", filters)) : undefined}
        >
          <FilterSticker value={filters} onChange={set} />
        </FilterAccordion>

        <FilterAccordion
          icon={<HashStraightIcon className="size-4" />}
          title="Pattern & rank"
          activeCount={countActiveInGroup("pattern", filters)}
          open={openMap.pattern ?? false}
          onOpenChange={(o) => toggleAccordion("pattern", o)}
          onReset={countActiveInGroup("pattern", filters) ? () => set(resetGroup("pattern", filters)) : undefined}
        >
          <FilterPattern
            value={filters}
            onChange={set}
            showDoppler={showDoppler}
            weaponSelected={weaponSelected}
            catalogMode
          />
        </FilterAccordion>

        <FilterAccordion
          icon={<GearSixIcon className="size-4" />}
          title="Utility"
          activeCount={countActiveInGroup("utility", filters)}
          open={openMap.utility ?? false}
          onOpenChange={(o) => toggleAccordion("utility", o)}
          onReset={countActiveInGroup("utility", filters) ? () => set(resetGroup("utility", filters)) : undefined}
        >
          <FilterUtility value={filters} onChange={set} />
        </FilterAccordion>

        <p className="sr-only" aria-live="polite">
          {resultCount.toLocaleString()} results
        </p>
      </div>
    </TooltipProvider>
  )
}

export function FilterSidebar(props: Props) {
  const { sheetOpen, onSheetOpenChange, onFiltersChange, ...rest } = props
  const bp = useViewportBreakpoint()

  // Sticky must NOT share a node with overflow-auto — that breaks `position: sticky` in Chrome/Firefox.
  // Outer: sticky to viewport; inner: hug content, cap at viewport bottom, scroll when needed.
  const desktopScrollPanel = (
    <div
      className={cn(
        "flex h-fit w-[280px] min-w-[280px] min-h-0 flex-col gap-2 overflow-y-auto border border-border bg-surface/60 p-2",
        // Hug content; cap at viewport bottom (below sticky top offset 8rem + 10px gap).
        "max-h-[calc(100dvh-8rem-10px)]"
      )}
    >
      <FilterPanelBody {...rest} onFiltersChange={onFiltersChange} />
    </div>
  )

  return (
    <>
      <div className="hidden h-full min-h-0 lg:block">
        <div className="sticky top-[8rem] z-30 self-start">
          {desktopScrollPanel}
        </div>
      </div>
      {(bp === "mobile" || bp === "tablet") && (
        <Sheet open={sheetOpen} onOpenChange={onSheetOpenChange}>
          <SheetContent
            side={bp === "mobile" ? "bottom" : "left"}
            showCloseButton
            className={cn(
              bp === "mobile" &&
                "max-h-[calc(100dvh-env(safe-area-inset-bottom,0px))] p-0",
              bp === "tablet" && "max-h-[100dvh] min-h-0 p-0"
            )}
          >
            <SheetHeader className="border-b border-border px-3 py-2">
              <SheetTitle className="font-mono text-xs uppercase">Filters</SheetTitle>
            </SheetHeader>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                <FilterPanelBody {...rest} onFiltersChange={onFiltersChange} />
              </div>
              {bp === "mobile" ? (
                <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border bg-background/95 px-3 py-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="font-mono text-xs"
                    onClick={() => onFiltersChange(DEFAULT_MARKET_FILTERS)}
                  >
                    Clear all
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="font-mono text-xs"
                    onClick={() => onSheetOpenChange?.(false)}
                  >
                    Show {rest.resultCount.toLocaleString()} results
                  </Button>
                </div>
              ) : null}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  )
}
