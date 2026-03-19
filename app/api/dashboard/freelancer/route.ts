import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSessionFromRequest } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== "freelancer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const gigs = await prisma.gig.findMany({
    where: { freelancerId: session.id },
    include: { requests: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
  })

  const requests = await prisma.request.findMany({
    where: { gig: { freelancerId: session.id } },
    select: {
      id: true,
      gigId: true,
      proposal: true,
      proposedTimeline: true,
      status: true,
      createdAt: true,
      ethAmount: true,
      client: { select: { id: true, name: true } },
      gig: { select: { id: true, title: true, budget: true, deadline: true, status: true, ethAmount: true, contractAddress: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({
    gigs: gigs.map((g) => ({ ...g, requestCount: g.requests.length, requests: undefined })),
    requests,
  })
}
