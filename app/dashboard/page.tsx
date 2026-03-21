"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow, format } from "date-fns"
import { useWallets } from "@privy-io/react-auth"

interface SessionUser { id: string; name: string; email: string; role: string; walletAddress?: string | null }
interface Gig { id: string; title: string; budget: number; status: string; requestCount: number; createdAt: string; deadline: string }
interface Request {
  id: string
  gigId: string
  proposal: string
  proposedTimeline: string
  status: string
  createdAt: string
  ethAmount?: number | null
  gig: { id: string; title: string; budget: number; deadline: string; status?: string; ethAmount?: number | null; contractAddress?: string | null; freelancer?: { id: string; name: string } }
  client?: { id: string; name: string }
}

const STATUS_STYLES: Record<string, string> = {
  open: "bg-primary/10 text-primary",
  in_progress: "bg-amber-100 text-amber-800",
  submitted: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  disputed: "bg-destructive/10 text-destructive",
  pending: "bg-secondary text-secondary-foreground",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-destructive/10 text-destructive",
}

export default function DashboardPage() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [gigs, setGigs] = useState<Gig[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState("")
  const { wallets } = useWallets()
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy")
  const router = useRouter()

  const loadData = useCallback(async (u: SessionUser) => {
    if (u.role === "client") {
      const res = await fetch("/api/dashboard/client")
      if (res.ok) {
        const data = await res.json()
        setGigs(data.gigs)
        setRequests(data.requests)
      }
    } else {
      const res = await fetch("/api/dashboard/freelancer")
      if (res.ok) {
        const data = await res.json()
        setGigs(data.gigs ?? [])
        setRequests(data.requests ?? [])
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.user) { router.push("/login?redirect=/dashboard"); return }
        setUser(d.user)
        loadData(d.user)
      })
  }, [router, loadData])

  async function doAccept(requestId: string) {
    // Save embedded wallet address if not yet recorded
    if (!user?.walletAddress && embeddedWallet?.address) {
      const patch = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: embeddedWallet.address }),
      })
      if (patch.ok) setUser((u) => u ? { ...u, walletAddress: embeddedWallet.address } : u)
    }
    const res = await fetch(`/api/requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept" }),
    })
    if (!res.ok) {
      const data = await res.json()
      setActionError(data.error ?? "Action failed")
      return
    }
    if (user) loadData(user)
  }

  async function handleRequestAction(requestId: string, action: "accept" | "reject") {
    setActionError("")
    if (action === "reject") {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const data = await res.json()
        setActionError(data.error ?? "Action failed")
        return
      }
      if (user) loadData(user)
      return
    }
    await doAccept(requestId)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="h-8 w-48 animate-pulse rounded bg-secondary" />
          <div className="mt-4 h-4 w-64 animate-pulse rounded bg-secondary" />
        </div>
      </main>
    )
  }

  if (!user) return null

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-normal text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, {user.name} · <span className="capitalize">{user.role}</span>
          </p>
        </div>

        {user.role === "client" ? (
          <ClientDashboard requests={requests} />
        ) : (
          <FreelancerDashboard gigs={gigs} requests={requests} onRequestAction={handleRequestAction} actionError={actionError} />
        )}
      </div>
    </main>
  )
}

const STEPS = ["Request sent", "Accepted", "Under review", "Complete"]

function getActiveStep(req: Request): number {
  if (req.status === "pending") return 0
  if (req.status === "rejected") return -1
  const s = req.gig.status
  if (s === "in_progress") return 1
  if (s === "submitted") return 2
  if (s === "completed" || s === "disputed") return 3
  return 1
}

function RequestTracker({ req }: { req: Request }) {
  const active = getActiveStep(req)
  const isRejected = active === -1
  const isDisputed = req.gig.status === "disputed"
  const needsDeposit = active === 1 && !!req.gig.ethAmount && !req.ethAmount

  const steps = isDisputed
    ? ["Request sent", "Accepted", "Under review", "Disputed"]
    : STEPS

  return (
    <div className={`rounded-xl border bg-card p-5 ${isRejected ? "opacity-50" : ""}`}>
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href={`/gig/${req.gig.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
            {req.gig.title}
          </Link>
          {req.gig.freelancer && (
            <span className="ml-2 text-xs text-muted-foreground">by {req.gig.freelancer.name}</span>
          )}
          <p className="mt-0.5 text-xs text-muted-foreground">
            ${req.gig.budget.toLocaleString()} · {req.proposedTimeline}
            {req.gig.deadline ? ` · due ${format(new Date(req.gig.deadline), "MMM d")}` : ""}
          </p>
        </div>
        <Button asChild size="sm" variant="ghost" className="shrink-0 rounded-full">
          <Link href={`/gig/${req.gig.id}`}>View</Link>
        </Button>
      </div>

      {isRejected ? (
        <p className="text-sm text-destructive">Request was declined.</p>
      ) : (
        <>
          {/* Step tracker */}
          <div className="flex items-start">
            {steps.map((label, i) => {
              const done = i < active
              const current = i === active
              const last = i === steps.length - 1
              const disputed = isDisputed && i === steps.length - 1
              return (
                <div key={label} className="flex flex-1 flex-col items-center gap-1.5 last:flex-none">
                  <div className="flex w-full items-center">
                    {/* Dot */}
                    <div className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      disputed ? "border-destructive bg-destructive/10" :
                      done ? "border-primary bg-primary" :
                      current ? "border-primary bg-background" :
                      "border-border bg-background"
                    }`}>
                      {done && !disputed && (
                        <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {current && !disputed && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                      {disputed && i === steps.length - 1 && (
                        <div className="h-2 w-2 rounded-full bg-destructive" />
                      )}
                    </div>
                    {/* Connector */}
                    {!last && (
                      <div className={`h-0.5 w-full transition-colors ${done ? "bg-primary" : "bg-border"}`} />
                    )}
                  </div>
                  {/* Label */}
                  <span className={`text-center text-[11px] leading-tight ${
                    disputed && i === steps.length - 1 ? "text-destructive font-medium" :
                    current ? "font-medium text-foreground" :
                    done ? "text-muted-foreground" :
                    "text-muted-foreground/50"
                  }`}>
                    {label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Deposit callout */}
          {needsDeposit && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-sm text-amber-800">
                Deposit <span className="font-semibold">Ξ {req.gig.ethAmount} ETH</span> to fund the escrow and start the work.{" "}
                <Link href={`/gig/${req.gig.id}`} className="underline hover:text-amber-900">Go to gig →</Link>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ClientDashboard({ requests }: { requests: Request[] }) {
  return (
    <div className="flex flex-col gap-12">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl font-medium">Your Hire Requests</h2>
          <Button asChild size="sm" variant="outline" className="rounded-full px-5">
            <Link href="/gigs">Browse gigs</Link>
          </Button>
        </div>
        {requests.length === 0 ? (
          <div className="rounded-xl border bg-card p-10 text-center">
            <p className="text-muted-foreground">You haven&apos;t sent any hire requests yet.</p>
            <Button asChild size="sm" className="mt-4 rounded-full px-5">
              <Link href="/gigs">Browse gigs</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map((req) => (
              <RequestTracker key={req.id} req={req} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function FreelancerDashboard({ gigs, requests, onRequestAction, actionError }: { gigs: Gig[]; requests: Request[]; onRequestAction: (id: string, action: "accept" | "reject") => void; actionError: string }) {
  const acceptedRequests = requests.filter((r) => r.status === "accepted")
  const activeJobs = acceptedRequests.filter((r) => r.gig.status === "in_progress")
  const completedJobs = acceptedRequests.filter((r) => ["submitted", "completed", "disputed"].includes(r.gig.status ?? ""))

  return (
    <div className="flex flex-col gap-12">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl font-medium">Your Posted Gigs</h2>
          <Button asChild size="sm" variant="outline" className="rounded-full px-5">
            <Link href="/post">Post a gig</Link>
          </Button>
        </div>
        {gigs.length === 0 ? (
          <div className="rounded-xl border bg-card p-10 text-center">
            <p className="text-muted-foreground">You haven&apos;t posted any gigs yet.</p>
            <Button asChild size="sm" className="mt-4 rounded-full px-5">
              <Link href="/post">Post a gig</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-secondary/50">
                  <th className="px-4 py-3 text-left font-medium text-foreground">Title</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Budget</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Requests</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Posted</th>
                </tr>
              </thead>
              <tbody>
                {gigs.map((gig) => (
                  <tr key={gig.id} className="border-b last:border-0 transition-colors hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <Link href={`/gig/${gig.id}`} className="font-medium text-foreground transition-colors hover:text-primary">
                        {gig.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">${gig.budget.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[gig.status] ?? "bg-secondary text-foreground"}`}>
                        {gig.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{gig.requestCount}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDistanceToNow(new Date(gig.createdAt), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {activeJobs.length > 0 && (
        <section>
          <h2 className="mb-4 font-serif text-xl font-medium">Active Jobs</h2>
          <div className="flex flex-col gap-3">
            {activeJobs.map((req) => {
              const escrowFunded = !!req.ethAmount
              const awaitingDeposit = !!req.gig.contractAddress && !!req.gig.ethAmount && !req.ethAmount
              return (
                <div key={req.id} className="rounded-xl border bg-card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-foreground">{req.gig.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {req.client?.name && <span>From {req.client.name} · </span>}
                        ${req.gig.budget.toLocaleString()} · Due {req.gig.deadline ? format(new Date(req.gig.deadline), "MMM d, yyyy") : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {escrowFunded && (
                        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Escrow funded
                        </span>
                      )}
                      <Button asChild size="sm" className="rounded-full px-5">
                        <Link href={`/gig/${req.gig.id}/submit`}>Submit Deliverable</Link>
                      </Button>
                    </div>
                  </div>
                  {awaitingDeposit && (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                      <p className="text-sm text-amber-800">
                        Awaiting client deposit of <span className="font-semibold">Ξ {req.gig.ethAmount} ETH</span> to fund the escrow.
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {completedJobs.length > 0 && (
        <section>
          <h2 className="mb-4 font-serif text-xl font-medium">Completed Jobs</h2>
          <div className="flex flex-col gap-3">
            {completedJobs.map((req) => (
              <div key={req.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-5">
                <div>
                  <p className="font-medium text-foreground">{req.gig.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {req.client?.name && <span>From {req.client.name} · </span>}
                    ${req.gig.budget.toLocaleString()} · Due {req.gig.deadline ? format(new Date(req.gig.deadline), "MMM d, yyyy") : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[req.gig.status ?? ""] ?? "bg-secondary text-foreground"}`}>
                    {(req.gig.status ?? "").replace("_", " ")}
                  </span>
                  <Button asChild size="sm" variant="outline" className="rounded-full px-5">
                    <Link href={`/gig/${req.gig.id}`}>View</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 font-serif text-xl font-medium">Incoming Hire Requests</h2>
        {actionError && (
          <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{actionError}</p>
        )}
        {requests.length === 0 ? (
          <div className="rounded-xl border bg-card p-10 text-center">
            <p className="text-muted-foreground">No hire requests yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map((req) => (
              <div key={req.id} className="rounded-xl border bg-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Link href={`/gig/${req.gig.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                        {req.gig.title}
                      </Link>
                      {req.client && (
                        <>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">from {req.client.name}</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{req.proposal}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Timeline: {req.proposedTimeline} · {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[req.status] ?? "bg-secondary text-foreground"}`}>
                      {req.status}
                    </span>
                    {req.status === "pending" && (
                      <>
                        <Button size="sm" className="rounded-full px-4" onClick={() => onRequestAction(req.id, "accept")}>
                          Accept
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-full px-4 text-destructive hover:text-destructive" onClick={() => onRequestAction(req.id, "reject")}>
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
