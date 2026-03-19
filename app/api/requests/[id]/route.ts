import { NextRequest, NextResponse } from "next/server"
import { getAddress } from "viem"
import { prisma } from "@/lib/db"
import { getSessionFromRequest } from "@/lib/auth"
import { deployEscrow, getServerWalletAddress } from "@/lib/escrow"
import { usdToEth } from "@/lib/eth-price"

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
    },
  })
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (request.gig.freelancerId !== session.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (action === "accept") {
    // Deploy escrow contract with server wallet as CLIENT (platform-custodial flow)
    let contractAddress: string | undefined
    const freelancer = await prisma.user.findUnique({
      where: { id: session.id },
      select: { walletAddress: true },
    })
    const freelancerWallet = freelancer?.walletAddress

    // Refresh ETH amount at accept time so the rate is current
    const freshEthAmount = await usdToEth(request.gig.budget).catch(() => request.gig.ethAmount)

    if (freshEthAmount && freshEthAmount > 0) {
      if (!freelancerWallet) {
        return NextResponse.json({ error: "You must save an Ethereum wallet address before accepting this gig." }, { status: 400 })
      }
      try {
        // Use server wallet as CLIENT - platform handles deposits on behalf of clients
        const serverWallet = getServerWalletAddress()
        contractAddress = await deployEscrow(
          serverWallet,
          getAddress(freelancerWallet)
        )
      } catch (err) {
        console.error("Escrow deploy failed:", err)
        return NextResponse.json({ error: "Failed to deploy escrow contract. Ensure the ETH network is available." }, { status: 500 })
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
        ...(freshEthAmount && { ethAmount: freshEthAmount }),
        ...(contractAddress && { contractAddress }),
      },
    })
  } else {
    await prisma.request.update({ where: { id }, data: { status: "rejected" } })
  }

  return NextResponse.json({ ok: true })
}
