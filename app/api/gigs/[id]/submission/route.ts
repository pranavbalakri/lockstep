import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSessionFromRequest } from "@/lib/auth"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const submission = await prisma.submission.findUnique({
    where: { gigId: id },
    include: { freelancer: { select: { id: true, name: true } } },
  })

  if (!submission) return NextResponse.json({ submission: null })
  return NextResponse.json({ submission })
}
