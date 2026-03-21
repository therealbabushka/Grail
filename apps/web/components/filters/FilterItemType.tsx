"use client"

import * as React from "react"

import { Button } from "@workspace/ui/components/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@workspace/ui/components/tooltip"

import { CATEGORY_OPTIONS } from "./market-filter-constants"
import type { MarketFiltersState } from "./market-filter-types"
import { SearchableMultiField } from "./FilterRarity"

type Props = {
  value: MarketFiltersState
  onChange: (next: MarketFiltersState) => void
  /** Distinct weapon names from the loaded catalog (exact match on filter) */
  availableWeapons?: string[]
}

function toggle(list: string[], v: string) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}

export function FilterItemType({ value, onChange, availableWeapons = [] }: Props) {
  function setStatTrak(on: boolean) {
    if (on && value.souvenir) {
      onChange({ ...value, statTrak: true, souvenir: false })
      return
    }
    onChange({ ...value, statTrak: on })
  }

  function setSouvenir(on: boolean) {
    if (on && value.statTrak) {
      onChange({ ...value, souvenir: true, statTrak: false })
      return
    }
    onChange({ ...value, souvenir: on })
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[12px] uppercase text-muted-foreground">Category</span>
          <div className="grid grid-cols-2 gap-1">
            {CATEGORY_OPTIONS.map((c) => {
              const active = value.categories.includes(c.id)
              return (
                <Button
                  key={c.id}
                  type="button"
                  size="xs"
                  variant={active ? "default" : "outline"}
                  className="justify-start font-mono text-[12px]"
                  onClick={() => onChange({ ...value, categories: toggle(value.categories, c.id) })}
                >
                  {c.label}
                </Button>
              )
            })}
          </div>
        </div>
        {availableWeapons.length > 0 ? (
          <SearchableMultiField
            label="Weapon"
            options={availableWeapons}
            selected={value.weapons}
            onToggle={(v) => onChange({ ...value, weapons: toggle(value.weapons, v) })}
          />
        ) : null}
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[12px] uppercase text-muted-foreground">Special tags</span>
          <div className="flex flex-wrap gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="xs"
                  variant={value.statTrak ? "default" : "outline"}
                  disabled={value.souvenir}
                  className="font-mono text-[12px]"
                  onClick={() => setStatTrak(!value.statTrak)}
                >
                  StatTrak™
                </Button>
              </TooltipTrigger>
              {value.souvenir ? <TooltipContent>Incompatible with Souvenir</TooltipContent> : null}
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="xs"
                  variant={value.souvenir ? "default" : "outline"}
                  disabled={value.statTrak}
                  className="font-mono text-[12px]"
                  onClick={() => setSouvenir(!value.souvenir)}
                >
                  Souvenir
                </Button>
              </TooltipTrigger>
              {value.statTrak ? <TooltipContent>Incompatible with StatTrak™</TooltipContent> : null}
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
