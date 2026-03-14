import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSessionFromRequest } from "@/lib/auth"
import { deployEscrow } from "@/lib/escrow"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const request = await prisma.request.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, email: true } },
      gig: { select: { id: true, title: true, freelancerId: true } },
    },
  })
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isFreelancer = session.role === "freelancer" && request.gig.freelancerId === session.id
  const isClient = session.role === "client" && request.clientId === session.id
  if (!isFreelancer && !isClient) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json({ request })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const request = await prisma.request.findUnique({ where: { id } })
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (request.clientId !== session.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  if (request.status !== "pending") {
    return NextResponse.json({ error: "Only pending requests can be withdrawn" }, { status: 400 })
  }

  await prisma.request.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== "freelancer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { action } = await req.json()
  if (!["accept", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  const request = await prisma.request.findUnique({
    where: { id },
    include: {
      gig: true,
      client: { select: { walletAddress: true } },
    },
  })
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (request.gig.freelancerId !== session.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (action === "accept") {
    // Deploy escrow contract if gig requires ETH deposit and both parties have wallet addresses
    let contractAddress: string | undefined
    const freelancer = await prisma.user.findUnique({
      where: { id: session.id },
      select: { walletAddress: true },
    })
    const gigEthAmount = request.gig.ethAmount
    const clientWallet = request.client.walletAddress
    const freelancerWallet = freelancer?.walletAddress

    if (gigEthAmount && gigEthAmount > 0 && clientWallet && freelancerWallet) {
      try {
        contractAddress = await deployEscrow(
          clientWallet as `0x${string}`,
          freelancerWallet as `0x${string}`
        )
      } catch (err) {
        console.error("Escrow deploy failed:", err)
        // Continue without contract — ETH deposit becomes optional
      }
    }

    await prisma.request.update({
      where: { id },
      data: { status: "accepted", ...(contractAddress && { contractAddress }) },
    })
    await prisma.request.updateMany({
      where: { gigId: request.gigId, id: { not: id } },
      data: { status: "rejected" },
    })
    await prisma.gig.update({
      where: { id: request.gigId },
      data: {
        status: "in_progress",
        ...(contractAddress && { contractAddress }),
      },
    })
  } else {
    await prisma.request.update({ where: { id }, data: { status: "rejected" } })
  }

  return NextResponse.json({ ok: true })
}
