"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { File, Image, FileText, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow, format } from "date-fns"
import { getInitials, getAvatarColor } from "@/lib/avatar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface SessionUser { id: string; name: string; email: string; role: string; walletAddress?: string }

interface GigData {
  id: string
  title: string
  category: string
  description: string
  budget: number
  deadline: string
  skills: string[]
  deliverables: string
  status: string
  ethAmount?: number
  contractAddress?: string
  mediatorVerdict?: string | null
  mediatorReasoning?: string | null
  aiReviewData?: string | null
  createdAt: string
  requestCount: number
  freelancer: {
    id: string
    name: string
    bio?: string | null
    professionalTitle?: string | null
    industry?: string | null
    skills: string[]
    workExperience: { company: string; title: string; period: string; description: string }[]
    education: { school: string; degree: string; year: string }[]
  }
  requests: { id: string; clientId: string; status: string; contractAddress?: string; ethAmount?: number }[]
  submission?: {
    textContent?: string
    url?: string
    notes?: string
    filePaths: string
    files?: {
      id: string
      filename: string
      mimeType: string
      sizeBytes: number
      fileType: string
    }[]
  }
  submissionCount?: number
}

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

const STATUS_STYLES: Record<string, string> = {
  open: "bg-primary/10 text-primary",
  in_progress: "bg-amber-100 text-amber-800",
  submitted: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  disputed: "bg-destructive/10 text-destructive",
}


export default function GigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [gig, setGig] = useState<GigData | null>(null)
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [proposal, setProposal] = useState("")
  const [timeline, setTimeline] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [requestError, setRequestError] = useState("")
  const [requestIssues, setRequestIssues] = useState<string[]>([])
  const [hasRequested, setHasRequested] = useState(false)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewError, setReviewError] = useState("")
  const [disputeMode, setDisputeMode] = useState(false)
  const [disputeArgument, setDisputeArgument] = useState("")
  const [disputeLoading, setDisputeLoading] = useState(false)
  const [disputeError, setDisputeError] = useState("")
  const router = useRouter()

  useEffect(() => {
    Promise.all([
      fetch(`/api/gigs/${id}`).then((r) => r.ok ? r.json() : null),
      fetch("/api/auth/me").then((r) => r.ok ? r.json() : null),
    ]).then(([gigData, meData]) => {
      if (gigData?.gig) setGig(gigData.gig)
      if (meData?.user) {
        setUser(meData.user)
        if (gigData?.gig && meData.user.role === "client") {
          const already = gigData.gig.requests?.some(
            (r: { clientId: string }) => r.clientId === meData.user.id
          )
          setHasRequested(already)
        }
      }
      setLoading(false)
    })
  }, [id])

  async function doSubmitRequest() {
    const res = await fetch(`/api/gigs/${id}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposal, proposedTimeline: timeline }),
    })
    const data = await res.json()
    if (res.ok) {
      setHasRequested(true)
      setShowRequestForm(false)
      if (gig) setGig({ ...gig, requestCount: gig.requestCount + 1 })
    } else {
      setRequestError(data.error ?? "Failed to submit")
      if (data.issues?.length) setRequestIssues(data.issues)
    }
    setSubmitting(false)
  }

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault()
    setRequestError("")
    if (!user) { router.push(`/login?redirect=/gig/${id}`); return }
    setSubmitting(true)
    await doSubmitRequest()
  }


  async function handleAccept() {
    setReviewLoading(true)
    setReviewError("")
    try {
      const res = await fetch(`/api/gigs/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to release payment")
      const gigRes = await fetch(`/api/gigs/${id}`)
      if (gigRes.ok) setGig((await gigRes.json()).gig)
    } catch (e: unknown) {
      const err = e as { message?: string }
      setReviewError(err.message ?? "Failed to release payment")
    }
    setReviewLoading(false)
  }

  async function handleDispute() {
    if (!disputeArgument.trim()) { setDisputeError("Please provide an argument for your dispute."); return }
    setDisputeLoading(true)
    setDisputeError("")
    try {
      const res = await fetch(`/api/gigs/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dispute", argument: disputeArgument }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to submit dispute")
      const gigRes = await fetch(`/api/gigs/${id}`)
      if (gigRes.ok) setGig((await gigRes.json()).gig)
    } catch (e: unknown) {
      const err = e as { message?: string }
      setDisputeError(err.message ?? "Failed to submit dispute")
    }
    setDisputeLoading(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col gap-4">
            <div className="h-10 w-2/3 animate-pulse rounded bg-secondary" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-secondary" />
          </div>
        </div>
      </main>
    )
  }

  if (!gig) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-7xl px-6 py-20 text-center">
          <h1 className="font-serif text-2xl text-foreground">Gig not found</h1>
          <Button asChild className="mt-6 rounded-full px-6">
            <Link href="/gigs">Browse gigs</Link>
          </Button>
        </div>
      </main>
    )
  }

  const isFreelancer = user?.id === gig.freelancer.id
  const isClient = user?.role === "client"
  const myRequest = gig.requests?.find((r) => r.clientId === user?.id)
  // For freelancers, find the accepted request to check escrow funding status
  const acceptedRequest = gig.requests?.find((r) => r.status === "accepted")
  const escrowFunded = isFreelancer ? !!acceptedRequest?.ethAmount : !!myRequest?.ethAmount
  const canSubmit = isFreelancer && (gig.status === "in_progress" || gig.status === "submitted")
  // Show pay button when: client accepted, contract deployed, ETH required, not yet paid
  const needsPayment = isClient && gig.status === "in_progress" && !!gig.contractAddress && !!gig.ethAmount && !myRequest?.ethAmount
  const paymentComplete = isClient && gig.contractAddress && !!myRequest?.ethAmount

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Left column */}
          <div className="min-w-0 flex-1">
            {/* Breadcrumb */}
            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/gigs" className="hover:text-foreground transition-colors">Browse gigs</Link>
              <span>/</span>
              <span className="text-foreground">{gig.title}</span>
            </div>

            {/* Title + meta */}
            <div className="mb-6">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${STATUS_STYLES[gig.status] ?? "bg-secondary text-foreground"}`}>
                  {gig.status.replace("_", " ")}
                </span>
                <span className="rounded-full bg-secondary px-3 py-0.5 text-xs font-medium text-secondary-foreground">
                  {gig.category}
                </span>
              </div>
              <h1 className="font-serif text-3xl font-normal text-foreground">{gig.title}</h1>
              <div className="mt-3 flex items-center gap-3">
                <Avatar className="h-6 w-6">
                  <AvatarFallback
                    className="text-[10px] font-medium text-white"
                    style={{ backgroundColor: getAvatarColor(gig.freelancer.id) }}
                  >
                    {getInitials(gig.freelancer.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">
                  Offered by <span className="text-foreground">{gig.freelancer.name}</span> · {formatDistanceToNow(new Date(gig.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>

            {/* Description */}
            <section className="mb-8">
              <h2 className="mb-3 font-serif text-lg font-medium text-foreground">Description</h2>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{gig.description}</p>
            </section>

            {/* Deliverables */}
            <section className="mb-8">
              <h2 className="mb-3 font-serif text-lg font-medium text-foreground">Deliverables</h2>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{gig.deliverables}</p>
            </section>

            {/* Skills */}
            {gig.skills.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-3 font-serif text-lg font-medium text-foreground">Required skills</h2>
                <div className="flex flex-wrap gap-2">
                  {gig.skills.map((s) => (
                    <span key={s} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                      {s}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Request Form */}
            {showRequestForm && (
              <section className="mb-8 rounded-xl border bg-card p-5">
                <h2 className="mb-4 font-serif text-lg font-medium text-foreground">Request to Hire</h2>
                <form onSubmit={submitRequest} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-foreground">Project description</label>
                    <textarea
                      required
                      value={proposal}
                      onChange={(e) => setProposal(e.target.value)}
                      maxLength={3000}
                      placeholder="Describe your project, requirements, and why you'd like to work with this freelancer…"
                      rows={5}
                      className="rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                    />
                    <p className="text-xs text-muted-foreground text-right">{proposal.length}/3000</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-foreground">Proposed timeline</label>
                    <input
                      required
                      value={timeline}
                      onChange={(e) => setTimeline(e.target.value)}
                      placeholder="e.g. 5 days, 2 weeks"
                      className="h-10 rounded-lg border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  {gig.ethAmount && gig.ethAmount > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                      <p className="text-sm text-amber-800">This gig requires payment of <span className="font-semibold">${gig.budget.toLocaleString()}</span>. You&apos;ll be prompted to complete payment after the freelancer accepts your request.</p>
                    </div>
                  )}
                  {requestError && (
                    <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      <p>{requestError}</p>
                      {requestIssues.length > 0 && (
                        <ul className="mt-1.5 list-disc pl-4 space-y-0.5">
                          {requestIssues.map((issue, i) => <li key={i}>{issue}</li>)}
                        </ul>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Button type="submit" className="rounded-full px-6" disabled={submitting}>
                      {submitting ? "Submitting…" : "Submit Request"}
                    </Button>
                    <Button type="button" variant="ghost" className="rounded-full" onClick={() => setShowRequestForm(false)} disabled={submitting}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </section>
            )}


            {/* Payment prompt (fiat payment flow) */}
            {needsPayment && (
              <section className="mb-8 rounded-xl border bg-card p-5">
                <h2 className="mb-1 font-serif text-lg font-medium text-foreground">Complete Payment</h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  Pay <span className="font-semibold text-foreground">${gig.budget.toLocaleString()}</span> to fund the escrow. Funds are held until the AI reviews the deliverable.
                </p>
                <Button asChild className="rounded-full px-6">
                  <Link href={`/gig/${id}/pay`}>Pay Now</Link>
                </Button>
              </section>
            )}

            {/* Payment complete confirmation */}
            {paymentComplete && (
              <div className="mb-8 rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-medium text-green-800">Payment Complete</p>
                <p className="mt-1 text-sm text-green-800">
                  Escrow funded: <span className="font-semibold">{myRequest?.ethAmount ?? gig.ethAmount} ETH</span>
                </p>
              </div>
            )}

            {/* ETH Escrow flow diagram */}
            {gig.ethAmount && gig.ethAmount > 0 && gig.contractAddress && (
              <EscrowFlow
                status={gig.status}
                ethAmount={gig.ethAmount}
                funded={escrowFunded}
              />
            )}

            {gig.aiReviewData && (isFreelancer || !!myRequest) && (
              <AIReviewResult data={gig.aiReviewData} />
            )}

            {/* Submission / Review section */}
            {(isClient || isFreelancer) && (gig.status === "submitted" || gig.status === "completed") && gig.submission && (
              <section className="mb-8 rounded-xl border bg-card p-5">
                <h2 className="mb-4 font-serif text-lg font-medium text-foreground">
                  {gig.status === "completed" ? "Delivered Work" : "Deliverable Submitted"}
                </h2>
                {gig.submission.textContent && (
                  <div className="mb-4">
                    <h3 className="mb-1 text-sm font-medium text-foreground">Submission</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{gig.submission.textContent}</p>
                  </div>
                )}
                {gig.submission.url && (
                  <div className="mb-4">
                    <h3 className="mb-1 text-sm font-medium text-foreground">Link</h3>
                    <a href={gig.submission.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:text-primary/80">
                      {gig.submission.url}
                    </a>
                  </div>
                )}
                {gig.submission.notes && (
                  <div className="mb-4">
                    <h3 className="mb-1 text-sm font-medium text-foreground">Notes to client</h3>
                    <p className="text-sm text-muted-foreground">{gig.submission.notes}</p>
                  </div>
                )}
                {gig.submission.files && gig.submission.files.length > 0 && (
                  <div className="mb-6">
                    <h3 className="mb-2 text-sm font-medium text-foreground">Attached Files</h3>
                    <div className="flex flex-col gap-2">
                      {gig.submission.files.map((file) => {
                        const Icon = getFileIcon(file.fileType)
                        return (
                          <a
                            key={file.id}
                            href={`/api/files/${file.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2 transition-colors hover:bg-secondary/50"
                          >
                            <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">{file.filename}</p>
                              <p className="text-xs text-muted-foreground">{formatFileSize(file.sizeBytes)}</p>
                            </div>
                            <Download className="h-4 w-4 text-muted-foreground" />
                          </a>
                        )
                      })}
                    </div>
                  </div>
                )}
                {isClient && gig.status === "submitted" && (
                  <>
                    {reviewError && (
                      <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{reviewError}</p>
                    )}
                    {!disputeMode ? (
                      <div className="flex items-center gap-3">
                        <Button className="rounded-full px-6" disabled={reviewLoading} onClick={handleAccept}>
                          {reviewLoading ? "Releasing…" : "Accept & Release Payment"}
                        </Button>
                        <Button variant="outline" className="rounded-full px-6 text-destructive hover:text-destructive" onClick={() => setDisputeMode(true)}>
                          Dispute
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-medium text-foreground">Your argument</label>
                          <p className="text-xs text-muted-foreground">Explain why the deliverable does not meet the agreed scope.</p>
                          <textarea
                            value={disputeArgument}
                            onChange={(e) => setDisputeArgument(e.target.value)}
                            placeholder="Be specific and reference the agreed deliverables…"
                            rows={4}
                            className="rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                          />
                        </div>
                        {disputeError && (
                          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{disputeError}</p>
                        )}
                        <div className="flex items-center gap-3">
                          <Button variant="outline" className="rounded-full px-6 text-destructive hover:text-destructive" disabled={disputeLoading} onClick={handleDispute}>
                            {disputeLoading ? "Submitting…" : "Submit Dispute"}
                          </Button>
                          <Button variant="ghost" className="rounded-full" onClick={() => { setDisputeMode(false); setDisputeArgument(""); setDisputeError("") }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>
            )}

            {gig.status === "completed" && (
              <div className="mb-8 rounded-xl border border-green-200 bg-green-50 p-5">
                <p className="font-medium text-foreground">
                  Payment released — project complete.{gig.contractAddress ? " Escrow funds sent to freelancer." : ""}
                </p>
              </div>
            )}

            {gig.status === "disputed" && (
              <div className="mb-8 rounded-xl border border-destructive/20 bg-destructive/5 p-5">
                <p className="font-medium text-foreground">This gig is under dispute.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Both parties must submit their arguments for AI mediation to resolve the escrow.
                </p>
                {(isClient || isFreelancer) && (
                  <Button asChild className="mt-3 rounded-full px-5" size="sm">
                    <Link href={`/gig/${id}/mediate`}>Go to mediation</Link>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="lg:w-72 shrink-0">
            <div className="sticky top-6 flex flex-col gap-4">
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="mb-4 border-b pb-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Budget</p>
                <p className="mt-1 font-serif text-3xl font-normal text-foreground">${gig.budget.toLocaleString()}</p>
              </div>
              <div className="mb-4 border-b pb-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Deadline</p>
                <p className="mt-1 text-sm text-foreground">{format(new Date(gig.deadline), "MMMM d, yyyy")}</p>
              </div>
              {gig.ethAmount && gig.ethAmount > 0 && (
                <div className="mb-4 border-b pb-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">ETH Deposit Required</p>
                  <p className="mt-1 text-sm text-foreground">Ξ {gig.ethAmount}</p>
                </div>
              )}
              <div className="mb-6">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Requests</p>
                <p className="mt-1 text-sm text-foreground">{gig.requestCount}</p>
              </div>

              {/* CTA area */}
              {isFreelancer && (
                <Button asChild variant="outline" className="w-full rounded-full">
                  <Link href={`/post`}>Edit Gig</Link>
                </Button>
              )}

              {isClient && gig.status === "open" && (
                hasRequested ? (
                  <p className="text-center text-sm text-muted-foreground">Request sent ✓</p>
                ) : showRequestForm ? null : (
                  <Button
                    className="w-full rounded-full"
                    onClick={() => {
                      if (!user) { router.push(`/login?redirect=/gig/${id}`); return }
                      setShowRequestForm(true)
                    }}
                  >
                    Request to Hire
                  </Button>
                )
              )}

              {canSubmit && (
                <Button asChild className="w-full rounded-full">
                  <Link href={`/gig/${id}/submit`}>
                    {gig.status === "submitted" ? "Resubmit Deliverable" : "Submit Deliverable"}
                  </Link>
                </Button>
              )}

              {!user && gig.status === "open" && (
                <Button asChild className="w-full rounded-full">
                  <Link href={`/login?redirect=/gig/${id}`}>Log in to Hire</Link>
                </Button>
              )}
            </div>

            {/* Freelancer profile card */}
            <FreelancerCard freelancer={gig.freelancer} />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function FreelancerCard({ freelancer }: { freelancer: GigData["freelancer"] }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback
            className="text-sm font-medium text-white"
            style={{ backgroundColor: getAvatarColor(freelancer.id) }}
          >
            {getInitials(freelancer.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{freelancer.name}</p>
          {freelancer.professionalTitle && (
            <p className="truncate text-xs text-muted-foreground">{freelancer.professionalTitle}</p>
          )}
        </div>
      </div>

      {freelancer.bio && (
        <p className="mb-4 text-xs leading-relaxed text-muted-foreground">{freelancer.bio}</p>
      )}

      {freelancer.skills.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {freelancer.skills.map((s) => (
              <span key={s} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {freelancer.workExperience.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Experience</p>
          <div className="flex flex-col gap-3">
            {freelancer.workExperience.map((w, i) => (
              <div key={i}>
                <p className="text-xs font-medium text-foreground">{w.title}</p>
                <p className="text-xs text-muted-foreground">{w.company} · {w.period}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {freelancer.education.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Education</p>
          <div className="flex flex-col gap-2">
            {freelancer.education.map((e, i) => (
              <div key={i}>
                <p className="text-xs font-medium text-foreground">{e.school}</p>
                <p className="text-xs text-muted-foreground">{e.degree} · {e.year}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface AIVerdictData {
  verdict: string
  passed: number
  failed: number
  total: number
  summary: string
  remediation: string | null
}

function AIReviewResult({ data }: { data: string }) {
  let review: AIVerdictData | null = null
  try { review = JSON.parse(data) } catch { return null }
  if (!review) return null

  const isPassed = review.verdict === "PASS"
  return (
    <div className={`mb-8 rounded-xl border p-5 ${isPassed ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${isPassed ? "bg-green-200 text-green-900" : "bg-amber-200 text-amber-900"}`}>
          {isPassed ? "PASS" : "FAIL"}
        </span>
        <h3 className="font-serif text-base font-medium text-foreground">AI Review</h3>
        <span className="ml-auto text-xs text-muted-foreground">{review.passed}/{review.total} criteria passed</span>
      </div>
      <p className={`text-sm whitespace-pre-wrap ${isPassed ? "text-green-800" : "text-amber-800"}`}>{review.summary}</p>
      {review.remediation && (
        <div className="mt-3 border-t border-amber-200 pt-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-900">Required revisions</p>
          <p className="text-sm text-amber-800 whitespace-pre-wrap">{review.remediation}</p>
        </div>
      )}
    </div>
  )
}


function EscrowFlow({ status, ethAmount, funded }: {
  status: string
  ethAmount: number
  funded: boolean
}) {
  const completed = status === "completed"
  const refunded = status === "disputed" && !funded

  const clientActive = !funded
  const escrowActive = funded && !completed && !refunded
  const freelancerActive = completed
  const clientRefunded = refunded

  return (
    <div className="mb-8 rounded-xl border bg-card p-5">
      <p className="mb-4 text-sm font-medium text-foreground">ETH Escrow Flow</p>
      <div className="flex items-center gap-0">
        {/* Client node */}
        <div className="flex flex-col items-center gap-1.5">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors ${
            clientActive ? "border-primary bg-primary/10 text-primary" :
            clientRefunded ? "border-green-500 bg-green-50 text-green-700" :
            "border-border bg-secondary text-muted-foreground"
          }`}>
            {clientRefunded ? "↩" : "C"}
          </div>
          <span className="text-[10px] text-muted-foreground">{clientRefunded ? "Refunded" : "Client"}</span>
        </div>

        {/* Arrow client → escrow */}
        <div className={`h-0.5 flex-1 transition-colors ${funded ? "bg-primary" : "bg-border"}`} />

        {/* Escrow node */}
        <div className="flex flex-col items-center gap-1.5">
          <div className={`flex h-12 w-12 flex-col items-center justify-center rounded-full border-2 transition-colors ${
            escrowActive ? "border-amber-400 bg-amber-50" :
            completed ? "border-border bg-secondary" :
            funded ? "border-amber-400 bg-amber-50" :
            "border-border bg-secondary"
          }`}>
            <span className="text-[10px] font-semibold text-amber-700">{escrowActive || funded ? "🔒" : "⬡"}</span>
          </div>
          <span className="text-[10px] text-muted-foreground">Escrow</span>
          {(funded || completed) && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-800">
              Ξ {ethAmount}
            </span>
          )}
        </div>

        {/* Arrow escrow → freelancer */}
        <div className={`h-0.5 flex-1 transition-colors ${completed ? "bg-primary" : "bg-border"}`} />

        {/* Freelancer node */}
        <div className="flex flex-col items-center gap-1.5">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors ${
            freelancerActive ? "border-green-500 bg-green-50 text-green-700" :
            "border-border bg-secondary text-muted-foreground"
          }`}>
            {freelancerActive ? "✓" : "F"}
          </div>
          <span className="text-[10px] text-muted-foreground">{freelancerActive ? "Paid" : "Freelancer"}</span>
        </div>
      </div>
    </div>
  )
}
