import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSessionFromRequest } from "@/lib/auth"
import { runAiReview } from "@/lib/ai-review"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== "freelancer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const gig = await prisma.gig.findUnique({
    where: { id },
    include: { requests: { where: { status: "accepted" }, select: { ethAmount: true } } },
  })
  if (!gig) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (gig.freelancerId !== session.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  if (gig.status !== "in_progress" && gig.status !== "submitted") {
    return NextResponse.json({ error: "Gig is not in a submittable state" }, { status: 400 })
  }
  if (gig.ethAmount && gig.ethAmount > 0 && !gig.requests[0]?.ethAmount) {
    return NextResponse.json({ error: "Client must deposit ETH escrow before you can submit" }, { status: 400 })
  }

  const { textContent, url, notes } = await req.json()

  const existingCount = await prisma.submission.count({ where: { gigId: id } })
  await prisma.submission.create({
    data: {
      gigId: id,
      freelancerId: session.id,
      version: existingCount + 1,
      textContent: textContent ?? null,
      url: url ?? null,
      filePaths: "[]",
      notes: notes ?? null,
    },
  })

  try {
    const review = await runAiReview(
      { description: gig.description, deliverables: gig.deliverables, category: gig.category },
      { textContent: textContent ?? null, url: url ?? null }
    )

    await prisma.gig.update({
      where: { id },
      data: {
        status: "submitted",
        mediatorVerdict: null,
        mediatorReasoning: null,
        clientArgument: null,
        freelancerArgument: null,
        aiReviewData: JSON.stringify(review.verdict),
      },
    })

    return NextResponse.json({ review: review.verdict }, { status: 201 })
  } catch (err) {
    console.error("AI review failed during submission:", err)
    return NextResponse.json({ error: "AI review failed. Please try submitting again." }, { status: 500 })
  }
}
