"use client"

import * as React from "react"

import { Label } from "@workspace/ui/components/label"
import { Input } from "@workspace/ui/components/input"
import { Switch } from "@workspace/ui/components/switch"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Button } from "@workspace/ui/components/button"

import type { MarketFiltersState } from "./market-filter-types"

type Props = {
  value: MarketFiltersState
  onChange: (next: MarketFiltersState) => void
}

const SLOTS = [1, 2, 3, 4, 5] as const

function toggleNum(list: number[], n: number) {
  return list.includes(n) ? list.filter((x) => x !== n) : [...list, n].sort((a, b) => a - b)
}

/** Simple rifle silhouette with 5 slot hotspots (IA: spatial slot picker). */
function SlotSilhouette({
  selected,
  onToggle,
}: {
  selected: number[]
  onToggle: (n: number) => void
}) {
  const spots = [
    { id: 1 as const, x: 12, y: 18, w: 22, h: 14 },
    { id: 2 as const, x: 38, y: 22, w: 18, h: 12 },
    { id: 3 as const, x: 58, y: 26, w: 16, h: 12 },
    { id: 4 as const, x: 76, y: 22, w: 18, h: 12 },
    { id: 5 as const, x: 96, y: 18, w: 22, h: 14 },
  ]

  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-[12px] uppercase text-muted-foreground">Sticker slots</span>
      <svg viewBox="0 0 130 48" className="h-14 w-full border border-border bg-muted/10" role="img" aria-label="Weapon sticker slots">
        <rect x="4" y="12" width="122" height="22" rx="1" fill="currentColor" className="text-muted/20" />
        <rect x="8" y="16" width="114" height="14" rx="0" fill="currentColor" className="text-muted/10" />
        {spots.map((s) => (
          <rect
            key={s.id}
            x={s.x}
            y={s.y}
            width={s.w}
            height={s.h}
            rx="1"
            role="button"
            tabIndex={0}
            className={
              selected.includes(s.id)
                ? "cursor-pointer fill-primary/50 stroke-primary stroke-1"
                : "cursor-pointer fill-transparent stroke-border stroke-1 hover:fill-muted/40"
            }
            onClick={() => onToggle(s.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onToggle(s.id)
              }
            }}
          />
        ))}
      </svg>
      <div className="flex flex-wrap gap-2 font-mono text-[12px] text-muted-foreground">
        {SLOTS.map((n) => (
          <label key={n} className="flex items-center gap-1">
            <Checkbox
              checked={selected.includes(n)}
              onCheckedChange={() => onToggle(n)}
              aria-label={`Slot ${n}`}
            />
            Slot {n}
          </label>
        ))}
      </div>
    </div>
  )
}

export function FilterSticker({ value, onChange }: Props) {
  const [stickerDraft, setStickerDraft] = React.useState("")

  function addSticker() {
    const t = stickerDraft.trim()
    if (!t) return
    if (value.stickers.includes(t)) return
    onChange({ ...value, stickers: [...value.stickers, t] })
    setStickerDraft("")
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sticker-search" className="font-mono text-[12px] uppercase text-muted-foreground">
          Sticker (any slot)
        </Label>
        <div className="flex gap-1">
          <Input
            id="sticker-search"
            value={stickerDraft}
            onChange={(e) => setStickerDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addSticker()
            }}
            placeholder="Search stickers…"
            className="h-8 min-w-0 flex-1 font-mono text-xs"
          />
          <Button type="button" size="xs" variant="secondary" className="shrink-0 font-mono text-[12px]" onClick={addSticker}>
            Add
          </Button>
        </div>
        {value.stickers.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {value.stickers.map((s) => (
              <button
                key={s}
                type="button"
                className="border border-border bg-background px-1.5 py-0.5 font-mono text-[12px] hover:bg-muted"
                onClick={() => onChange({ ...value, stickers: value.stickers.filter((x) => x !== s) })}
              >
                {s} ×
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <SlotSilhouette selected={value.stickerSlots} onToggle={(n) => onChange({ ...value, stickerSlots: toggleNum(value.stickerSlots, n) })} />
      <div className="flex items-center justify-between gap-2 border border-border/60 bg-muted/20 px-2 py-1.5">
        <Label htmlFor="sticker-exact" className="cursor-pointer font-mono text-[12px]">
          Exact slot match
        </Label>
        <Switch
          id="sticker-exact"
          checked={value.stickerExactMatch}
          onCheckedChange={(c) => onChange({ ...value, stickerExactMatch: Boolean(c) })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="charm" className="font-mono text-[12px] uppercase text-muted-foreground">
          Charm
        </Label>
        <Input
          id="charm"
          value={value.charm}
          onChange={(e) => onChange({ ...value, charm: e.target.value })}
          placeholder="Charm name…"
          className="h-8 font-mono text-xs"
        />
      </div>
      {value.charm.trim() ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="charm-pmin" className="font-mono text-[12px] text-muted-foreground">
              Pattern min
            </Label>
            <Input
              id="charm-pmin"
              inputMode="numeric"
              value={value.charmPatternMin}
              onChange={(e) => onChange({ ...value, charmPatternMin: e.target.value })}
              className="h-8 font-mono text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="charm-pmax" className="font-mono text-[12px] text-muted-foreground">
              Pattern max
            </Label>
            <Input
              id="charm-pmax"
              inputMode="numeric"
              value={value.charmPatternMax}
              onChange={(e) => onChange({ ...value, charmPatternMax: e.target.value })}
              className="h-8 font-mono text-xs"
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
