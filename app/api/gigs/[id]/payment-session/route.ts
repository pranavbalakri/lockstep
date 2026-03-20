import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSessionFromRequest } from "@/lib/auth"
import { getDepositTarget } from "@/lib/payment"
import {
  buildMoonPayWidgetUrl,
  generatePaymentSessionId,
} from "@/lib/moonpay"

const isLocalDev = process.env.ETH_CHAIN === "anvil"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSessionFromRequest(req)

  if (!session || session.role !== "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const gig = await prisma.gig.findUnique({
    where: { id },
    include: {
      requests: {
        where: { clientId: session.id, status: "accepted" },
      },
    },
  })

  if (!gig) {
    return NextResponse.json({ error: "Gig not found" }, { status: 404 })
  }

  // Gate 1: Must have an accepted request
  const acceptedRequest = gig.requests[0]
  if (!acceptedRequest) {
    return NextResponse.json(
      { error: "No accepted request. Wait for freelancer to accept your proposal." },
      { status: 400 }
    )
  }

  // Gate 2: Contract must be deployed
  if (!gig.contractAddress) {
    return NextResponse.json(
      { error: "Escrow contract not yet deployed. Please wait and try again." },
      { status: 400 }
    )
  }

  // Gate 3: Not already funded
  if (acceptedRequest.ethAmount) {
    return NextResponse.json({ error: "Already funded" }, { status: 400 })
  }

  // Gate 4: Payment not already in progress
  if (acceptedRequest.paymentStatus === "pending") {
    // Return existing session if still valid
    if (acceptedRequest.paymentSessionId) {
      const widgetUrl = buildMoonPayWidgetUrl({
        sessionId: acceptedRequest.paymentSessionId,
        walletAddress: getDepositTarget(gig),
        baseCurrencyAmount: gig.budget,
        email: session.email,
      })
      return NextResponse.json({
        widgetUrl,
        sessionId: acceptedRequest.paymentSessionId,
      })
    }
  }

  // Generate new payment session
  const sessionId = generatePaymentSessionId()
  const depositTarget = getDepositTarget(gig)

  // Store session for webhook correlation
  await prisma.request.update({
    where: { id: acceptedRequest.id },
    data: {
      paymentSessionId: sessionId,
      paymentStatus: "pending",
      expectedEthAmount: gig.ethAmount?.toString(),
    },
  })

  // In local dev mode, skip MoonPay and use direct deposit
  if (isLocalDev) {
    return NextResponse.json({
      mode: "dev",
      sessionId,
      requestId: acceptedRequest.id,
    })
  }

  const widgetUrl = buildMoonPayWidgetUrl({
    sessionId,
    walletAddress: depositTarget,
    baseCurrencyAmount: gig.budget,
    email: session.email,
  })

  return NextResponse.json({ mode: "moonpay", widgetUrl, sessionId })
}
