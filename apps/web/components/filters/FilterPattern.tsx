"use client"

import { Label } from "@workspace/ui/components/label"
import { Input } from "@workspace/ui/components/input"
import { Switch } from "@workspace/ui/components/switch"
import { Button } from "@workspace/ui/components/button"

import { DOPPLER_PHASES } from "./market-filter-constants"
import type { MarketFiltersState } from "./market-filter-types"

type Props = {
  value: MarketFiltersState
  onChange: (next: MarketFiltersState) => void
  showDoppler: boolean
  weaponSelected: boolean
  /** Static catalog has no float ranks — disable rank controls */
  catalogMode?: boolean
}

function toggle(list: string[], v: string) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}

export function FilterPattern({ value, onChange, showDoppler, weaponSelected, catalogMode }: Props) {
  const patternUnlocked = weaponSelected
  const rankDisabled = Boolean(catalogMode)

  return (
    <div className="flex flex-col gap-3">
      {!weaponSelected ? (
        <p className="font-mono text-[12px] leading-relaxed text-muted-foreground">
          Select a category or weapon above to unlock pattern filters.
        </p>
      ) : null}
      {catalogMode ? (
        <p className="font-mono text-[12px] leading-relaxed text-muted-foreground">
          Global / item ranks apply to live listings, not the static skin catalog.
        </p>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="paint-seed" className="font-mono text-[12px] uppercase text-muted-foreground">
          Paint seed
        </Label>
        <Input
          id="paint-seed"
          inputMode="numeric"
          value={value.paintSeed}
          onChange={(e) => onChange({ ...value, paintSeed: e.target.value })}
          placeholder={patternUnlocked ? "0 – 1000" : "Select a weapon first"}
          disabled={!patternUnlocked}
          aria-disabled={!patternUnlocked}
          className="h-8 font-mono text-xs"
        />
      </div>
      {showDoppler ? (
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[12px] uppercase text-muted-foreground">Doppler phase</span>
          <div className="flex flex-wrap gap-1">
            {DOPPLER_PHASES.map((p) => {
              const active = value.dopplerPhases.includes(p)
              return (
                <Button
                  key={p}
                  type="button"
                  size="xs"
                  variant={active ? "default" : "outline"}
                  className="font-mono text-[12px]"
                  onClick={() => onChange({ ...value, dopplerPhases: toggle(value.dopplerPhases, p) })}
                >
                  {p}
                </Button>
              )
            })}
          </div>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label className="font-mono text-[12px] text-muted-foreground">Global rank low</Label>
          <Input
            inputMode="numeric"
            value={value.rankGlobalLow}
            onChange={(e) => onChange({ ...value, rankGlobalLow: e.target.value })}
            disabled={rankDisabled}
            aria-disabled={rankDisabled}
            className="h-8 font-mono text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="font-mono text-[12px] text-muted-foreground">Global rank high</Label>
          <Input
            inputMode="numeric"
            value={value.rankGlobalHigh}
            onChange={(e) => onChange({ ...value, rankGlobalHigh: e.target.value })}
            disabled={rankDisabled}
            aria-disabled={rankDisabled}
            className="h-8 font-mono text-xs"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label className="font-mono text-[12px] text-muted-foreground">Item rank low</Label>
          <Input
            inputMode="numeric"
            value={value.rankItemLow}
            onChange={(e) => onChange({ ...value, rankItemLow: e.target.value })}
            placeholder={weaponSelected ? "" : "Select a category or weapon first"}
            disabled={rankDisabled || !weaponSelected}
            aria-disabled={rankDisabled || !weaponSelected}
            className="h-8 font-mono text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="font-mono text-[12px] text-muted-foreground">Item rank high</Label>
          <Input
            inputMode="numeric"
            value={value.rankItemHigh}
            onChange={(e) => onChange({ ...value, rankItemHigh: e.target.value })}
            placeholder={weaponSelected ? "" : "Select a category or weapon first"}
            disabled={rankDisabled || !weaponSelected}
            aria-disabled={rankDisabled || !weaponSelected}
            className="h-8 font-mono text-xs"
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border border-border/60 bg-muted/20 px-2 py-1.5">
        <Label htmlFor="ranked-only" className={rankDisabled ? "font-mono text-[12px] text-muted-foreground" : "cursor-pointer font-mono text-[12px]"}>
          Ranked items only
        </Label>
        <Switch
          id="ranked-only"
          checked={value.rankedOnly}
          disabled={rankDisabled}
          onCheckedChange={(c) => onChange({ ...value, rankedOnly: Boolean(c) })}
        />
      </div>
    </div>
  )
}
