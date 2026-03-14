import { NextRequest, NextResponse } from "next/server"
import { getSession, getSessionFromRequest } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 })
  }
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, email: true, role: true, walletAddress: true },
  })
  return NextResponse.json({ user })
}

export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { walletAddress } = await req.json()
  if (!walletAddress || !/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
    return NextResponse.json({ error: "Invalid Ethereum address" }, { status: 400 })
  }
  await prisma.user.update({
    where: { id: session.id },
    data: { walletAddress },
  })
  return NextResponse.json({ ok: true })
}
