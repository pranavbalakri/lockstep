import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSessionFromRequest } from "@/lib/auth"

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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const gig = await prisma.gig.findUnique({ where: { id } })
  if (!gig) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (gig.clientId !== session.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  if (gig.status !== "open") return NextResponse.json({ error: "Only open gigs can be edited" }, { status: 400 })

  const { title, category, description, budget, deadline, skills, deliverables } = await req.json()

  const updated = await prisma.gig.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(category !== undefined && { category }),
      ...(description !== undefined && { description }),
      ...(budget !== undefined && { budget: parseFloat(budget) }),
      ...(deadline !== undefined && { deadline: new Date(deadline) }),
      ...(skills !== undefined && { skills: JSON.stringify(skills) }),
      ...(deliverables !== undefined && { deliverables }),
    },
  })

  return NextResponse.json({ gig: { ...updated, skills: JSON.parse(updated.skills) } })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const gig = await prisma.gig.findUnique({ where: { id } })
  if (!gig) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (gig.clientId !== session.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  if (gig.status !== "open") return NextResponse.json({ error: "Only open gigs can be deleted" }, { status: 400 })

  await prisma.request.deleteMany({ where: { gigId: id } })
  await prisma.gig.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
