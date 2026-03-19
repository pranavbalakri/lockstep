import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSessionFromRequest } from "@/lib/auth"
import { readFile } from "@/lib/storage"

export async function GET(req: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const file = await prisma.submissionFile.findUnique({
    where: { id: fileId },
    include: {
      submission: {
        include: {
          gig: {
            include: {
              requests: {
                where: { status: "accepted" },
                select: { clientId: true },
              },
            },
          },
        },
      },
    },
  })

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }

  // Access control: only gig participants can access files
  // Fetch gig directly to ensure consistent types
  const gig = await prisma.gig.findUnique({
    where: { id: file.gigId },
    include: {
      requests: {
        where: { status: "accepted" },
        select: { clientId: true },
      },
    },
  })

  if (!gig) {
    return NextResponse.json({ error: "Associated gig not found" }, { status: 404 })
  }

  const isFreelancer = gig.freelancerId === session.id
  const isClient = gig.requests.some((r: { clientId: string }) => r.clientId === session.id)
  const isArbiter = session.role === "arbiter"

  if (!isFreelancer && !isClient && !isArbiter) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const buffer = await readFile(file.storagePath)

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `inline; filename="${file.filename}"`,
        "Content-Length": String(file.sizeBytes),
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 })
  }
}
