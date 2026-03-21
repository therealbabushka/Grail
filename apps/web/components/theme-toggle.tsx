"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Moon, Sun } from "@phosphor-icons/react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = resolvedTheme === "dark"

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8 shrink-0 rounded-none border border-transparent", className)}
      aria-label={mounted ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle color theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {!mounted ? (
        <Moon weight="bold" className="h-4 w-4" />
      ) : isDark ? (
        <Sun weight="bold" className="h-4 w-4" />
      ) : (
        <Moon weight="bold" className="h-4 w-4" />
      )}
    </Button>
  )
}

