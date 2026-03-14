import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSessionFromRequest } from "@/lib/auth"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { action } = await req.json()
  if (!["accept", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  const request = await prisma.request.findUnique({
    where: { id },
    include: { gig: true },
  })
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (request.gig.clientId !== session.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (action === "accept") {
    await prisma.request.update({ where: { id }, data: { status: "accepted" } })
    await prisma.request.updateMany({
      where: { gigId: request.gigId, id: { not: id } },
      data: { status: "rejected" },
    })
    await prisma.gig.update({ where: { id: request.gigId }, data: { status: "in_progress" } })
  } else {
    await prisma.request.update({ where: { id }, data: { status: "rejected" } })
  }

  return NextResponse.json({ ok: true })
}
