"use client"

import { usePathname } from "next/navigation"

import { cn } from "@workspace/ui/lib/utils"

export function MainContentWidth({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isMarketListings = pathname === "/market" || pathname === "/market/"

  return (
    <div
      className={cn(
        "min-w-0 w-full border border-[rgba(30,30,30,1)] mx-auto",
        isMarketListings ? "max-w-none" : "max-w-[1600px]"
      )}
    >
      {children}
    </div>
  )
}
