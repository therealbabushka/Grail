"use client"

import * as React from "react"
import { CaretDownIcon } from "@phosphor-icons/react"

import { Button } from "@workspace/ui/components/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@workspace/ui/components/collapsible"
import { cn } from "@workspace/ui/lib/utils"

type FilterAccordionProps = {
  icon: React.ReactNode
  title: string
  activeCount: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onReset?: () => void
  children: React.ReactNode
  /** When true, header is non-collapsible (always open). */
  pinned?: boolean
}

export function FilterAccordion({
  icon,
  title,
  activeCount,
  open,
  onOpenChange,
  onReset,
  children,
  pinned = false,
}: FilterAccordionProps) {
  const badgeLabel = activeCount > 0 ? `${activeCount} active filters in ${title}` : undefined
  const contentId = React.useId()

  if (pinned) {
    return (
      <div className="border border-border bg-background/40">
        <div className="flex items-center gap-2 border-b border-border/80 px-3 py-2.5">
          <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>
          <span className="font-mono text-[12px] font-semibold uppercase tracking-wide">{title}</span>
          {activeCount > 0 ? (
            <span
              className="ml-1 rounded-none bg-primary px-1.5 py-0.5 font-mono text-[12px] text-primary-foreground"
              aria-label={badgeLabel}
            >
              {activeCount}
            </span>
          ) : null}
          {activeCount > 0 && onReset ? (
            <Button type="button" variant="ghost" size="xs" className="ml-auto shrink-0 font-mono text-[12px]" onClick={onReset}>
              Reset
            </Button>
          ) : null}
        </div>
        <div className="px-3 py-3">{children}</div>
      </div>
    )
  }

  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="border border-border bg-background/40">
      <div className="flex w-full min-w-0 items-center gap-2 px-2">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex min-h-10 min-w-0 flex-1 items-center gap-2 px-1 py-2 text-left outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-expanded={open}
            aria-controls={contentId}
          >
            <span className="shrink-0 text-muted-foreground [&_svg]:size-4">{icon}</span>
            <span className="min-w-0 flex-1 truncate font-mono text-[12px] font-semibold uppercase tracking-wide">
              {title}
            </span>
            {activeCount > 0 ? (
              <span
                className="shrink-0 rounded-none bg-primary px-1.5 py-0.5 font-mono text-[12px] text-primary-foreground"
                aria-label={badgeLabel}
              >
                {activeCount}
              </span>
            ) : null}
          </button>
        </CollapsibleTrigger>
        {activeCount > 0 && onReset ? (
          <Button type="button" variant="ghost" size="xs" className="shrink-0 font-mono text-[12px]" onClick={onReset}>
            Reset
          </Button>
        ) : null}
        <button
          type="button"
          className="inline-flex h-10 w-9 shrink-0 items-center justify-center rounded-none text-muted-foreground outline-none transition-colors hover:bg-muted/40 focus-visible:ring-1 focus-visible:ring-ring"
          aria-expanded={open}
          aria-controls={contentId}
          aria-label={`${open ? "Collapse" : "Expand"} ${title}`}
          onClick={() => onOpenChange(!open)}
        >
          <CaretDownIcon
            className={cn(
              "size-4 transition-transform duration-150 ease-out",
              open && "rotate-180"
            )}
            aria-hidden
          />
        </button>
      </div>
      <CollapsibleContent id={contentId} className="overflow-hidden transition-[height] duration-150 ease-out">
        <div className="px-3 pb-3">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}
