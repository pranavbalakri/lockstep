"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow, format } from "date-fns"
import { getInitials, getAvatarColor } from "@/lib/avatar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { createWalletClient, custom, parseEther } from "viem"
import { sepolia, anvil } from "viem/chains"
import { DEADDROP_ABI } from "@/lib/contracts/DeadDrop"

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ethereum?: any
  }
}

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
  createdAt: string
  requestCount: number
  freelancer: { id: string; name: string }
  requests: { id: string; clientId: string; status: string; contractAddress?: string; ethAmount?: number }[]
  submission?: {
    textContent?: string
    url?: string
    notes?: string
    filePaths: string
  }
}

const STATUS_STYLES: Record<string, string> = {
  open: "bg-primary/10 text-primary",
  in_progress: "bg-amber-100 text-amber-800",
  submitted: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  disputed: "bg-destructive/10 text-destructive",
}

async function getWalletClient() {
  if (!window.ethereum) throw new Error("No wallet found. Please install MetaMask.")
  const accounts: string[] = await window.ethereum.request({ method: "eth_requestAccounts" })
  const chainIdHex: string = await window.ethereum.request({ method: "eth_chainId" })
  const chainId = parseInt(chainIdHex, 16)
  const chain = chainId === 31337 || chainId === 1337 ? anvil : sepolia
  const walletClient = createWalletClient({ account: accounts[0] as `0x${string}`, chain, transport: custom(window.ethereum) })
  return { walletClient }
}

export default function GigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [gig, setGig] = useState<GigData | null>(null)
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [proposal, setProposal] = useState("")
  const [timeline, setTimeline] = useState("")
  const [walletInput, setWalletInput] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [requestError, setRequestError] = useState("")
  const [hasRequested, setHasRequested] = useState(false)
  const [depositDone, setDepositDone] = useState(false)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewStep, setReviewStep] = useState("")
  const [reviewError, setReviewError] = useState("")
  const [fundLoading, setFundLoading] = useState(false)
  const [fundError, setFundError] = useState("")
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

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault()
    setRequestError("")
    if (!user) { router.push(`/login?redirect=/gig/${id}`); return }
    setSubmitting(true)
    // Save wallet first if the gig needs ETH and user doesn't have one yet
    if (gig?.ethAmount && gig.ethAmount > 0 && !user.walletAddress) {
      if (!walletInput || !/^0x[0-9a-fA-F]{40}$/.test(walletInput)) {
        setRequestError("A valid Ethereum wallet address is required for this gig.")
        setSubmitting(false)
        return
      }
      const walletRes = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: walletInput }),
      })
      if (!walletRes.ok) {
        setRequestError("Failed to save wallet address.")
        setSubmitting(false)
        return
      }
      setUser({ ...user, walletAddress: walletInput })
    }
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
    }
    setSubmitting(false)
  }

  async function fundEscrow() {
    if (!gig?.contractAddress || !gig.ethAmount) return
    setFundLoading(true)
    setFundError("")
    try {
      const { walletClient } = await getWalletClient()

      // Deposit ETH into the already-deployed escrow contract
      await walletClient.writeContract({
        address: gig.contractAddress as `0x${string}`,
        abi: DEADDROP_ABI,
        functionName: "deposit",
        value: parseEther(String(gig.ethAmount)),
      })

      // Record deposit amount in DB for display
      await fetch(`/api/gigs/${id}/contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ethAmount: gig.ethAmount }),
      })

      setDepositDone(true)
      const gigRes = await fetch(`/api/gigs/${id}`)
      if (gigRes.ok) setGig((await gigRes.json()).gig)
    } catch (e: unknown) {
      const err = e as { shortMessage?: string; message?: string }
      setFundError(err.shortMessage ?? err.message ?? "Transaction failed")
    }
    setFundLoading(false)
  }

  async function handleReview(action: "accept" | "dispute") {
    setReviewLoading(true)
    setReviewError("")
    setReviewStep(action === "dispute" ? "Starting mediation…" : "Running AI review…")
    try {
      const res = await fetch(`/api/gigs/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? "Review failed")
      }

      if (data.review?.action === "NOTIFY_FREELANCER") {
        setReviewError(data.review.remediation ?? data.review.summary ?? "AI requested revisions before payment can be released.")
      }

      const gigRes = await fetch(`/api/gigs/${id}`)
      if (gigRes.ok) setGig((await gigRes.json()).gig)
    } catch (e: unknown) {
      const err = e as { shortMessage?: string; message?: string }
      setReviewError(err.shortMessage ?? err.message ?? "Review failed")
    }
    setReviewLoading(false)
    setReviewStep("")
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
  const canSubmit = isFreelancer && gig.status === "in_progress"
  // Show deposit form when: client accepted, contract deployed, ETH required, not yet deposited
  const needsFunding = isClient && gig.status === "in_progress" && !!gig.contractAddress && !!gig.ethAmount && !myRequest?.ethAmount && !depositDone

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
                  {gig.ethAmount && gig.ethAmount > 0 && !user?.walletAddress && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-foreground">Your Ethereum wallet address</label>
                      <input
                        type="text"
                        value={walletInput}
                        onChange={(e) => setWalletInput(e.target.value)}
                        placeholder="0x…"
                        className="h-10 rounded-lg border bg-background px-3 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                      <p className="text-xs text-muted-foreground">Needed to deploy the escrow contract for this gig.</p>
                    </div>
                  )}
                  {gig.ethAmount && gig.ethAmount > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                      <p className="text-sm text-amber-800">This gig requires a <span className="font-semibold">Ξ {gig.ethAmount} ETH</span> escrow deposit. The contract will be deployed automatically when the freelancer accepts your request.</p>
                    </div>
                  )}
                  {requestError && (
                    <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{requestError}</p>
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

            {/* Escrow deposit prompt (contract deployed server-side on accept) */}
            {needsFunding && (
              <section className="mb-8 rounded-xl border bg-card p-5">
                <h2 className="mb-1 font-serif text-lg font-medium text-foreground">Deposit Escrow</h2>
                <p className="mb-1 text-sm text-muted-foreground">
                  This gig requires an ETH deposit of <span className="font-semibold text-foreground">{gig.ethAmount} ETH</span>. Funds are held in the escrow contract until the AI reviews your delivery.
                </p>
                <p className="mb-4 font-mono text-xs text-muted-foreground break-all">{gig.contractAddress}</p>
                {fundError && (
                  <p className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{fundError}</p>
                )}
                <Button className="rounded-full px-6" disabled={fundLoading} onClick={fundEscrow}>
                  {fundLoading ? "Depositing…" : `Deposit ${gig.ethAmount} ETH`}
                </Button>
              </section>
            )}

            {/* Escrow deposited confirmation */}
            {isClient && gig.contractAddress && (myRequest?.ethAmount || depositDone) && (
              <div className="mb-8 rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-medium text-green-800">Escrow funded ✓</p>
                <p className="mt-0.5 font-mono text-xs text-green-700 break-all">{gig.contractAddress}</p>
                {(myRequest?.ethAmount ?? gig.ethAmount) && (
                  <p className="mt-2 text-sm text-green-800">
                    Locked: <span className="font-semibold">{myRequest?.ethAmount ?? gig.ethAmount} ETH</span>
                  </p>
                )}
              </div>
            )}

            {gig.mediatorVerdict === "needs_revision" && gig.mediatorReasoning && (
              <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-5">
                <p className="font-medium text-amber-900">
                  {isFreelancer
                    ? "AI review requested revisions before payment can be released."
                    : "AI review sent this delivery back for revisions."}
                </p>
                <p className="mt-2 text-sm text-amber-800 whitespace-pre-wrap">{gig.mediatorReasoning}</p>
              </div>
            )}

            {/* Submission / Review section (client side) */}
            {isClient && gig.status === "submitted" && gig.submission && (
              <section className="mb-8 rounded-xl border bg-card p-5">
                <h2 className="mb-4 font-serif text-lg font-medium text-foreground">Deliverable Submitted</h2>
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
                  <div className="mb-6">
                    <h3 className="mb-1 text-sm font-medium text-foreground">Notes to client</h3>
                    <p className="text-sm text-muted-foreground">{gig.submission.notes}</p>
                  </div>
                )}
                {gig.contractAddress && (
                  <p className="mb-4 text-xs text-muted-foreground">
                    Lockstep will evaluate the submission with AI before releasing or disputing the escrow contract.
                  </p>
                )}
                {reviewError && (
                  <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{reviewError}</p>
                )}
                <div className="flex items-center gap-3">
                  <Button className="rounded-full px-6" disabled={reviewLoading} onClick={() => handleReview("accept")}>
                    {reviewLoading ? (reviewStep || "Running AI review…") : "Run AI Review"}
                  </Button>
                  <Button variant="outline" className="rounded-full px-6 text-destructive hover:text-destructive" disabled={reviewLoading} onClick={() => handleReview("dispute")}>
                    Dispute
                  </Button>
                </div>
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
            <div className="sticky top-6 rounded-xl border bg-card p-5 shadow-sm">
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
                  <Link href={`/gig/${id}/submit`}>Submit Deliverable</Link>
                </Button>
              )}

              {!user && gig.status === "open" && (
                <Button asChild className="w-full rounded-full">
                  <Link href={`/login?redirect=/gig/${id}`}>Log in to Hire</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
