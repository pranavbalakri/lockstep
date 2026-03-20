"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { FileUpload, UploadedFile } from "@/components/file-upload"
import { SubmissionHistory } from "@/components/submission-history"

interface GigData {
  id: string
  title: string
  deliverables: string
  status: string
  ethAmount?: number | null
  contractAddress?: string | null
  requests: { status: string; ethAmount?: number | null }[]
  submissionCount?: number
}

interface ReviewResult {
  verdict: string
  passed: number
  failed: number
  total: number
  summary: string
  remediation: string | null
}

interface SubmissionFile {
  id: string
  filename: string
  mimeType: string
  sizeBytes: number
  fileType: string
}

interface PastSubmission {
  id: string
  version: number
  textContent: string | null
  url: string | null
  notes: string | null
  createdAt: string
  files: SubmissionFile[]
}

const REVIEW_STEPS = [
  { label: "Parsing gig scope", sub: "Extracting criteria from your deliverables" },
  { label: "Analyzing submission", sub: "Evaluating work against criteria" },
  { label: "Generating verdict", sub: "Deciding release or dispute" },
]

function AIReviewSteps({ step }: { step: number }) {
  return (
    <div className="rounded-xl border bg-secondary/30 p-5">
      <p className="mb-4 text-sm font-medium text-foreground">AI is reviewing your submission…</p>
      <div className="flex flex-col gap-3">
        {REVIEW_STEPS.map((s, i) => {
          const idx = i + 1
          const done = step > idx
          const active = step === idx
          return (
            <div key={s.label} className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                done ? "border-primary bg-primary" :
                active ? "border-primary bg-background" :
                "border-border bg-background"
              }`}>
                {done ? (
                  <svg className="h-2.5 w-2.5 text-primary-foreground" fill="none" viewBox="0 0 10 10">
                    <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : active ? (
                  <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                ) : null}
              </div>
              <div className={`transition-opacity ${active || done ? "opacity-100" : "opacity-40"}`}>
                <p className={`text-sm ${active ? "font-medium text-foreground" : "text-muted-foreground"}`}>{s.label}</p>
                {active && <p className="text-xs text-muted-foreground">{s.sub}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function SubmitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [gig, setGig] = useState<GigData | null>(null)
  const [loading, setLoading] = useState(true)
  const [textContent, setTextContent] = useState("")
  const [url, setUrl] = useState("")
  const [notes, setNotes] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [reviewStep, setReviewStep] = useState(0)
  const [review, setReview] = useState<ReviewResult | null>(null)
  const [pastSubmissions, setPastSubmissions] = useState<PastSubmission[]>([])
  const router = useRouter()

  useEffect(() => {
    Promise.all([
      fetch(`/api/gigs/${id}`).then((r) => r.ok ? r.json() : null),
      fetch("/api/auth/me").then((r) => r.ok ? r.json() : null),
      fetch(`/api/gigs/${id}/submission`).then((r) => r.ok ? r.json() : null),
    ]).then(([gigData, meData, submissionData]) => {
      if (!meData?.user) { router.push(`/login?redirect=/gig/${id}/submit`); return }
      if (meData.user.role !== "freelancer") { router.push(`/gig/${id}`); return }

      if (!gigData?.gig) { router.push("/gigs"); return }
      const isSubmittable = gigData.gig.status === "in_progress" || gigData.gig.status === "submitted"
      if (gigData.gig.freelancer?.id !== meData.user.id || !isSubmittable) {
        router.push(`/gig/${id}`)
        return
      }
      setGig(gigData.gig)
      if (submissionData?.submissions) {
        setPastSubmissions(submissionData.submissions)
      }
      // Don't pre-fill form with old submission data - user should start fresh
      setLoading(false)
    })
  }, [id, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!textContent && !url && uploadedFiles.length === 0) {
      setError("Please provide written content, a link, or upload files.")
      return
    }
    setSubmitting(true)
    setReviewStep(1)
    const t1 = setTimeout(() => setReviewStep(2), 7000)
    const t2 = setTimeout(() => setReviewStep(3), 16000)

    const res = await fetch(`/api/gigs/${id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        textContent: textContent || null,
        url: url || null,
        notes: notes || null,
        fileIds: uploadedFiles.map((f) => f.fileId),
      }),
    })
    clearTimeout(t1); clearTimeout(t2)
    const data = await res.json()
    if (res.ok) {
      setReview(data.review)
      // Add the new submission to the top of the history
      if (data.submission) {
        setPastSubmissions((prev) => [data.submission, ...prev])
      }
      // Update gig submission count
      setGig((prev) => prev ? { ...prev, submissionCount: (prev.submissionCount ?? 0) + 1 } : null)
      // Clear the form for next resubmission
      setUploadedFiles([])
    } else {
      setError(data.error ?? "Submission failed")
    }
    setSubmitting(false)
    setReviewStep(0)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-2xl px-6 py-16">
          <div className="h-8 w-48 animate-pulse rounded bg-secondary" />
        </div>
      </main>
    )
  }

  if (!gig) return null

  const escrowFunded = !gig.ethAmount || !!gig.requests.find(r => r.status === "accepted" && !!r.ethAmount)

  if (!escrowFunded) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-2xl px-6 py-12">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="font-serif text-lg font-medium text-foreground">Waiting for escrow deposit</h2>
            <p className="mt-2 text-sm text-amber-800">
              The client must deposit <span className="font-semibold">Ξ {gig.ethAmount} ETH</span> into the escrow contract before you can submit your deliverable.
            </p>
            <Button asChild variant="outline" className="mt-4 rounded-full px-5" size="sm">
              <Link href={`/gig/${id}`}>Back to gig</Link>
            </Button>
          </div>
        </div>
      </main>
    )
  }

  // Show review steps while AI runs
  if (submitting) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-2xl px-6 py-12">
          <h1 className="font-serif text-2xl font-normal text-foreground mb-6">Submitting & running AI review…</h1>
          <AIReviewSteps step={reviewStep} />
        </div>
      </main>
    )
  }

  // Show AI review result after submission
  if (review) {
    const isPassed = review.verdict === "PASS"
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-2xl px-6 py-12">
          <div className={`rounded-xl border p-5 mb-6 ${isPassed ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
            <div className="mb-3 flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${isPassed ? "bg-green-200 text-green-900" : "bg-amber-200 text-amber-900"}`}>
                {isPassed ? "PASS" : "FAIL"}
              </span>
              <h1 className="font-serif text-xl font-normal text-foreground">AI Review Complete</h1>
              <span className="ml-auto text-xs text-muted-foreground">{review.passed}/{review.total} criteria passed</span>
            </div>
            <p className={`text-sm whitespace-pre-wrap ${isPassed ? "text-green-800" : "text-amber-800"}`}>{review.summary}</p>
            {review.remediation && (
              <div className="mt-3 border-t border-amber-200 pt-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-900">Suggested improvements</p>
                <p className="text-sm text-amber-800 whitespace-pre-wrap">{review.remediation}</p>
              </div>
            )}
          </div>
          <p className="mb-6 text-sm text-muted-foreground">
            {isPassed
              ? "Your submission looks good. The client will review the AI findings and release payment."
              : "The client will review the AI findings and decide whether to accept, dispute, or you can resubmit with revisions."}
          </p>
          <div className="flex items-center gap-3">
            <Button asChild className="rounded-full px-6">
              <Link href={`/gig/${id}`}>View gig</Link>
            </Button>
            {!isPassed && (
              <Button variant="outline" className="rounded-full px-6" onClick={() => {
                // Clear all form state for a fresh resubmission
                setReview(null)
                setTextContent("")
                setUrl("")
                setNotes("")
                setUploadedFiles([])
                setError("")
              }}>
                Revise & Resubmit
              </Button>
            )}
            <Button asChild variant="ghost" className="rounded-full px-6">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </div>
      </main>
    )
  }

  const hasPastSubmissions = pastSubmissions.length > 0

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className={`mx-auto px-6 py-12 ${hasPastSubmissions ? "max-w-5xl" : "max-w-2xl"}`}>
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-normal text-foreground">
            {gig.submissionCount ? "Resubmit Deliverable" : "Submit Deliverable"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{gig.title}</p>
        </div>

        <div className={`${hasPastSubmissions ? "flex gap-6" : ""}`}>
          {/* Main form column */}
          <div className="flex-1 min-w-0">
            {gig.submissionCount ? (
              <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm text-blue-800">
                  You have submitted {gig.submissionCount} time{gig.submissionCount !== 1 ? "s" : ""} previously.
                  This will be revision <span className="font-semibold">#{gig.submissionCount + 1}</span>.
                  Upload new files for this submission.
                </p>
              </div>
            ) : null}

            <div className="mb-6 rounded-xl border bg-secondary/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Expected deliverables</p>
              <p className="text-sm text-foreground">{gig.deliverables}</p>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Written content</label>
                  <p className="text-xs text-muted-foreground">For writing, content, or documentation deliverables.</p>
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Paste your written content here…"
                    rows={6}
                    className="rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">URL / Link</label>
                  <p className="text-xs text-muted-foreground">GitHub repo, live site, Figma file, Google Doc, etc.</p>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://github.com/you/project"
                    className="h-10 rounded-lg border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Files</label>
                  <p className="text-xs text-muted-foreground">Upload images, PDFs, code files, or other deliverables.</p>
                  <FileUpload
                    gigId={id}
                    files={uploadedFiles}
                    onFilesChange={setUploadedFiles}
                    disabled={submitting}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Notes to client</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any notes, caveats, or instructions for the client…"
                    rows={3}
                    className="rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>

                {error && (
                  <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <Button type="submit" size="lg" className="rounded-full px-8">
                    Submit & Run AI Review
                  </Button>
                  <Button asChild variant="ghost" size="lg" className="rounded-full">
                    <Link href={`/gig/${id}`}>Cancel</Link>
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar with submission history */}
          {hasPastSubmissions && (
            <div className="w-72 shrink-0">
              <SubmissionHistory submissions={pastSubmissions} />
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
