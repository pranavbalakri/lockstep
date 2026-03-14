import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gig = await prisma.gig.findUnique({
    where: { id },
    include: {
      freelancer: { select: { id: true, name: true } },
      requests: { select: { id: true, clientId: true, status: true } },
      submission: true,
    },
  })

  if (!gig) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    gig: {
      ...gig,
      skills: JSON.parse(gig.skills),
      requestCount: gig.requests.length,
    },
  })
}
