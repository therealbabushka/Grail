import Script from "next/script"
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google"

import "@workspace/ui/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { TopTabs } from "@/components/top-tabs"
import { cn } from "@workspace/ui/lib/utils";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const jetbrainsMono = JetBrains_Mono({subsets:['latin'],variable:'--font-mono'})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontSans.variable, jetbrainsMono.variable)}
    >
      <body className="font-sans">
        <Script src="https://mcp.figma.com/mcp/html-to-design/capture.js" strategy="afterInteractive" />
        <ThemeProvider>
          <a
            href="#main"
            className="absolute left-2 top-2 z-[100] rounded border border-border bg-background px-2 py-1 font-mono text-xs opacity-0 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Skip to main content
          </a>
          <TopTabs />
          <div id="main">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  )
}
