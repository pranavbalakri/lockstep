import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSessionFromRequest } from "@/lib/auth"

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

  const gig = await prisma.gig.findUnique({ where: { id } })
  if (!gig) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (gig.status !== "open") return NextResponse.json({ error: "Gig is not open" }, { status: 400 })

  const existing = await prisma.request.findFirst({ where: { gigId: id, clientId: session.id } })
  if (existing) return NextResponse.json({ error: "Already requested" }, { status: 409 })

  const { proposal, proposedTimeline } = await req.json()
  if (!proposal || !proposedTimeline) {
    return NextResponse.json({ error: "Proposal and timeline required" }, { status: 400 })
  }

  const request = await prisma.request.create({
    data: { gigId: id, clientId: session.id, proposal, proposedTimeline },
  })

  return NextResponse.json({ request }, { status: 201 })
}
