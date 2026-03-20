import { getServerWalletAddress } from "./escrow"

export type PaymentMode = "custodial" | "non_custodial"

export interface GigPaymentInfo {
  contractAddress: string | null
  paymentMode: string
  clientWallet: string | null
}

/**
 * Get the address where MoonPay should send ETH.
 *
 * - Custodial mode: Send to server wallet (server then calls deposit())
 * - Non-custodial mode: Send directly to client's wallet (client calls deposit())
 */
export function getDepositTarget(gig: GigPaymentInfo): `0x${string}` {
  if (gig.paymentMode === "non_custodial" && gig.clientWallet) {
    return gig.clientWallet as `0x${string}`
  }
  // Custodial: MoonPay sends to server wallet, server calls deposit()
  return getServerWalletAddress()
}

/**
 * Get the address to use as CLIENT role when deploying the escrow contract.
 *
 * - Custodial mode: Server wallet is CLIENT (platform holds funds)
 * - Non-custodial mode: Client's own wallet is CLIENT
 */
export function getContractClientAddress(gig: GigPaymentInfo): `0x${string}` {
  if (gig.paymentMode === "non_custodial" && gig.clientWallet) {
    return gig.clientWallet as `0x${string}`
  }
  return getServerWalletAddress()
}

/**
 * Check if a payment mode requires the server to call deposit() on behalf of the client.
 */
export function requiresServerDeposit(paymentMode: string): boolean {
  return paymentMode === "custodial"
}

/**
 * Payment status values for Request.paymentStatus field.
 */
export const PaymentStatus = {
  PENDING: "pending",
  FUNDED: "funded",
  DEPOSIT_FAILED: "deposit_failed",
  REQUIRES_MANUAL_REVIEW: "requires_manual_review",
  FAILED: "failed",
  REFUNDED_MANUAL: "refunded_manual",
} as const

export type PaymentStatusType = (typeof PaymentStatus)[keyof typeof PaymentStatus]

/**
 * Maximum deposit retry attempts before flagging for manual review.
 */
export const MAX_DEPOSIT_RETRIES = 3

/**
 * Slippage threshold (percentage) above which we log a warning.
 */
export const SLIPPAGE_WARNING_THRESHOLD = 10
