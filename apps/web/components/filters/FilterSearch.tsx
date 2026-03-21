"use client"

import { Label } from "@workspace/ui/components/label"
import { Input } from "@workspace/ui/components/input"
import { Switch } from "@workspace/ui/components/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Button } from "@workspace/ui/components/button"

import { ITEMS_PER_PAGE_OPTIONS, SORT_OPTIONS } from "./market-filter-constants"
import type { MarketFiltersState } from "./market-filter-types"

type Props = {
  value: MarketFiltersState
  onChange: (next: MarketFiltersState) => void
}

export function FilterSearch({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-keyword" className="font-mono text-[12px] uppercase text-muted-foreground">
          Keyword
        </Label>
        <Input
          id="filter-keyword"
          value={value.keyword}
          onChange={(e) => onChange({ ...value, keyword: e.target.value })}
          placeholder="Skin, weapon, collection…"
          className="h-8 font-mono text-xs"
          autoComplete="off"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="font-mono text-[12px] uppercase text-muted-foreground">Sort by</Label>
        <Select value={value.sortBy} onValueChange={(v) => onChange({ ...value, sortBy: v as MarketFiltersState["sortBy"] })}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[12px] uppercase text-muted-foreground">Items per page</span>
        <div className="flex gap-1">
          {ITEMS_PER_PAGE_OPTIONS.map((n) => (
            <Button
              key={n}
              type="button"
              size="xs"
              variant={value.itemsPerPage === n ? "default" : "outline"}
              className="min-w-0 flex-1 font-mono text-[12px]"
              onClick={() => onChange({ ...value, itemsPerPage: n })}
            >
              {n}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border border-border/60 bg-muted/20 px-2 py-1.5">
        <Label htmlFor="filter-group-items" className="cursor-pointer font-mono text-[12px]">
          Group items
        </Label>
        <Switch
          id="filter-group-items"
          checked={value.groupItems}
          onCheckedChange={(c) => onChange({ ...value, groupItems: Boolean(c) })}
        />
      </div>
    </div>
  )
}
