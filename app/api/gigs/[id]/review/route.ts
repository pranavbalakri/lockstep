import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSessionFromRequest } from "@/lib/auth"
import { releaseEscrow } from "@/lib/escrow"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const gig = await prisma.gig.findUnique({ where: { id } })
  if (!gig) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (gig.status !== "submitted") {
    return NextResponse.json({ error: "No submission to review" }, { status: 400 })
  }

  const acceptedRequest = await prisma.request.findFirst({
    where: { gigId: id, clientId: session.id, status: "accepted" },
  })
  if (!acceptedRequest) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { action } = await req.json()
  if (!["accept", "dispute"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  if (action === "accept") {
    if (gig.contractAddress) {
      try {
        await releaseEscrow(gig.contractAddress as `0x${string}`)
      } catch (err) {
        console.error("Escrow release failed:", err)
      }
    }
    await prisma.gig.update({ where: { id }, data: { status: "completed" } })
    return NextResponse.json({ status: "completed" })
  }

  // Dispute → send to mediation, funds stay locked in contract until both parties argue
  await prisma.gig.update({ where: { id }, data: { status: "disputed" } })
  return NextResponse.json({ status: "disputed" })
}
