/** Fetch current ETH/USD price from CoinGecko. Returns price in USD per ETH. */
export async function getEthUsdPrice(): Promise<number> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
    { next: { revalidate: 60 } }
  )
  if (!res.ok) throw new Error("Failed to fetch ETH price")
  const data = await res.json()
  return data.ethereum.usd as number
}

/** Convert a USD amount to ETH at the current market rate, rounded to 6 decimal places. */
export async function usdToEth(usd: number): Promise<number> {
  const price = await getEthUsdPrice()
  return Math.round((usd / price) * 1_000_000) / 1_000_000
}
