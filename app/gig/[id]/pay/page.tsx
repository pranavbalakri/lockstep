"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"

interface GigData {
  id: string
  title: string
  budget: number
  ethAmount?: number | null
  contractAddress?: string | null
  status: string
  requests: { clientId: string; status: string; ethAmount?: number | null }[]
}

export default function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [gig, setGig] = useState<GigData | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    Promise.all([
      fetch(`/api/gigs/${id}`).then((r) => r.ok ? r.json() : null),
      fetch("/api/auth/me").then((r) => r.ok ? r.json() : null),
    ]).then(([gigData, meData]) => {
      if (!meData?.user) { router.push(`/login?redirect=/gig/${id}/pay`); return }
      if (meData.user.role !== "client") { router.push(`/gig/${id}`); return }
      setUserId(meData.user.id)

      if (!gigData?.gig) { router.push("/gigs"); return }
      setGig(gigData.gig)
      setLoading(false)
    })
  }, [id, router])

  async function handlePay() {
    setError("")
    setPaying(true)
    const res = await fetch(`/api/gigs/${id}/pay`, { method: "POST" })
    const data = await res.json()
    if (res.ok) {
      setSuccess(true)
    } else {
      setError(data.error ?? "Payment failed")
    }
    setPaying(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-md px-6 py-16">
          <div className="h-8 w-48 animate-pulse rounded bg-secondary" />
        </div>
      </main>
    )
  }

  if (!gig) return null

  const myRequest = gig.requests.find(r => r.clientId === userId && r.status === "accepted")
  const alreadyPaid = !!myRequest?.ethAmount

  if (alreadyPaid) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-md px-6 py-12">
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="font-serif text-xl font-medium text-foreground mb-2">Payment Complete</h1>
            <p className="text-sm text-green-800 mb-4">
              Your payment of <span className="font-semibold">${gig.budget.toLocaleString()}</span> has been processed and the escrow is funded.
            </p>
            <Button asChild className="rounded-full px-6">
              <Link href={`/gig/${id}`}>View Gig</Link>
            </Button>
          </div>
        </div>
      </main>
    )
  }

  if (!myRequest) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-md px-6 py-12">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="font-serif text-lg font-medium text-foreground">No Accepted Request</h2>
            <p className="mt-2 text-sm text-amber-800">
              You don&apos;t have an accepted request for this gig yet.
            </p>
            <Button asChild variant="outline" className="mt-4 rounded-full px-5" size="sm">
              <Link href={`/gig/${id}`}>Back to gig</Link>
            </Button>
          </div>
        </div>
      </main>
    )
  }

  if (success) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-md px-6 py-12">
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="font-serif text-xl font-medium text-foreground mb-2">Payment Successful</h1>
            <p className="text-sm text-green-800 mb-4">
              Your payment of <span className="font-semibold">${gig.budget.toLocaleString()}</span> has been processed. The escrow is now funded.
            </p>
            <Button asChild className="rounded-full px-6">
              <Link href={`/gig/${id}`}>View Gig</Link>
            </Button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-md px-6 py-12">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-2xl font-normal text-foreground">Complete Payment</h1>
          <p className="mt-1 text-sm text-muted-foreground">{gig.title}</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-6 border-b pb-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Amount Due</p>
            <p className="mt-1 font-serif text-3xl font-normal text-foreground">${gig.budget.toLocaleString()}</p>
            {gig.ethAmount && (
              <p className="mt-1 text-sm text-muted-foreground">
                Equivalent to <span className="font-medium">Ξ {gig.ethAmount} ETH</span> at current rates
              </p>
            )}
          </div>

          <div className="mb-6 rounded-lg bg-secondary/50 p-3">
            <p className="text-xs text-muted-foreground">
              Your payment will be held in escrow until the freelancer delivers the work and it passes AI review.
            </p>
          </div>

          {error && (
            <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <Button
            className="w-full rounded-full"
            size="lg"
            onClick={handlePay}
            disabled={paying}
          >
            {paying ? "Processing…" : `Pay $${gig.budget.toLocaleString()}`}
          </Button>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            By paying, you agree to the escrow terms. Funds are released when work is accepted.
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link href={`/gig/${id}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Cancel and go back
          </Link>
        </div>
      </div>
    </main>
  )
}
