export type Currency = "USD" | "EUR" | "GBP" | "CNY"
export type Wear = "FN" | "MW" | "FT" | "WW" | "BS"
export type Variant = "none" | "stattrak" | "souvenir"

export type TradeStatus = "open" | "sold"
export type TargetStatus = "hunting" | "acquired" | "abandoned"

export type Trade = {
  id: string
  skinName: string
  weaponType?: string
  wear: Wear
  variant: Variant
  floatValue?: number
  imageUrl?: string
  buyPrice: number
  sellPrice?: number
  status: TradeStatus
  currency: Currency
  buyDate: string // ISO yyyy-mm-dd
  sellDate?: string // ISO yyyy-mm-dd
  notes?: string
}

export type LoadoutSlot = {
  slotKey: string
  weaponLabel: string
  skinName?: string
  imageUrl?: string
  floatValue?: number
  pricePaid?: number
  rarity?: "consumer" | "industrial" | "milspec" | "restricted" | "classified" | "covert" | "gold"
  variant?: Variant
}

export type Loadout = {
  id: string
  name: string
  isPublic: boolean
  updatedAt: string // ISO
  slots: Record<string, LoadoutSlot>
}

export type Target = {
  id: string
  skinName: string
  watchlistId?: string
  weaponType?: string
  wear?: Wear
  variant: Variant
  targetPrice: number
  currency: Currency
  minFloat?: number
  maxFloat?: number
  imageUrl?: string
  notes?: string
  status: TargetStatus
  acquiredPrice?: number
  acquiredDate?: string // ISO yyyy-mm-dd
  marketplaceLinks?: Partial<Record<"steam" | "skinport" | "csfloat" | "buff163", string>>
}

export type Profile = {
  displayCurrency: Currency
}

export type Watchlist = {
  id: string
  name: string
  color?: string
}

export type PriceAlert = {
  id: string
  itemName: string
  market?: "steam" | "skinport" | "csfloat" | "buff163" | "bitskins" | "dmarket" | "waxpeer" | string
  condition: "below" | "above"
  triggerPrice: number
  currency: Currency
  isActive: boolean
  lastTriggeredAt?: string // ISO
}

export type DemoState = {
  profile: Profile
  watchlists: Watchlist[]
  alerts: PriceAlert[]
  trades: Trade[]
  loadouts: Loadout[]
  targets: Target[]
}

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

export function createDemoSeed(): DemoState {
  const today = new Date()
  const isoDay = (d: Date) => d.toISOString().slice(0, 10)
  const daysAgo = (n: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() - n)
    return isoDay(d)
  }

  const trades: Trade[] = [
    {
      id: id("trade"),
      skinName: "AK-47 | Redline",
      weaponType: "AK-47",
      wear: "FT",
      variant: "stattrak",
      floatValue: 0.1684,
      buyPrice: 46.5,
      sellPrice: 63.0,
      status: "sold",
      currency: "USD",
      buyDate: daysAgo(18),
      sellDate: daysAgo(9),
      notes: "Clean spine; quick flip.",
    },
    {
      id: id("trade"),
      skinName: "AWP | Asiimov",
      weaponType: "AWP",
      wear: "WW",
      variant: "none",
      floatValue: 0.4182,
      buyPrice: 118.0,
      status: "open",
      currency: "USD",
      buyDate: daysAgo(3),
      notes: "Holding for weekend liquidity.",
    },
    {
      id: id("trade"),
      skinName: "USP-S | Kill Confirmed",
      weaponType: "USP-S",
      wear: "MW",
      variant: "none",
      floatValue: 0.0897,
      buyPrice: 54.25,
      sellPrice: 51.0,
      status: "sold",
      currency: "USD",
      buyDate: daysAgo(26),
      sellDate: daysAgo(24),
      notes: "Paid too much; exit fast.",
    },
  ]

  const defaultSlots = (): Record<string, LoadoutSlot> => {
    const mk = (slotKey: string, weaponLabel: string): LoadoutSlot => ({
      slotKey,
      weaponLabel,
    })

    // Small but convincing subset for demo; can be expanded later.
    return {
      ct_knife: mk("ct_knife", "Knife"),
      ct_gloves: mk("ct_gloves", "Gloves"),
      ct_awp: mk("ct_awp", "AWP"),
      ct_m4a4: mk("ct_m4a4", "M4A4 / M4A1-S"),
      ct_usp_s: mk("ct_usp_s", "USP-S / P2000"),
      t_knife: mk("t_knife", "Knife"),
      t_gloves: mk("t_gloves", "Gloves"),
      t_ak47: mk("t_ak47", "AK-47"),
      t_glock: mk("t_glock", "Glock-18"),
      t_awp: mk("t_awp", "AWP"),
    }
  }

  const loadoutId = id("loadout")
  const loadouts: Loadout[] = [
    {
      id: loadoutId,
      name: "Current",
      isPublic: true,
      updatedAt: new Date().toISOString(),
      slots: {
        ...defaultSlots(),
        ct_awp: {
          slotKey: "ct_awp",
          weaponLabel: "AWP",
          skinName: "AWP | Asiimov",
          floatValue: 0.4182,
          rarity: "covert",
          variant: "none",
          pricePaid: 118.0,
        },
        t_ak47: {
          slotKey: "t_ak47",
          weaponLabel: "AK-47",
          skinName: "AK-47 | Redline",
          floatValue: 0.1684,
          rarity: "classified",
          variant: "stattrak",
          pricePaid: 46.5,
        },
        ct_usp_s: {
          slotKey: "ct_usp_s",
          weaponLabel: "USP-S / P2000",
          skinName: "USP-S | Kill Confirmed",
          floatValue: 0.0897,
          rarity: "covert",
          variant: "none",
          pricePaid: 54.25,
        },
      },
    },
  ]

  const watchlists: Watchlist[] = [
    { id: id("wl"), name: "Primary", color: "info" },
    { id: id("wl"), name: "Snipes", color: "warning" },
  ]
  const primaryId = watchlists[0]?.id

  const targets: Target[] = [
    {
      id: id("target"),
      skinName: "M4A1-S | Printstream",
      watchlistId: primaryId,
      weaponType: "M4A1-S",
      wear: "MW",
      variant: "none",
      targetPrice: 128.0,
      currency: "USD",
      minFloat: 0.07,
      maxFloat: 0.12,
      status: "hunting",
      notes: "Prefer low float + clean white panels.",
      marketplaceLinks: {},
    },
    {
      id: id("target"),
      skinName: "Glock-18 | Fade",
      watchlistId: watchlists[1]?.id,
      weaponType: "Glock-18",
      wear: "FN",
      variant: "none",
      targetPrice: 720.0,
      currency: "USD",
      minFloat: 0.0,
      maxFloat: 0.03,
      status: "acquired",
      acquiredPrice: 685.0,
      acquiredDate: daysAgo(2),
      notes: "Looking for high fade % (demo).",
      marketplaceLinks: {},
    },
  ]

  return {
    profile: { displayCurrency: "USD" },
    watchlists,
    alerts: [],
    trades,
    loadouts,
    targets,
  }
}

