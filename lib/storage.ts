import fs from "fs/promises"
import path from "path"
import crypto from "crypto"

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "submissions")

// File size limits
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB per file
export const MAX_TOTAL_SIZE = 50 * 1024 * 1024 // 50MB per submission
export const MAX_FILES_PER_SUBMISSION = 5

// Allowed MIME types with their extensions
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  // Images
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
  // Documents
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "text/markdown": [".md"],
  // Code files
  "text/javascript": [".js"],
  "application/javascript": [".js"],
  "text/typescript": [".ts"],
  "application/typescript": [".ts"],
  "text/x-python": [".py"],
  "text/x-java-source": [".java"],
  "text/html": [".html"],
  "text/css": [".css"],
  "application/json": [".json"],
}

// Magic bytes for file type verification
const MAGIC_BYTES: Record<string, number[]> = {
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/gif": [0x47, 0x49, 0x46],
  "image/webp": [0x52, 0x49, 0x46, 0x46], // RIFF header
  "application/pdf": [0x25, 0x50, 0x44, 0x46], // %PDF
}

export type FileType = "image" | "document" | "code" | "other"

export function getFileType(mimeType: string): FileType {
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType === "application/pdf" || mimeType === "text/plain" || mimeType === "text/markdown") return "document"
  if (
    mimeType.includes("javascript") ||
    mimeType.includes("typescript") ||
    mimeType.includes("python") ||
    mimeType.includes("java") ||
    mimeType === "text/html" ||
    mimeType === "text/css" ||
    mimeType === "application/json"
  )
    return "code"
  return "other"
}

export function isAllowedMimeType(mimeType: string): boolean {
  return mimeType in ALLOWED_MIME_TYPES
}

export function sanitizeFilename(filename: string): string {
  // Remove path components
  const basename = path.basename(filename)
  // Replace special characters, keep alphanumeric, dots, dashes, underscores
  const sanitized = basename.replace(/[^a-zA-Z0-9.\-_]/g, "_")
  // Prevent empty or hidden files
  if (!sanitized || sanitized.startsWith(".")) {
    return `file_${Date.now()}`
  }
  // Limit length
  if (sanitized.length > 100) {
    const ext = path.extname(sanitized)
    return sanitized.slice(0, 100 - ext.length) + ext
  }
  return sanitized
}

export function verifyMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const expected = MAGIC_BYTES[mimeType]
  if (!expected) {
    // No magic bytes check for text files
    return true
  }
  if (buffer.length < expected.length) return false
  for (let i = 0; i < expected.length; i++) {
    if (buffer[i] !== expected[i]) return false
  }
  return true
}

async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath)
  } catch {
    await fs.mkdir(dirPath, { recursive: true })
  }
}

export interface StoredFile {
  fileId: string
  filename: string
  storagePath: string
  mimeType: string
  sizeBytes: number
  fileType: FileType
}

export async function storeFile(
  gigId: string,
  filename: string,
  mimeType: string,
  buffer: Buffer
): Promise<StoredFile> {
  // Generate unique file ID
  const fileId = crypto.randomUUID()

  // Sanitize filename
  const safeFilename = sanitizeFilename(filename)

  // Create storage path
  const submissionDir = path.join(UPLOADS_DIR, gigId)
  await ensureDir(submissionDir)

  const storedFilename = `${fileId}_${safeFilename}`
  const storagePath = path.join(submissionDir, storedFilename)

  // Write file
  await fs.writeFile(storagePath, buffer)

  return {
    fileId,
    filename: safeFilename,
    storagePath,
    mimeType,
    sizeBytes: buffer.length,
    fileType: getFileType(mimeType),
  }
}

export async function readFile(storagePath: string): Promise<Buffer> {
  return fs.readFile(storagePath)
}

export async function deleteFile(storagePath: string): Promise<void> {
  try {
    await fs.unlink(storagePath)
  } catch {
    // File may not exist, ignore
  }
}

export async function getFilesForGig(gigId: string): Promise<string[]> {
  const dir = path.join(UPLOADS_DIR, gigId)
  try {
    return await fs.readdir(dir)
  } catch {
    return []
  }
}
