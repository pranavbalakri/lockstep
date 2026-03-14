import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSessionFromRequest } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const requests = await prisma.request.findMany({
    where: { clientId: session.id },
    include: {
      gig: {
        select: {
          id: true,
          title: true,
          budget: true,
          deadline: true,
          status: true,
          freelancer: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ requests })
}
