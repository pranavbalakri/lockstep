import { createWalletClient, createPublicClient, http, parseEther } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { sepolia, anvil } from "viem/chains"
import { DEADDROP_ABI, DEADDROP_BYTECODE } from "./contracts/DeadDrop"

function getChain() {
  return process.env.ETH_CHAIN === "anvil" ? anvil : sepolia
}

function getClients() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`
  const rpcUrl = process.env.ETH_RPC_URL
  if (!privateKey || !rpcUrl) {
    throw new Error("DEPLOYER_PRIVATE_KEY and ETH_RPC_URL must be set to use escrow features")
  }
  const account = privateKeyToAccount(privateKey)
  const chain = getChain()
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) })
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) })
  return { walletClient, publicClient, account }
}

/** Deploy a new escrow contract. Returns the deployed contract address. */
export async function deployEscrow(
  clientAddress: `0x${string}`,
  freelancerAddress: `0x${string}`
): Promise<string> {
  const { walletClient, publicClient } = getClients()
  const hash = await walletClient.deployContract({
    abi: DEADDROP_ABI,
    bytecode: DEADDROP_BYTECODE,
    args: [clientAddress, freelancerAddress],
  })
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  if (!receipt.contractAddress) throw new Error("Deploy failed: no contract address in receipt")
  return receipt.contractAddress
}

/** Release escrowed ETH to the freelancer (AI verdict: work complete). */
export async function releaseEscrow(contractAddress: `0x${string}`): Promise<void> {
  const { walletClient, publicClient } = getClients()
  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: DEADDROP_ABI,
    functionName: "release",
  })
  await publicClient.waitForTransactionReceipt({ hash })
}

/** Refund escrowed ETH to the client (AI verdict: work incomplete). */
export async function disputeEscrow(contractAddress: `0x${string}`): Promise<void> {
  const { walletClient, publicClient } = getClients()
  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: DEADDROP_ABI,
    functionName: "dispute",
  })
  await publicClient.waitForTransactionReceipt({ hash })
}

/** Deposit ETH into escrow using the server wallet (platform-custodial flow). */
export async function depositEscrow(
  contractAddress: `0x${string}`,
  ethAmount: number
): Promise<string> {
  const { walletClient, publicClient } = getClients()
  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: DEADDROP_ABI,
    functionName: "deposit",
    value: parseEther(String(ethAmount)),
  })
  await publicClient.waitForTransactionReceipt({ hash })
  return hash
}

/** Get the server wallet address (used as CLIENT in escrow contracts). */
export function getServerWalletAddress(): `0x${string}` {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`
  if (!privateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY must be set")
  }
  return privateKeyToAccount(privateKey).address
}

/**
 * Escrow state enum values from the DeadDrop contract.
 */
export const EscrowState = {
  Unfunded: 0,
  Funded: 1,
  Released: 2,
  Disputed: 3,
} as const

export type EscrowStateType = (typeof EscrowState)[keyof typeof EscrowState]

/**
 * Read the current state of an escrow contract.
 * Returns: 0 = Unfunded, 1 = Funded, 2 = Released, 3 = Disputed
 */
export async function getEscrowState(
  contractAddress: `0x${string}`
): Promise<EscrowStateType> {
  const { publicClient } = getClients()
  const state = await publicClient.readContract({
    address: contractAddress,
    abi: DEADDROP_ABI,
    functionName: "state",
  })
  return state as EscrowStateType
}

/**
 * Read the deposited amount from an escrow contract.
 * Returns the amount in wei as a bigint.
 */
export async function getDepositedAmount(
  contractAddress: `0x${string}`
): Promise<bigint> {
  const { publicClient } = getClients()
  const amount = await publicClient.readContract({
    address: contractAddress,
    abi: DEADDROP_ABI,
    functionName: "depositedAmount",
  })
  return amount as bigint
}

/**
 * Deposit ETH to an escrow contract with a specific wei amount.
 * Used by webhook handler after receiving ETH from MoonPay.
 */
export async function depositToEscrowWei(
  contractAddress: `0x${string}`,
  amountWei: bigint
): Promise<string> {
  const { walletClient, publicClient } = getClients()
  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: DEADDROP_ABI,
    functionName: "deposit",
    value: amountWei,
  })
  await publicClient.waitForTransactionReceipt({ hash })
  return hash
}
