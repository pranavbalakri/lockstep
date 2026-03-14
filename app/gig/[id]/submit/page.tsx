"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"

interface GigData {
  id: string
  title: string
  deliverables: string
  status: string
  requests: { freelancerId: string; status: string }[]
}

export default function SubmitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [gig, setGig] = useState<GigData | null>(null)
  const [user, setUser] = useState<{ id: string; role: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [textContent, setTextContent] = useState("")
  const [url, setUrl] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    Promise.all([
      fetch(`/api/gigs/${id}`).then((r) => r.ok ? r.json() : null),
      fetch("/api/auth/me").then((r) => r.ok ? r.json() : null),
    ]).then(([gigData, meData]) => {
      if (!meData?.user) { router.push(`/login?redirect=/gig/${id}/submit`); return }
      if (meData.user.role !== "freelancer") { router.push(`/gig/${id}`); return }
      setUser(meData.user)

      if (!gigData?.gig) { router.push("/gigs"); return }
      const hasAccepted = gigData.gig.requests?.some(
        (r: { freelancerId: string; status: string }) =>
          r.freelancerId === meData.user.id && r.status === "accepted"
      )
      if (!hasAccepted || gigData.gig.status !== "in_progress") {
        router.push(`/gig/${id}`)
        return
      }
      setGig(gigData.gig)
      setLoading(false)
    })
  }, [id, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!textContent && !url) {
      setError("Please provide either written content or a link to your work.")
      return
    }
    setSubmitting(true)
    const res = await fetch(`/api/gigs/${id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ textContent: textContent || null, url: url || null, notes: notes || null }),
    })
    const data = await res.json()
    if (res.ok) {
      setSubmitted(true)
    } else {
      setError(data.error ?? "Submission failed")
    }
    setSubmitting(false)
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

  if (submitted) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6">
          <div className="max-w-md text-center">
            <div className="mb-4 text-4xl">✓</div>
            <h1 className="font-serif text-2xl font-normal text-foreground">Deliverable submitted</h1>
            <p className="mt-3 text-sm text-muted-foreground">Awaiting review from the client.</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button asChild className="rounded-full px-6">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full px-6">
                <Link href={`/gig/${id}`}>View gig</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-normal text-foreground">Submit Deliverable</h1>
          <p className="mt-1 text-sm text-muted-foreground">{gig.title}</p>
        </div>

        {/* Reference */}
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
              <Button type="submit" size="lg" className="rounded-full px-8" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit Deliverable"}
              </Button>
              <Button asChild variant="ghost" size="lg" className="rounded-full">
                <Link href={`/gig/${id}`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
