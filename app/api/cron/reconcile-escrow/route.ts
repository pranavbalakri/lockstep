import { NextRequest, NextResponse } from "next/server"
import { formatEther, parseEther } from "viem"
import { timingSafeEqual } from "crypto"
import { prisma } from "@/lib/db"
import {
  getEscrowState,
  getDepositedAmount,
  depositToEscrowWei,
  EscrowState,
} from "@/lib/escrow"
import {
  PaymentStatus,
  MAX_DEPOSIT_RETRIES,
} from "@/lib/payment"

export async function GET(req: NextRequest) {
  // 1. Verify cron secret (timing-safe)
  const authHeader = req.headers.get("authorization")
  const expected = `Bearer ${process.env.CRON_SECRET}`

  if (!authHeader || !timingSafeCompare(authHeader, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const results = {
    reconciled: 0,
    retried: 0,
    failed: 0,
  }

  // 2. Reconcile pending payments - check on-chain state
  await reconcilePendingPayments(results)

  // 3. Retry failed deposits
  await retryFailedDeposits(results)

  return NextResponse.json(results)
}

async function reconcilePendingPayments(results: {
  reconciled: number
  failed: number
}) {
  // Find requests with pending payment status and deployed contracts
  const pendingRequests = await prisma.request.findMany({
    where: {
      paymentStatus: PaymentStatus.PENDING,
      gig: { contractAddress: { not: null } },
    },
    include: { gig: true },
    take: 50,
  })

  for (const request of pendingRequests) {
    if (!request.gig.contractAddress) continue

    try {
      const state = await getEscrowState(
        request.gig.contractAddress as `0x${string}`
      )

      // If contract is funded (or beyond), sync the DB
      if (state >= EscrowState.Funded) {
        const amount = await getDepositedAmount(
          request.gig.contractAddress as `0x${string}`
        )
        const ethAmount = parseFloat(formatEther(amount))

        await prisma.request.update({
          where: { id: request.id },
          data: {
            ethAmount,
            paymentStatus: PaymentStatus.FUNDED,
          },
        })

        results.reconciled++
        console.log(`Reconciled request ${request.id}: ${ethAmount} ETH`)
      }
    } catch (error) {
      console.error(`Reconciliation failed for request ${request.id}:`, error)
      results.failed++
    }
  }
}

async function retryFailedDeposits(results: { retried: number; failed: number }) {
  // Find requests where deposit failed but we received ETH
  const failedRequests = await prisma.request.findMany({
    where: {
      paymentStatus: PaymentStatus.DEPOSIT_FAILED,
      receivedEthAmount: { not: null },
      depositRetryCount: { lt: MAX_DEPOSIT_RETRIES },
      gig: { contractAddress: { not: null } },
    },
    include: { gig: true },
    take: 20,
  })

  for (const request of failedRequests) {
    if (!request.gig.contractAddress || !request.receivedEthAmount) continue

    try {
      // Check if contract is still unfunded
      const state = await getEscrowState(
        request.gig.contractAddress as `0x${string}`
      )

      if (state === EscrowState.Unfunded) {
        // Retry deposit
        const amountWei = parseEther(request.receivedEthAmount)
        const txHash = await depositToEscrowWei(
          request.gig.contractAddress as `0x${string}`,
          amountWei
        )

        await prisma.request.update({
          where: { id: request.id },
          data: {
            ethAmount: parseFloat(request.receivedEthAmount),
            paymentStatus: PaymentStatus.FUNDED,
            paymentTxHash: txHash,
            paymentFailureReason: null,
          },
        })

        results.retried++
        console.log(`Retry succeeded for request ${request.id}, tx: ${txHash}`)
      } else if (state >= EscrowState.Funded) {
        // Already funded somehow - sync state
        const amount = await getDepositedAmount(
          request.gig.contractAddress as `0x${string}`
        )

        await prisma.request.update({
          where: { id: request.id },
          data: {
            ethAmount: parseFloat(formatEther(amount)),
            paymentStatus: PaymentStatus.FUNDED,
            paymentFailureReason: null,
          },
        })

        results.retried++
      }
    } catch (error) {
      const newRetryCount = (request.depositRetryCount || 0) + 1
      const newStatus =
        newRetryCount >= MAX_DEPOSIT_RETRIES
          ? PaymentStatus.REQUIRES_MANUAL_REVIEW
          : PaymentStatus.DEPOSIT_FAILED

      await prisma.request.update({
        where: { id: request.id },
        data: {
          depositRetryCount: newRetryCount,
          paymentStatus: newStatus,
          paymentFailureReason:
            error instanceof Error ? error.message : "Retry failed",
        },
      })

      results.failed++
      console.error(`Retry failed for request ${request.id}:`, error)
    }
  }
}

function timingSafeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a)
    const bufB = Buffer.from(b)
    if (bufA.length !== bufB.length) return false
    return timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}
