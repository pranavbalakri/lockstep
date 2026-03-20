"use client"

import { FileText, Image, File, Clock, ChevronRight, ChevronDown } from "lucide-react"
import { useState } from "react"

interface SubmissionFile {
  id: string
  filename: string
  mimeType: string
  sizeBytes: number
  fileType: string
}

interface Submission {
  id: string
  version: number
  textContent: string | null
  url: string | null
  notes: string | null
  createdAt: string
  files: SubmissionFile[]
}

interface SubmissionHistoryProps {
  submissions: Submission[]
  currentVersion?: number
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function getFileIcon(fileType: string) {
  if (fileType === "image") return Image
  if (fileType === "document" || fileType === "code") return FileText
  return File
}

function SubmissionItem({ submission, isLatest }: { submission: Submission; isLatest: boolean }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-3 text-left hover:bg-secondary/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              Version {submission.version}
            </span>
            {isLatest && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Latest
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDate(submission.createdAt)}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pl-9">
          {submission.textContent && (
            <div className="mb-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">Written content</p>
              <p className="text-xs text-foreground line-clamp-3 whitespace-pre-wrap">
                {submission.textContent}
              </p>
            </div>
          )}

          {submission.url && (
            <div className="mb-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">Link</p>
              <a
                href={submission.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline break-all"
              >
                {submission.url}
              </a>
            </div>
          )}

          {submission.files.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Files ({submission.files.length})
              </p>
              <div className="flex flex-col gap-1">
                {submission.files.map((file) => {
                  const Icon = getFileIcon(file.fileType)
                  return (
                    <div
                      key={file.id}
                      className="flex items-center gap-2 rounded bg-secondary/50 px-2 py-1"
                    >
                      <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="text-xs text-foreground truncate flex-1">
                        {file.filename}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatFileSize(file.sizeBytes)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {submission.notes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
              <p className="text-xs text-foreground line-clamp-2 whitespace-pre-wrap">
                {submission.notes}
              </p>
            </div>
          )}

          {!submission.textContent && !submission.url && submission.files.length === 0 && !submission.notes && (
            <p className="text-xs text-muted-foreground italic">No content</p>
          )}
        </div>
      )}
    </div>
  )
}

export function SubmissionHistory({ submissions, currentVersion }: SubmissionHistoryProps) {
  if (submissions.length === 0) {
    return null
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="border-b border-border px-3 py-3">
        <h3 className="text-sm font-medium text-foreground">Submission History</h3>
        <p className="text-xs text-muted-foreground">
          {submissions.length} previous submission{submissions.length !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {submissions.map((submission, index) => (
          <SubmissionItem
            key={submission.id}
            submission={submission}
            isLatest={index === 0}
          />
        ))}
      </div>
    </div>
  )
}
