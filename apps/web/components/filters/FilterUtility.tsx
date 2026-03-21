"use client"

import * as React from "react"
import { ListBullets, SquaresFour } from "@phosphor-icons/react"

import { Label } from "@workspace/ui/components/label"
import { Input } from "@workspace/ui/components/input"
import { Switch } from "@workspace/ui/components/switch"
import { Button } from "@workspace/ui/components/button"

import type { MarketFiltersState } from "./market-filter-types"
import { validateSteamIdInput } from "./market-filter-utils"
import { cn } from "@workspace/ui/lib/utils"

type Props = {
  value: MarketFiltersState
  onChange: (next: MarketFiltersState) => void
}

export function FilterUtility({ value, onChange }: Props) {
  const [steamErr, setSteamErr] = React.useState<string | null>(null)

  function onSteamBlur() {
    const err = validateSteamIdInput(value.steamId)
    setSteamErr(err)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="steam-id" className="font-mono text-[12px] uppercase text-muted-foreground">
          Steam ID / profile
        </Label>
        <Input
          id="steam-id"
          value={value.steamId}
          onChange={(e) => {
            onChange({ ...value, steamId: e.target.value })
            if (steamErr) setSteamErr(null)
          }}
          onBlur={onSteamBlur}
          placeholder="Steam ID64 or vanity slug"
          className={cn("h-8 font-mono text-xs", steamErr && "border-destructive")}
          aria-invalid={Boolean(steamErr)}
        />
        {steamErr ? <p className="font-mono text-[12px] text-destructive">{steamErr}</p> : null}
      </div>
      <div className="flex items-center justify-between gap-2 border border-border/60 bg-muted/20 px-2 py-1.5">
        <Label htmlFor="exclude-owned" className="cursor-pointer font-mono text-[12px]">
          Exclude user-owned
        </Label>
        <Switch
          id="exclude-owned"
          checked={value.excludeOwned}
          onCheckedChange={(c) => onChange({ ...value, excludeOwned: Boolean(c) })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[12px] uppercase text-muted-foreground">View mode</span>
        <div className="flex gap-1">
          <Button
            type="button"
            size="xs"
            variant={value.viewMode === "grid" ? "default" : "outline"}
            className="flex-1 font-mono text-[12px]"
            onClick={() => onChange({ ...value, viewMode: "grid" })}
            aria-pressed={value.viewMode === "grid"}
          >
            <SquaresFour className="mr-1 inline size-3.5" />
            Grid
          </Button>
          <Button
            type="button"
            size="xs"
            variant={value.viewMode === "list" ? "default" : "outline"}
            className="flex-1 font-mono text-[12px]"
            onClick={() => onChange({ ...value, viewMode: "list" })}
            aria-pressed={value.viewMode === "list"}
          >
            <ListBullets className="mr-1 inline size-3.5" />
            List
          </Button>
        </div>
      </div>
    </div>
  )
}
