import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSessionFromRequest } from "@/lib/auth"
import { releaseEscrow } from "@/lib/escrow"
import { runAiReview } from "@/lib/ai-review"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const gig = await prisma.gig.findUnique({
    where: { id },
    include: { submission: true },
  })
  if (!gig) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (gig.status !== "submitted") {
    return NextResponse.json({ error: "No submission to review" }, { status: 400 })
  }

  const acceptedRequest = await prisma.request.findFirst({
    where: { gigId: id, clientId: session.id, status: "accepted" },
  })
  if (!acceptedRequest) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { action } = await req.json()
  if (!["accept", "dispute"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  if (action === "accept") {
    if (!gig.submission) {
      return NextResponse.json({ error: "No submission to review" }, { status: 400 })
    }

    try {
      const review = await runAiReview(
        {
          description: gig.description,
          deliverables: gig.deliverables,
          category: gig.category,
        },
        {
          textContent: gig.submission.textContent,
          url: gig.submission.url,
        }
      )

      if (review.verdict.action === "RELEASE") {
        if (gig.contractAddress) {
          try {
            await releaseEscrow(gig.contractAddress as `0x${string}`)
          } catch (err) {
            console.error("Escrow release failed:", err)
          }
        }

        await prisma.gig.update({
          where: { id },
          data: {
            status: "completed",
            mediatorVerdict: "released",
            mediatorReasoning: review.verdict.summary,
          },
        })

        return NextResponse.json({
          status: "completed",
          review: review.verdict,
        })
      }

      await prisma.gig.update({
        where: { id },
        data: {
          status: "in_progress",
          mediatorVerdict: "needs_revision",
          mediatorReasoning: review.verdict.remediation ?? review.verdict.summary,
        },
      })

      return NextResponse.json({
        status: "in_progress",
        review: review.verdict,
      })
    } catch (err) {
      console.error("AI review failed:", err)
      return NextResponse.json({ error: "AI review failed, try again later" }, { status: 500 })
    }
  }

  // Dispute → send to mediation, funds stay locked in contract until both parties argue
  await prisma.gig.update({ where: { id }, data: { status: "disputed" } })
  return NextResponse.json({ status: "disputed" })
}
