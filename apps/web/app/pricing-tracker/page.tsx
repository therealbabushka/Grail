"use client"

import { useEffect, useMemo, useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"

type Progress = {
  startedAt?: string
  updatedAt?: string
  total?: number
  batchSize?: number
  totalBatches?: number
  currentBatch?: number
  okBatches?: number
  priced7?: number
  lastStatus?: number
  lastMessage?: string
  recent?: Array<{ ts: string; msg: string }>
}

function pct(n: number, d: number) {
  if (!Number.isFinite(n) || !Number.isFinite(d) || d <= 0) return 0
  return Math.max(0, Math.min(100, (n / d) * 100))
}

export default function PricingTrackerPage() {
  const [p, setP] = useState<Progress | null>(null)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const res = await fetch("/api/pricing/skinport-progress", { cache: "no-store" })
        const json = (await res.json()) as Progress
        if (!cancelled) setP(json)
      } catch {
        if (!cancelled) setP({ lastMessage: "Failed to load progress." })
      }
    }

    poll()
    const t = setInterval(poll, 2000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [])

  const total = p?.total ?? 0
  const currentBatch = p?.currentBatch ?? 0
  const totalBatches = p?.totalBatches ?? 0
  const priced7 = p?.priced7 ?? 0
  const donePct = useMemo(() => pct(currentBatch, totalBatches), [currentBatch, totalBatches])

  return (
    <main className="min-h-screen w-full min-w-0 bg-background px-10 py-10 text-foreground">
      <div className="w-full space-y-6">
        <header>
          <h1 className="font-mono text-2xl font-bold tracking-tight">Live pricing tracker</h1>
          <p className="mt-1 text-xs text-text-secondary">
            Tracks the Skinport full-catalog fetch job. Refreshes every ~2s.
          </p>
        </header>

        <Card className="bg-background/40 backdrop-blur">
          <CardHeader>
            <CardTitle className="font-mono text-sm">Skinport batch progress</CardTitle>
            <CardDescription className="text-xs">
              {p?.lastMessage ?? "—"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Batches</span>
                <span className="font-mono tabular-nums">
                  {currentBatch} / {totalBatches} ({donePct.toFixed(1)}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-none border border-border bg-background/40">
                <div
                  className="h-full bg-info/60"
                  style={{ width: `${donePct}%` }}
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Row label="Catalog size" value={total ? total.toLocaleString() : "—"} />
              <Row label="7d median coverage" value={priced7 ? priced7.toLocaleString() : "—"} />
              <Row label="OK batches" value={String(p?.okBatches ?? "—")} />
              <Row label="Last status" value={p?.lastStatus != null ? String(p.lastStatus) : "—"} />
              <Row label="Started" value={p?.startedAt ? new Date(p.startedAt).toLocaleString() : "—"} />
              <Row label="Updated" value={p?.updatedAt ? new Date(p.updatedAt).toLocaleString() : "—"} />
            </div>

            <div className="pt-2">
              <p className="mb-2 font-mono text-[12px] uppercase tracking-wider text-text-secondary">
                Recent
              </p>
              <div className="max-h-72 overflow-auto rounded-none border border-border bg-background/30 p-2">
                {p?.recent?.length ? (
                  <ul className="space-y-1 font-mono text-[12px]">
                    {p.recent.slice().reverse().slice(0, 30).map((e, idx) => (
                      <li key={`${e.ts}_${idx}`} className="flex gap-2">
                        <span className="text-text-muted tabular-nums">{new Date(e.ts).toLocaleTimeString()}</span>
                        <span className="text-foreground">{e.msg}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[12px] text-text-muted">No events yet.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-none border border-border bg-surface/50 px-2 py-1.5">
      <span className="text-[12px] text-text-secondary">{label}</span>
      <span className="font-mono text-[12px] text-foreground tabular-nums">{value}</span>
    </div>
  )
}

