import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSessionFromRequest } from "@/lib/auth"
import {
  storeFile,
  isAllowedMimeType,
  verifyMagicBytes,
  MAX_FILE_SIZE,
  MAX_TOTAL_SIZE,
  MAX_FILES_PER_SUBMISSION,
} from "@/lib/storage"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== "freelancer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const gig = await prisma.gig.findUnique({ where: { id } })
  if (!gig) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (gig.freelancerId !== session.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (gig.status !== "in_progress" && gig.status !== "submitted") {
    return NextResponse.json({ error: "Gig is not in a submittable state" }, { status: 400 })
  }

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  // Validate MIME type
  if (!isAllowedMimeType(file.type)) {
    return NextResponse.json(
      { error: `File type not allowed: ${file.type}` },
      { status: 400 }
    )
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
      { status: 400 }
    )
  }

  // Check existing files for this gig (not yet submitted)
  const existingFiles = await prisma.submissionFile.findMany({
    where: { gigId: id, submissionId: null },
  })

  if (existingFiles.length >= MAX_FILES_PER_SUBMISSION) {
    return NextResponse.json(
      { error: `Maximum ${MAX_FILES_PER_SUBMISSION} files per submission` },
      { status: 400 }
    )
  }

  const totalExistingSize = existingFiles.reduce((sum, f) => sum + f.sizeBytes, 0)
  if (totalExistingSize + file.size > MAX_TOTAL_SIZE) {
    return NextResponse.json(
      { error: `Total file size exceeds ${MAX_TOTAL_SIZE / 1024 / 1024}MB limit` },
      { status: 400 }
    )
  }

  // Read file buffer and verify magic bytes
  const buffer = Buffer.from(await file.arrayBuffer())
  if (!verifyMagicBytes(buffer, file.type)) {
    return NextResponse.json(
      { error: "File content does not match declared type" },
      { status: 400 }
    )
  }

  // Store file
  const stored = await storeFile(id, file.name, file.type, buffer)

  // Create database record
  const submissionFile = await prisma.submissionFile.create({
    data: {
      id: stored.fileId,
      gigId: id,
      submissionId: null,
      filename: stored.filename,
      storagePath: stored.storagePath,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      fileType: stored.fileType,
    },
  })

  return NextResponse.json(
    {
      fileId: submissionFile.id,
      filename: submissionFile.filename,
      mimeType: submissionFile.mimeType,
      sizeBytes: submissionFile.sizeBytes,
      fileType: submissionFile.fileType,
    },
    { status: 201 }
  )
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== "freelancer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { fileId } = await req.json()
  if (!fileId) {
    return NextResponse.json({ error: "fileId required" }, { status: 400 })
  }

  const file = await prisma.submissionFile.findUnique({ where: { id: fileId } })
  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }
  if (file.gigId !== id) {
    return NextResponse.json({ error: "File does not belong to this gig" }, { status: 403 })
  }
  if (file.submissionId) {
    return NextResponse.json({ error: "Cannot delete file from submitted submission" }, { status: 400 })
  }

  // Verify gig ownership
  const gig = await prisma.gig.findUnique({ where: { id } })
  if (!gig || gig.freelancerId !== session.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Delete from storage and database
  const { deleteFile } = await import("@/lib/storage")
  await deleteFile(file.storagePath)
  await prisma.submissionFile.delete({ where: { id: fileId } })

  return NextResponse.json({ success: true })
}
