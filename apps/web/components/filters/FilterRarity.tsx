"use client"

import * as React from "react"
import { MagnifyingGlassIcon } from "@phosphor-icons/react"

import { Input } from "@workspace/ui/components/input"
import { Button } from "@workspace/ui/components/button"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover"
import { cn } from "@workspace/ui/lib/utils"

import { RARITY_TIERS, SAMPLE_CASES, SAMPLE_COLLECTIONS } from "./market-filter-constants"
import type { MarketFiltersState } from "./market-filter-types"

type Props = {
  value: MarketFiltersState
  onChange: (next: MarketFiltersState) => void
  /** When provided, rarity chips are limited to catalog values */
  availableRarities?: string[]
}

function toggle(list: string[], v: string) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}

export function SearchableMultiField({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string
  options: string[]
  selected: string[]
  onToggle: (v: string) => void
}) {
  const [q, setQ] = React.useState("")
  const filtered = React.useMemo(() => {
    const n = q.trim().toLowerCase()
    if (!n) return options
    return options.filter((o) => o.toLowerCase().includes(n))
  }, [options, q])

  const shown = filtered.slice(0, 80)

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[12px] uppercase text-muted-foreground">{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="h-8 w-full justify-start font-mono text-[12px]">
            {selected.length ? `${selected.length} selected` : `Select ${label.toLowerCase()}…`}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-w-[280px] p-0" align="start">
          <div className="flex flex-col gap-1 border-b border-border p-2">
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="h-8 pl-8 font-mono text-xs"
              />
            </div>
          </div>
          <ScrollArea className="h-[min(8*2.25rem,12rem)]">
            <div className="flex flex-col gap-0.5 p-1">
              {shown.map((o) => (
                <button
                  key={o}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between px-2 py-1.5 text-left font-mono text-[12px] hover:bg-muted",
                    selected.includes(o) && "bg-muted"
                  )}
                  onClick={() => onToggle(o)}
                >
                  <span className="truncate">{o}</span>
                  <span>{selected.includes(o) ? "✓" : ""}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {selected.slice(0, 2).map((s) => (
            <span key={s} className="border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[12px]">
              {s}
            </span>
          ))}
          {selected.length > 2 ? (
            <span className="font-mono text-[12px] text-muted-foreground">+ {selected.length - 2} more</span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function FilterRarity({ value, onChange, availableRarities }: Props) {
  const raritySource = availableRarities?.length
    ? RARITY_TIERS.filter((t) => availableRarities.includes(t.id))
    : [...RARITY_TIERS]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[12px] uppercase text-muted-foreground">Rarity tier</span>
        <div className="flex flex-wrap gap-1">
          {raritySource.map((t) => {
            const active = value.rarities.includes(t.id)
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onChange({ ...value, rarities: toggle(value.rarities, t.id) })}
                className={cn(
                  "rounded-none border px-2 py-1 font-mono text-[12px] transition-colors",
                  t.chipClass,
                  active ? "ring-1 ring-ring" : "opacity-80 hover:opacity-100"
                )}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>
      <SearchableMultiField
        label="Collection"
        options={[...SAMPLE_COLLECTIONS]}
        selected={value.collections}
        onToggle={(v) => onChange({ ...value, collections: toggle(value.collections, v) })}
      />
      <SearchableMultiField
        label="Container / case"
        options={[...SAMPLE_CASES]}
        selected={value.cases}
        onToggle={(v) => onChange({ ...value, cases: toggle(value.cases, v) })}
      />
    </div>
  )
}
