import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSessionFromRequest } from "@/lib/auth"
import { runAiReview } from "@/lib/ai-review"
import { readFile } from "@/lib/storage"

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

  const { textContent, url, notes, fileIds } = await req.json()

  interface SubmissionFileData {
    id: string
    filename: string
    mimeType: string
    fileType: string
    storagePath: string
  }

  // Validate and fetch files if provided
  let files: SubmissionFileData[] = []
  if (fileIds && Array.isArray(fileIds) && fileIds.length > 0) {
    const submissionFiles = await prisma.submissionFile.findMany({
      where: {
        id: { in: fileIds as string[] },
        gigId: id,
        submissionId: null,
      },
    })
    if (submissionFiles.length !== fileIds.length) {
      return NextResponse.json({ error: "One or more files not found or already submitted" }, { status: 400 })
    }
    files = submissionFiles.map((f): SubmissionFileData => ({
      id: f.id,
      filename: f.filename,
      mimeType: f.mimeType,
      fileType: f.fileType,
      storagePath: f.storagePath,
    }))
  }

  const existingCount = await prisma.submission.count({ where: { gigId: id } })
  const submission = await prisma.submission.create({
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

  // Link files to submission
  if (files.length > 0) {
    await prisma.submissionFile.updateMany({
      where: { id: { in: files.map(f => f.id) } },
      data: { submissionId: submission.id },
    })
  }

  try {
    // Prepare file data for AI review
    const filesForReview = await Promise.all(
      files.map(async (f) => {
        const buffer = await readFile(f.storagePath)
        return {
          filename: f.filename,
          mimeType: f.mimeType,
          fileType: f.fileType,
          base64: buffer.toString("base64"),
        }
      })
    )

    const review = await runAiReview(
      { description: gig.description, deliverables: gig.deliverables, category: gig.category },
      { textContent: textContent ?? null, url: url ?? null, files: filesForReview }
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

    // Fetch the complete submission with files for the frontend
    const completeSubmission = await prisma.submission.findUnique({
      where: { id: submission.id },
      include: {
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

    return NextResponse.json({
      review: review.verdict,
      submission: completeSubmission,
    }, { status: 201 })
  } catch (err) {
    console.error("AI review failed during submission:", err)
    return NextResponse.json({ error: "AI review failed. Please try submitting again." }, { status: 500 })
  }
}
