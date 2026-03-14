"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"

interface MediationGig {
  id: string
  status: string
  freelancerId: string
  description: string
  deliverables: string
  clientArgument: string | null
  freelancerArgument: string | null
  mediatorVerdict: string | null
  mediatorReasoning: string | null
  submission: { textContent?: string | null; url?: string | null; notes?: string | null } | null
}

export default function MediatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [gig, setGig] = useState<MediationGig | null>(null)
  const [user, setUser] = useState<{ id: string; role: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [argument, setArgument] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<{ resolved: boolean; verdict?: string; reasoning?: string; waiting?: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    Promise.all([
      fetch(`/api/gigs/${id}/mediate`).then((r) => r.ok ? r.json() : null),
      fetch("/api/auth/me").then((r) => r.ok ? r.json() : null),
    ]).then(([mediateData, meData]) => {
      if (!meData?.user) { router.push(`/login?redirect=/gig/${id}/mediate`); return }
      setUser(meData.user)
      if (!mediateData?.gig || mediateData.gig.status !== "disputed") {
        router.push(`/gig/${id}`)
        return
      }
      setGig(mediateData.gig)
      setLoading(false)
    })
  }, [id, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      const res = await fetch(`/api/gigs/${id}/mediate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ argument }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to submit")
      setResult(data)
      if (data.resolved) {
        const updated = await fetch(`/api/gigs/${id}/mediate`).then((r) => r.json())
        if (updated?.gig) setGig(updated.gig)
      }
    } catch (e: unknown) {
      const err = e as { message?: string }
      setError(err.message ?? "Something went wrong")
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-2xl px-6 py-12">
          <div className="h-8 w-48 animate-pulse rounded bg-secondary" />
        </div>
      </main>
    )
  }

  if (!gig || !user) return null

  const isFreelancer = user.role === "freelancer" && user.id === gig.freelancerId
  const isClient = user.role === "client"
  if (!isFreelancer && !isClient) {
    router.push(`/gig/${id}`)
    return null
  }

  const myArgument = isClient ? gig.clientArgument : gig.freelancerArgument
  const otherArgument = isClient ? gig.freelancerArgument : gig.clientArgument
  const otherRole = isClient ? "freelancer" : "client"

  // Already resolved
  if (gig.mediatorVerdict) {
    const won = (isClient && gig.mediatorVerdict === "refunded") || (isFreelancer && gig.mediatorVerdict === "released")
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-2xl px-6 py-12">
          <div className="mb-6">
            <Link href={`/gig/${id}`} className="text-sm text-muted-foreground hover:text-foreground">← Back to gig</Link>
          </div>
          <h1 className="font-serif text-3xl font-normal text-foreground mb-2">Mediation resolved</h1>
          <div className={`mt-6 rounded-xl border p-5 ${won ? "bg-green-50 border-green-200" : "bg-destructive/5 border-destructive/20"}`}>
            <p className="font-medium text-foreground">
              {gig.mediatorVerdict === "released"
                ? "Payment released to freelancer."
                : "Funds refunded to client."}
            </p>
            {gig.mediatorReasoning && (
              <p className="mt-2 text-sm text-muted-foreground">{gig.mediatorReasoning}</p>
            )}
          </div>
          <Button asChild className="mt-6 rounded-full px-6">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-6">
          <Link href={`/gig/${id}`} className="text-sm text-muted-foreground hover:text-foreground">← Back to gig</Link>
        </div>

        <h1 className="font-serif text-3xl font-normal text-foreground mb-1">Dispute mediation</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Both parties must submit their argument. Once both have responded, the AI mediator will review all evidence and resolve the escrow.
        </p>

        {/* Submission context */}
        {gig.submission && (
          <div className="mb-6 rounded-xl border bg-secondary/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Freelancer&apos;s submission</p>
            {gig.submission.textContent && (
              <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-6">{gig.submission.textContent}</p>
            )}
            {gig.submission.url && (
              <a href={gig.submission.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:text-primary/80 mt-1 block">
                {gig.submission.url}
              </a>
            )}
            {gig.submission.notes && (
              <p className="mt-2 text-xs text-muted-foreground">{gig.submission.notes}</p>
            )}
          </div>
        )}

        {/* Status indicators */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          {(["client", "freelancer"] as const).map((role) => {
            const hasArgued = role === "client" ? !!gig.clientArgument : !!gig.freelancerArgument
            return (
              <div key={role} className={`rounded-lg border p-3 ${hasArgued ? "border-green-300 bg-green-50" : "border-dashed"}`}>
                <p className="text-xs font-medium capitalize text-muted-foreground">{role}</p>
                <p className={`mt-0.5 text-sm font-medium ${hasArgued ? "text-green-700" : "text-muted-foreground"}`}>
                  {hasArgued ? "Argument submitted" : "Waiting…"}
                </p>
              </div>
            )
          })}
        </div>

        {/* Show result if just submitted */}
        {result && !result.resolved && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-800">Argument submitted.</p>
            <p className="mt-1 text-sm text-blue-700">
              Waiting for the {result.waiting} to submit their argument. Check back soon.
            </p>
          </div>
        )}

        {/* Argument form — only if not yet argued */}
        {!myArgument ? (
          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-1 font-serif text-lg font-medium text-foreground">Your argument</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {isClient
                ? "Explain why the deliverable did not meet the agreed scope."
                : "Explain why your deliverable meets the agreed scope and requirements."}
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <textarea
                required
                value={argument}
                onChange={(e) => setArgument(e.target.value)}
                placeholder="Be specific and reference the agreed deliverables…"
                rows={6}
                className="rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary resize-none"
              />
              {error && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="rounded-full px-6 self-start" disabled={submitting}>
                {submitting
                  ? otherArgument ? "Running AI mediator…" : "Submitting…"
                  : "Submit argument"}
              </Button>
            </form>
          </section>
        ) : (
          <div className="rounded-xl border bg-secondary/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Your argument</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{myArgument}</p>
            {!otherArgument && (
              <p className="mt-3 text-sm text-muted-foreground italic">
                Waiting for the {otherRole} to submit their argument before mediation can proceed.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
