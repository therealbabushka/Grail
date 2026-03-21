"use client"

import { Label } from "@workspace/ui/components/label"
import { Slider } from "@workspace/ui/components/slider"
import { Button } from "@workspace/ui/components/button"

import { WEAR_BANDS, WEAR_ORDER, type WearCode } from "./market-filter-constants"
import type { MarketFiltersState } from "./market-filter-types"
import { unionWearFloatBounds } from "./market-filter-utils"

type Props = {
  value: MarketFiltersState
  onChange: (next: MarketFiltersState) => void
}

const SCALE = 1000

function toScaled(f: number) {
  return Math.round(f * SCALE)
}

function fromScaled(n: number) {
  return Math.min(1, Math.max(0, n / SCALE))
}

export function FilterWearCondition({ value, onChange }: Props) {
  const showFloat = value.wear.length > 0
  const bounds = unionWearFloatBounds(value.wear)

  const floatMin = value.floatMin ?? bounds.min
  const floatMax = value.floatMax ?? bounds.max

  function toggleWear(w: WearCode) {
    const nextWear = value.wear.includes(w) ? value.wear.filter((x) => x !== w) : [...value.wear, w]
    if (!nextWear.length) {
      onChange({ ...value, wear: [], floatMin: null, floatMax: null })
      return
    }
    const u = unionWearFloatBounds(nextWear)
    onChange({
      ...value,
      wear: nextWear,
      floatMin: u.min,
      floatMax: u.max,
    })
  }

  const aScaled = toScaled(floatMin)
  const bScaled = toScaled(floatMax)
  const sliderVal: [number, number] = [Math.min(aScaled, bScaled), Math.max(aScaled, bScaled)]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[12px] uppercase text-muted-foreground">Wear condition</span>
        <div className="flex flex-wrap gap-1">
          {WEAR_ORDER.map((code) => {
            const active = value.wear.includes(code)
            return (
              <Button
                key={code}
                type="button"
                size="xs"
                variant={active ? "default" : "outline"}
                className="min-w-9 font-mono text-[12px]"
                onClick={() => toggleWear(code)}
              >
                {WEAR_BANDS[code].label}
              </Button>
            )
          })}
        </div>
      </div>
      {showFloat ? (
        <div className="flex flex-col gap-2">
          <Label className="font-mono text-[12px] uppercase text-muted-foreground">Float range</Label>
          <Slider
            min={toScaled(bounds.min)}
            max={toScaled(bounds.max)}
            step={1}
            value={sliderVal}
            onValueChange={(v) => {
              const rawA = v[0]
              const rawB = v[1]
              if (typeof rawA !== "number" || typeof rawB !== "number") return
              const a = fromScaled(rawA)
              const b = fromScaled(rawB)
              onChange({
                ...value,
                floatMin: Math.min(a, b),
                floatMax: Math.max(a, b),
              })
            }}
            aria-valuemin={bounds.min}
            aria-valuemax={bounds.max}
            aria-valuenow={floatMin}
          />
          <div className="flex justify-between font-mono text-[12px] text-muted-foreground">
            <span>{floatMin.toFixed(3)}</span>
            <span>{floatMax.toFixed(3)}</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
