import { NextRequest, NextResponse } from "next/server"
import { parseEther } from "viem"
import { prisma } from "@/lib/db"
import { depositToEscrowWei } from "@/lib/escrow"
import {
  verifyMoonPaySignature,
  parseMoonPayWebhook,
  MoonPayWebhookEvent,
} from "@/lib/moonpay"
import {
  PaymentStatus,
  MAX_DEPOSIT_RETRIES,
  SLIPPAGE_WARNING_THRESHOLD,
} from "@/lib/payment"

export async function POST(req: NextRequest) {
  // 1. Get raw body for signature verification
  const body = await req.text()
  const signature = req.headers.get("Moonpay-Signature")

  // 2. Verify HMAC signature (timing-safe)
  if (!signature || !verifyMoonPaySignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  // 3. Parse and process event - always return 200 after signature verification
  try {
    const event = parseMoonPayWebhook(body)

    // Handle failed/cancelled transactions
    if (
      event.type === "transaction_failed" ||
      event.type === "transaction_cancelled"
    ) {
      await handleFailedTransaction(event)
      return NextResponse.json({ ok: true })
    }

    // Only process completed transactions
    if (event.type !== "transaction_completed") {
      return NextResponse.json({ ok: true })
    }

    await handleCompletedTransaction(event)
    return NextResponse.json({ ok: true })
  } catch (error) {
    // Log error but return 200 to prevent webhook retry floods
    console.error("Webhook processing error:", error)
    return NextResponse.json({ ok: true })
  }
}

async function handleCompletedTransaction(event: MoonPayWebhookEvent) {
  const transactionId = event.data.id
  const cryptoAmount = event.data.quoteCurrencyAmount
  const sessionId = event.data.externalTransactionId

  // Find request by payment session - idempotent (skip if already funded)
  const request = await prisma.request.findFirst({
    where: {
      paymentSessionId: sessionId,
      paymentStatus: { not: PaymentStatus.FUNDED },
    },
    include: { gig: true },
  })

  if (!request) {
    // Either already processed (idempotent) or unknown session
    console.log(`Webhook: No pending request for session ${sessionId}`)
    return
  }

  if (!request.gig.contractAddress) {
    console.error(`Webhook: No contract for request ${request.id}`)
    return
  }

  // Calculate slippage
  const expectedEth = parseFloat(request.expectedEthAmount || "0")
  const actualEth = cryptoAmount
  const slippagePct =
    expectedEth > 0
      ? (Math.abs(expectedEth - actualEth) / expectedEth) * 100
      : 0

  if (slippagePct > SLIPPAGE_WARNING_THRESHOLD) {
    console.warn(
      `High slippage on request ${request.id}: expected ${expectedEth}, got ${actualEth} (${slippagePct.toFixed(1)}%)`
    )
  }

  // Call deposit() on the contract
  try {
    const amountWei = parseEther(cryptoAmount.toString())
    const txHash = await depositToEscrowWei(
      request.gig.contractAddress as `0x${string}`,
      amountWei
    )

    // Update DB with successful deposit
    await prisma.request.update({
      where: { id: request.id },
      data: {
        ethAmount: cryptoAmount,
        receivedEthAmount: cryptoAmount.toString(),
        paymentStatus: PaymentStatus.FUNDED,
        paymentTxHash: txHash,
        moonpayTransactionId: transactionId,
        slippagePercent: slippagePct,
      },
    })

    console.log(`Payment funded for request ${request.id}, tx: ${txHash}`)
  } catch (error) {
    // Deposit failed - mark for retry
    const newRetryCount = (request.depositRetryCount || 0) + 1
    const newStatus =
      newRetryCount >= MAX_DEPOSIT_RETRIES
        ? PaymentStatus.REQUIRES_MANUAL_REVIEW
        : PaymentStatus.DEPOSIT_FAILED

    await prisma.request.update({
      where: { id: request.id },
      data: {
        receivedEthAmount: cryptoAmount.toString(),
        moonpayTransactionId: transactionId,
        paymentStatus: newStatus,
        depositRetryCount: newRetryCount,
        paymentFailureReason:
          error instanceof Error ? error.message : "Unknown error",
        slippagePercent: slippagePct,
      },
    })

    console.error(`Deposit failed for request ${request.id}:`, error)
  }
}

async function handleFailedTransaction(event: MoonPayWebhookEvent) {
  const sessionId = event.data.externalTransactionId

  const request = await prisma.request.findFirst({
    where: { paymentSessionId: sessionId },
  })

  if (request) {
    await prisma.request.update({
      where: { id: request.id },
      data: {
        paymentStatus: PaymentStatus.FAILED,
        paymentFailureReason: event.data.failureReason || "cancelled",
      },
    })
    console.log(`Payment failed/cancelled for request ${request.id}`)
  }
}
