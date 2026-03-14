import { createWalletClient, createPublicClient, http, privateKeyToAccount, defineChain } from "viem"

const RPC_URL = process.env.RPC_URL ?? "http://localhost:8545"
const RAW_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? ""
const PRIVATE_KEY = (RAW_KEY.startsWith("0x") ? RAW_KEY : `0x${RAW_KEY}`) as `0x${string}`

// Generic local/custom chain — chainId is fetched at runtime by viem via the transport
const localChain = defineChain({ id: 31337, name: "Local", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [RPC_URL] } } })

export function getServerClients() {
  if (!RAW_KEY) throw new Error("DEPLOYER_PRIVATE_KEY is not set")
  const account = privateKeyToAccount(PRIVATE_KEY)
  const transport = http(RPC_URL)
  const walletClient = createWalletClient({ account, chain: localChain, transport })
  const publicClient = createPublicClient({ chain: localChain, transport })
  return { walletClient, publicClient, account }
}
