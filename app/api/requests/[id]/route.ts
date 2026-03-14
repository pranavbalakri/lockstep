import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSessionFromRequest } from "@/lib/auth"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const request = await prisma.request.findUnique({
    where: { id },
    include: {
      freelancer: { select: { id: true, name: true, email: true } },
      gig: { select: { id: true, title: true, clientId: true } },
    },
  })
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isClient = session.role === "client" && request.gig.clientId === session.id
  const isFreelancer = session.role === "freelancer" && request.freelancerId === session.id
  if (!isClient && !isFreelancer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json({ request })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== "freelancer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const request = await prisma.request.findUnique({ where: { id } })
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (request.freelancerId !== session.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  if (request.status !== "pending") {
    return NextResponse.json({ error: "Only pending requests can be withdrawn" }, { status: 400 })
  }

  await prisma.request.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== "freelancer") {
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
  if (request.gig.freelancerId !== session.id) {
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
