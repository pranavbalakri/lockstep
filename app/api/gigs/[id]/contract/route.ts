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
  if (!gig) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (gig.clientId !== session.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  if (gig.status !== "in_progress") {
    return NextResponse.json({ error: "Gig must be in progress to set contract address" }, { status: 400 })
  }

  const { contractAddress } = await req.json()
  if (!contractAddress || !/^0x[0-9a-fA-F]{40}$/.test(contractAddress)) {
    return NextResponse.json({ error: "Invalid contract address" }, { status: 400 })
  }

  await prisma.gig.update({ where: { id }, data: { contractAddress } })

  return NextResponse.json({ ok: true })
}
