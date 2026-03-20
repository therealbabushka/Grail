import { NextResponse } from "next/server"
import fs from "node:fs/promises"
import path from "node:path"

type SkinportProgress = {
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

export async function GET() {
  try {
    const file = path.join(process.cwd(), ".cache", "skinport-progress.json")
    const raw = await fs.readFile(file, "utf8")
    const json = JSON.parse(raw) as SkinportProgress
    return NextResponse.json(json, { status: 200 })
  } catch {
    return NextResponse.json(
      {
        startedAt: undefined,
        updatedAt: undefined,
        total: 0,
        batchSize: 0,
        totalBatches: 0,
        currentBatch: 0,
        okBatches: 0,
        priced7: 0,
        lastStatus: undefined,
        lastMessage: "No progress file yet. Start the fetch job.",
        recent: [],
      } satisfies SkinportProgress,
      { status: 200 },
    )
  }
}

