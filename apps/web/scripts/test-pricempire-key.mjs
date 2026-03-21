/**
 * Quick test for PRICE_EMPIRE_API_KEY validity.
 * Run: node ./scripts/test-pricempire-key.mjs
 */
import fs from "node:fs"
import path from "node:path"
import process from "node:process"

const envPaths = [
  path.resolve(process.cwd(), ".env.local"),
  path.resolve(process.cwd(), "..", "..", ".env.local"),
]
const envRaw = envPaths
  .filter((p) => fs.existsSync(p))
  .map((p) => fs.readFileSync(p, "utf8"))
  .join("\n")

function readEnv(key) {
  const regex = new RegExp(`^${key}=(.*)$`, "gm")
  let match, last
  while ((match = regex.exec(envRaw)) !== null) last = match[1]
  const val = last?.trim().replace(/^["']|["']$/g, "")
  return val || process.env[key]
}

const apiKey = readEnv("PRICE_EMPIRE_API_KEY")
if (!apiKey) {
  console.error("PRICE_EMPIRE_API_KEY not set in .env.local")
  process.exit(1)
}

const url = new URL("https://api.pricempire.com/v4/paid/items/prices")
url.searchParams.set("app_id", "730")
url.searchParams.set("currency", "USD")
url.searchParams.set("type", "key") // minimal category for quick test
url.searchParams.set("avg", "false")
url.searchParams.set("median", "false")
url.searchParams.set("inflation_threshold", "-1")

const res = await fetch(url.toString(), {
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "User-Agent": "Grail/1.0 (+market cockpit)",
  },
})

if (res.ok) {
  const json = await res.json()
  const count = Array.isArray(json) ? json.length : 0
  console.log("✅ Price Empire API key is valid. Fetched", count, "items (type=key)")
} else {
  const text = await res.text()
  console.error("❌ Price Empire API key invalid or error:", res.status, text.slice(0, 200))
  process.exit(1)
}
