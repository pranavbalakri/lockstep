import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSessionFromRequest } from "@/lib/auth"
import { getServerClients } from "@/lib/contracts/serverWallet"
import { DEADDROP_ABI, DEADDROP_BYTECODE } from "@/lib/contracts/DeadDrop"
import { parseEther } from "viem"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const gig = await prisma.gig.findUnique({ where: { id } })
  if (!gig) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (session.role !== "freelancer" || gig.freelancerId !== session.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const requests = await prisma.request.findMany({
    where: { gigId: id },
    include: { client: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ requests })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const gig = await prisma.gig.findUnique({
    where: { id },
    include: { freelancer: { select: { walletAddress: true } } },
  })
  if (!gig) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (gig.status !== "open") return NextResponse.json({ error: "Gig is not open" }, { status: 400 })

  const existing = await prisma.request.findFirst({ where: { gigId: id, clientId: session.id } })
  if (existing) return NextResponse.json({ error: "Already requested" }, { status: 409 })

  const { proposal, proposedTimeline, ethAmount } = await req.json()
  if (!proposal || !proposedTimeline) {
    return NextResponse.json({ error: "Proposal and timeline required" }, { status: 400 })
  }

  let contractAddress: string | undefined

  if (ethAmount && parseFloat(ethAmount) > 0) {
    const freelancerWallet = gig.freelancer.walletAddress
    if (!freelancerWallet) {
      return NextResponse.json({ error: "Freelancer has no wallet address on file" }, { status: 400 })
    }

    try {
      const { walletClient, publicClient, account } = getServerClients()

      const deployHash = await walletClient.deployContract({
        account,
        abi: DEADDROP_ABI,
        bytecode: DEADDROP_BYTECODE,
        args: [account.address, freelancerWallet as `0x${string}`],
      })
      const receipt = await publicClient.waitForTransactionReceipt({ hash: deployHash })
      if (!receipt.contractAddress) throw new Error("Deploy failed: no contract address in receipt")
      contractAddress = receipt.contractAddress

      await walletClient.writeContract({
        account,
        address: contractAddress as `0x${string}`,
        abi: DEADDROP_ABI,
        functionName: "deposit",
        value: parseEther(String(ethAmount)),
      })
    } catch (e: unknown) {
      const err = e as { message?: string }
      return NextResponse.json({ error: err.message ?? "Contract deployment failed" }, { status: 500 })
    }
  }

  const request = await prisma.request.create({
    data: {
      gigId: id,
      clientId: session.id,
      proposal,
      proposedTimeline,
      ...(contractAddress && { contractAddress }),
      ...(ethAmount && { ethAmount: parseFloat(ethAmount) }),
    },
  })

  return NextResponse.json({ request, contractAddress }, { status: 201 })
}
