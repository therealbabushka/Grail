import fs from "node:fs"
import path from "node:path"
import process from "node:process"

const envPath = path.resolve(process.cwd(), ".env.local")
const envRaw = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : ""

function readEnv(key) {
  const regex = new RegExp(`^${key}=(.*)$`, "m")
  const match = envRaw.match(regex)
  if (!match) return process.env[key]
  return match[1].trim()
}

const syncSecret = readEnv("CATALOG_SYNC_SECRET")
const baseUrl = process.env.CATALOG_BASE_URL || "http://localhost:3000"
const count = Number.parseInt(process.env.CATALOG_SYNC_COUNT || "100", 10)
const pagesPerRequest = Number.parseInt(process.env.CATALOG_SYNC_PAGES || "10", 10)

if (!syncSecret) {
  console.error("Missing CATALOG_SYNC_SECRET in apps/web/.env.local")
  process.exit(1)
}

async function run() {
  let start = 0
  let totalCount = Number.POSITIVE_INFINITY
  let rounds = 0

  while (start < totalCount && rounds < 500) {
    const url = new URL("/api/catalog/sync", baseUrl)
    url.searchParams.set("start", String(start))
    url.searchParams.set("count", String(count))
    url.searchParams.set("pages", String(pagesPerRequest))

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "x-catalog-sync-secret": syncSecret,
      },
    })
    const json = await res.json()
    if (!res.ok) {
      console.error("Sync request failed:", json)
      process.exit(1)
    }

    totalCount = Number.isFinite(json.totalCount) ? json.totalCount : totalCount
    start = Number.isFinite(json.nextStart) ? json.nextStart : start + count
    rounds += 1

    console.log(
      `[sync] round=${rounds} processed=${json.processed} upserted=${json.upserted} nextStart=${start} total=${totalCount}`
    )

    if (!json.processed) break
  }

  console.log("[sync] done")
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})

