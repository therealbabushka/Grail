/**
 * One-time Price Empire bulk seed. Uses PRICE_EMPIRE_API_KEY + auth secret from .env.local.
 * Run: npm run pricing:pricempire-sync
 */
import fs from "node:fs"
import path from "node:path"
import process from "node:process"

const envPaths = [
  path.resolve(process.cwd(), ".env.local"),
  path.resolve(process.cwd(), "..", "..", ".env.local"), // monorepo root
]
const envRaw = envPaths
  .filter((p) => fs.existsSync(p))
  .map((p) => fs.readFileSync(p, "utf8"))
  .join("\n")

function readEnv(key) {
  // Match all occurrences (from multiple .env files), take last non-empty
  const regex = new RegExp(`^${key}=(.*)$`, "gm")
  let match
  let last
  while ((match = regex.exec(envRaw)) !== null) last = match[1]
  const val = last?.trim().replace(/^["']|["']$/g, "")
  return val || process.env[key]
}

// Prefer PRICE_EMPIRE_SYNC_SECRET so script and server (apps/web env) use same value
const secret =
  readEnv("PRICE_EMPIRE_SYNC_SECRET") ??
  readEnv("PRICING_SCRAPE_SECRET") ??
  readEnv("CATALOG_SYNC_SECRET") ??
  readEnv("CRON_SECRET")

// Script can read API key from .env.local; pass to API when server env doesn't load it (e.g. turbo)
const apiKey = readEnv("PRICE_EMPIRE_API_KEY")
const baseUrl = process.env.CATALOG_BASE_URL ?? "http://localhost:3000"
const maxCalls = Number(process.env.PRICEMPIRE_MAX_CALLS ?? "50")
const types = process.env.PRICEMPIRE_TYPES ?? "weapon,sticker,container,key,agent"
const dryRun = process.env.PRICEMPIRE_DRY_RUN === "1"

if (!secret) {
  console.error(
    "Missing auth secret. Add one to apps/web/.env.local:\n" +
      "  PRICE_EMPIRE_SYNC_SECRET=your-secret (for local runs)\n" +
      "  or PRICING_SCRAPE_SECRET / CATALOG_SYNC_SECRET / CRON_SECRET"
  )
  process.exit(1)
}

async function run() {
  const url = new URL("/api/pricing/pricempire-sync", baseUrl)
  url.searchParams.set("currency", "USD")
  url.searchParams.set("maxCalls", String(maxCalls))
  url.searchParams.set("types", types)
  if (dryRun) url.searchParams.set("dryRun", "1")
  if (apiKey) url.searchParams.set("apiKey", apiKey)

  const logUrl = url.toString().replace(/apiKey=[^&]+/, "apiKey=***")
  console.log("Fetching Price Empire data...", logUrl)
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${secret}`,
      "x-pricempire-sync-secret": secret,
    },
  })
  const json = await res.json()

  if (!res.ok) {
    console.error("Sync failed:", json)
    process.exit(1)
  }

  console.log("Done:", JSON.stringify(json, null, 2))
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
