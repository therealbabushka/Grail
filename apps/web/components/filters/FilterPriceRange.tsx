"use client"

import { Label } from "@workspace/ui/components/label"
import { Input } from "@workspace/ui/components/input"
import { Slider } from "@workspace/ui/components/slider"
import { Switch } from "@workspace/ui/components/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@workspace/ui/components/tooltip"

import { PRICE_PROVIDER_OPTIONS } from "./market-filter-constants"
import type { MarketFiltersState } from "./market-filter-types"

type Props = {
  value: MarketFiltersState
  onChange: (next: MarketFiltersState) => void
}

const SLIDER_MAX = 5000

function parsePrice(s: string): number {
  const n = Number(String(s).replace(/[^0-9.-]/g, ""))
  return Number.isFinite(n) ? n : 0
}

export function FilterPriceRange({ value, onChange }: Props) {
  const minV = parsePrice(value.priceMin)
  const maxV = Math.max(parsePrice(value.priceMax), minV)
  const sliderVal = [Math.min(minV, SLIDER_MAX), Math.min(Math.max(maxV, minV), SLIDER_MAX)]

  const providerDisabled = !value.marketItemsOnly

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[12px] uppercase text-muted-foreground">Price range ($)</span>
          <p className="font-mono text-[11px] leading-snug text-muted-foreground">
            Min/max use per-item snapshot USD when the catalog is loaded from the database (with pricing data).
          </p>
          <Slider
            min={0}
            max={SLIDER_MAX}
            step={10}
            value={sliderVal}
            onValueChange={(v) => {
              const a = v[0]
              const b = v[1]
              if (typeof a !== "number" || typeof b !== "number") return
              onChange({
                ...value,
                priceMin: String(Math.min(a, b)),
                priceMax: String(Math.max(a, b)),
              })
            }}
            aria-label="Price range"
          />
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="price-min" className="sr-only">
                Min price
              </Label>
              <Input
                id="price-min"
                inputMode="decimal"
                value={value.priceMin}
                onChange={(e) => onChange({ ...value, priceMin: e.target.value })}
                placeholder="Min"
                className="h-8 font-mono text-xs"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="price-max" className="sr-only">
                Max price
              </Label>
              <Input
                id="price-max"
                inputMode="decimal"
                value={value.priceMax}
                onChange={(e) => onChange({ ...value, priceMax: e.target.value })}
                placeholder="Max"
                className="h-8 font-mono text-xs"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1">
            <Label className="font-mono text-[12px] uppercase text-muted-foreground">Price provider</Label>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={providerDisabled ? "pointer-events-none opacity-50" : ""}>
                <Select
                  value={value.priceProvider}
                  disabled={providerDisabled}
                  onValueChange={(v) => onChange({ ...value, priceProvider: v })}
                >
                  <SelectTrigger className="h-8" aria-disabled={providerDisabled}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICE_PROVIDER_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TooltipTrigger>
            {providerDisabled ? (
              <TooltipContent side="top">Enable market items to filter by provider</TooltipContent>
            ) : null}
          </Tooltip>
        </div>
        <div className="flex items-center justify-between gap-2 border border-border/60 bg-muted/20 px-2 py-1.5">
          <Label htmlFor="market-only" className="cursor-pointer font-mono text-[12px]">
            Market items only
          </Label>
          <Switch
            id="market-only"
            checked={value.marketItemsOnly}
            onCheckedChange={(c) => onChange({ ...value, marketItemsOnly: Boolean(c) })}
          />
        </div>
      </div>
    </TooltipProvider>
  )
}
