"use client"

import { Button } from "@workspace/ui/components/button"

type Props = {
  onClearAll: () => void
}

export function MarketFilterEmptyState({ onClearAll }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div
        className="flex size-24 items-center justify-center border border-dashed border-border bg-muted/20 font-mono text-4xl text-muted-foreground"
        aria-hidden
      >
        ∅
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="font-mono text-lg font-semibold tracking-tight">No skins match your filters</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Try removing a filter or broadening your price range
        </p>
      </div>
      <Button type="button" className="font-mono text-xs" onClick={onClearAll}>
        Clear all filters
      </Button>
    </div>
  )
}
