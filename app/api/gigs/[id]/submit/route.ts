import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSessionFromRequest } from "@/lib/auth"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== "freelancer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const gig = await prisma.gig.findUnique({ where: { id } })
  if (!gig) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (gig.freelancerId !== session.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  if (gig.status !== "in_progress") {
    return NextResponse.json({ error: "Gig is not in progress" }, { status: 400 })
  }

  const existing = await prisma.submission.findUnique({ where: { gigId: id } })
  if (existing) return NextResponse.json({ error: "Already submitted" }, { status: 409 })

  const { textContent, url, notes } = await req.json()

  const submission = await prisma.submission.create({
    data: {
      gigId: id,
      freelancerId: session.id,
      textContent: textContent ?? null,
      url: url ?? null,
      filePaths: "[]",
      notes: notes ?? null,
    },
  })

  await prisma.gig.update({ where: { id }, data: { status: "submitted" } })

  return NextResponse.json({ submission }, { status: 201 })
}
