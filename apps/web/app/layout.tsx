import Script from "next/script"
import { DM_Sans, JetBrains_Mono } from "next/font/google"

import "@workspace/ui/globals.css"
import { MainContentWidth } from "@/components/main-content-width"
import { ThemeProvider } from "@/components/theme-provider"
import { TopTabs } from "@/components/top-tabs"
import { cn } from "@workspace/ui/lib/utils"

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("min-h-full min-w-0 antialiased", jetbrainsMono.variable, dmSans.variable)}
    >
      <body className="min-w-0 w-full font-sans">
        {/* Figma html-to-design injects inspector UI (borders/overlays). Opt-in so normal reloads stay clean. */}
        {process.env.NEXT_PUBLIC_FIGMA_HTML_CAPTURE === "1" ? (
          <Script src="https://mcp.figma.com/mcp/html-to-design/capture.js" strategy="afterInteractive" />
        ) : null}
        <ThemeProvider>
          <a
            href="#main"
            className="absolute left-2 top-2 z-[100] rounded border border-border bg-background px-2 py-1 font-mono text-xs opacity-0 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Skip to main content
          </a>
          <TopTabs />
          <div id="main" className="min-w-0 w-full">
            <MainContentWidth>{children}</MainContentWidth>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
