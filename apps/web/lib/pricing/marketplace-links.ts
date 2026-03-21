export function buildMarketplaceLinks(params: { itemName: string; marketHashName: string }) {
  const encodedItem = encodeURIComponent(params.itemName)
  const encodedHash = encodeURIComponent(params.marketHashName)
  return {
    steam: `https://steamcommunity.com/market/listings/730/${encodedHash}`,
    buff163: `https://buff.163.com/market/csgo#tab=selling&page_num=1&search=${encodedHash}`,
    skinport: `https://skinport.com/market?search=${encodedHash}`,
    csfloat: `https://csfloat.com/search?q=${encodedHash}`,
    bitskins: `https://bitskins.com/?market_hash_name=${encodedHash}`,
    dmarket: `https://dmarket.com/ingame-items/item-list/csgo-skins?title=${encodedItem}`,
    waxpeer: `https://waxpeer.com/?search=${encodedHash}`,
    csmoney: `https://cs.money/market/buy/?search=${encodedHash}`,
  }
}
