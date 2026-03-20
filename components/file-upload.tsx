"use client"

import { useState, useRef, useCallback } from "react"
import { Upload, File, Image, FileText, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface UploadedFile {
  fileId: string
  filename: string
  mimeType: string
  sizeBytes: number
  fileType: string
}

interface FileUploadProps {
  gigId: string
  files: UploadedFile[]
  onFilesChange: (files: UploadedFile[]) => void
  maxFiles?: number
  disabled?: boolean
}

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/javascript",
  "application/javascript",
  "text/typescript",
  "application/typescript",
  "text/x-python",
  "text/html",
  "text/css",
  "application/json",
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function getFileIcon(fileType: string) {
  if (fileType === "image") return Image
  if (fileType === "document" || fileType === "code") return FileText
  return File
}

export function FileUpload({
  gigId,
  files,
  onFilesChange,
  maxFiles = 5,
  disabled = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingCount, setUploadingCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadFile = async (file: File): Promise<UploadedFile | null> => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(`File type not allowed: ${file.type || "unknown"}`)
      return null
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large: ${file.name} (max 10MB)`)
      return null
    }

    const formData = new FormData()
    formData.append("file", file)

    const res = await fetch(`/api/gigs/${gigId}/upload`, {
      method: "POST",
      body: formData,
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || "Upload failed")
      return null
    }

    return res.json()
  }

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      setError(null)
      const filesToUpload = Array.from(fileList)
      const remaining = maxFiles - files.length

      if (filesToUpload.length > remaining) {
        setError(`Can only upload ${remaining} more file(s)`)
        return
      }

      setUploadingCount(filesToUpload.length)
      const uploaded: UploadedFile[] = []

      for (const file of filesToUpload) {
        const result = await uploadFile(file)
        if (result) {
          uploaded.push(result)
        }
        setUploadingCount((c) => c - 1)
      }

      if (uploaded.length > 0) {
        onFilesChange([...files, ...uploaded])
      }
    },
    [files, maxFiles, onFilesChange, gigId]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (disabled || files.length >= maxFiles) return
      handleFiles(e.dataTransfer.files)
    },
    [disabled, files.length, maxFiles, handleFiles]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
    e.target.value = ""
  }

  const removeFile = async (fileId: string) => {
    const res = await fetch(`/api/gigs/${gigId}/upload`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId }),
    })

    if (res.ok) {
      onFilesChange(files.filter((f) => f.fileId !== fileId))
    }
  }

  const canUpload = !disabled && files.length < maxFiles && uploadingCount === 0

  return (
    <div className="flex flex-col gap-3">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => canUpload && inputRef.current?.click()}
        className={`relative rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : canUpload
            ? "border-border hover:border-primary/50 cursor-pointer"
            : "border-border/50 bg-muted/30 cursor-not-allowed"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ALLOWED_TYPES.join(",")}
          onChange={handleInputChange}
          className="hidden"
          disabled={!canUpload}
        />

        {uploadingCount > 0 ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Uploading {uploadingCount} file{uploadingCount > 1 ? "s" : ""}...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className={`h-8 w-8 ${canUpload ? "text-muted-foreground" : "text-muted-foreground/50"}`} />
            <p className={`text-sm ${canUpload ? "text-foreground" : "text-muted-foreground/50"}`}>
              {files.length >= maxFiles
                ? `Maximum ${maxFiles} files reached`
                : "Drag and drop files here, or click to select"}
            </p>
            <p className="text-xs text-muted-foreground">
              Images, PDFs, code files (max 10MB each, {maxFiles} files total)
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          {files.map((file) => {
            const Icon = getFileIcon(file.fileType)
            return (
              <div
                key={file.fileId}
                className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2"
              >
                <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{file.filename}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.sizeBytes)}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    removeFile(file.fileId)
                  }}
                  disabled={disabled}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
