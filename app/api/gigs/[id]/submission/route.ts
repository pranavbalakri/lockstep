import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSessionFromRequest } from "@/lib/auth"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const submissions = await prisma.submission.findMany({
    where: { gigId: id },
    orderBy: { version: "desc" },
    include: {
      freelancer: { select: { id: true, name: true } },
      files: {
        select: {
          id: true,
          filename: true,
          mimeType: true,
          sizeBytes: true,
          fileType: true,
        },
      },
    },
  })

  if (submissions.length === 0) return NextResponse.json({ submission: null, submissions: [] })

  // Return both the latest submission (for backward compatibility) and all submissions
  return NextResponse.json({
    submission: submissions[0],
    submissions,
  })
}
