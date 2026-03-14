import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSessionFromRequest } from "@/lib/auth"

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
