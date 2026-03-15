import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSessionFromRequest } from "@/lib/auth"
import { deployEscrow } from "@/lib/escrow"

// Called by the freelancer to deploy the escrow contract when it was skipped at accept time
// (i.e. the freelancer saved their wallet after accepting the request).
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== "freelancer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const gig = await prisma.gig.findUnique({
    where: { id },
    include: {
      requests: { where: { status: "accepted" }, include: { client: { select: { walletAddress: true } } } },
    },
  })
  if (!gig) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (gig.freelancerId !== session.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  if (gig.status !== "in_progress") return NextResponse.json({ error: "Gig is not in progress" }, { status: 400 })
  if (gig.contractAddress) return NextResponse.json({ error: "Escrow already deployed" }, { status: 400 })

  const freelancer = await prisma.user.findUnique({ where: { id: session.id }, select: { walletAddress: true } })
  const acceptedRequest = gig.requests[0]
  const clientWallet = acceptedRequest?.client?.walletAddress
  const freelancerWallet = freelancer?.walletAddress

  if (!clientWallet || !freelancerWallet) {
    return NextResponse.json({ error: "Both parties must have a wallet address saved" }, { status: 400 })
  }

  const contractAddress = await deployEscrow(clientWallet as `0x${string}`, freelancerWallet as `0x${string}`)

  await prisma.gig.update({ where: { id }, data: { contractAddress } })

  return NextResponse.json({ contractAddress })
}

// Called by the client after calling deposit() on the escrow contract.
// Records the deposited ETH amount on their accepted request for display purposes.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { ethAmount } = await req.json()
  if (!ethAmount || isNaN(parseFloat(ethAmount))) {
    return NextResponse.json({ error: "ethAmount required" }, { status: 400 })
  }

  const request = await prisma.request.findFirst({
    where: { gigId: id, clientId: session.id, status: "accepted" },
  })
  if (!request) return NextResponse.json({ error: "No accepted request found" }, { status: 404 })

  await prisma.request.update({
    where: { id: request.id },
    data: { ethAmount: parseFloat(ethAmount) },
  })

  return NextResponse.json({ ok: true })
}
