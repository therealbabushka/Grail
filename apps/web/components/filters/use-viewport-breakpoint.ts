"use client"

import * as React from "react"

export type ViewportBreakpoint = "mobile" | "tablet" | "desktop"

export function useViewportBreakpoint(): ViewportBreakpoint {
  const [bp, setBp] = React.useState<ViewportBreakpoint>("desktop")

  React.useEffect(() => {
    function read() {
      if (typeof window === "undefined") return
      const w = window.innerWidth
      if (w < 768) setBp("mobile")
      else if (w < 1024) setBp("tablet")
      else setBp("desktop")
    }
    read()
    window.addEventListener("resize", read)
    return () => window.removeEventListener("resize", read)
  }, [])

  return bp
}
