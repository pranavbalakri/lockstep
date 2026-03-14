import { createWalletClient, createPublicClient, http } from "viem"
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
