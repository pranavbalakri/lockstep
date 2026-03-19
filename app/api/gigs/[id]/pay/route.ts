import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSessionFromRequest } from "@/lib/auth"
import { depositEscrow } from "@/lib/escrow"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Find the client's accepted request for this gig
  const request = await prisma.request.findFirst({
    where: { gigId: id, clientId: session.id, status: "accepted" },
    include: { gig: true },
  })
  if (!request) {
    return NextResponse.json({ error: "No accepted request found for this gig" }, { status: 404 })
  }
  if (!request.gig.contractAddress) {
    return NextResponse.json({ error: "Escrow contract not deployed" }, { status: 400 })
  }
  if (!request.gig.ethAmount) {
    return NextResponse.json({ error: "ETH amount not set for this gig" }, { status: 400 })
  }
  if (request.ethAmount) {
    return NextResponse.json({ error: "Payment already completed" }, { status: 400 })
  }

  // Simulate fiat payment processing (instant success for now)
  // In production, this would integrate with Stripe or another payment processor

  // Server wallet deposits ETH into escrow on behalf of the client
  try {
    await depositEscrow(
      request.gig.contractAddress as `0x${string}`,
      request.gig.ethAmount
    )
  } catch (err) {
    console.error("Escrow deposit failed:", err)
    return NextResponse.json({ error: "Failed to deposit escrow. Please try again." }, { status: 500 })
  }

  // Mark payment as complete on the request
  await prisma.request.update({
    where: { id: request.id },
    data: { ethAmount: request.gig.ethAmount },
  })

  return NextResponse.json({ ok: true, ethAmount: request.gig.ethAmount })
}
