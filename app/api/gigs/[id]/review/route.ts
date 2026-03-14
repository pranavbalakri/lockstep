import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSessionFromRequest } from "@/lib/auth"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const gig = await prisma.gig.findUnique({ where: { id } })
  if (!gig || gig.clientId !== session.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (gig.status !== "submitted") {
    return NextResponse.json({ error: "No submission to review" }, { status: 400 })
  }

  const { action } = await req.json()
  if (!["accept", "dispute"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  const newStatus = action === "accept" ? "completed" : "disputed"
  await prisma.gig.update({ where: { id }, data: { status: newStatus } })

  return NextResponse.json({ status: newStatus })
}
