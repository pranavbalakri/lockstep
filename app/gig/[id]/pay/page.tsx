"use client"

import { useState, useEffect, use, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface GigData {
  id: string
  title: string
  budget: number
  ethAmount?: number | null
  contractAddress?: string | null
  status: string
  requests: {
    id: string
    clientId: string
    status: string
    ethAmount?: number | null
    paymentStatus?: string | null
  }[]
}

type PaymentState = "idle" | "opening" | "processing" | "success" | "error"

export default function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [gig, setGig] = useState<GigData | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentState, setPaymentState] = useState<PaymentState>("idle")
  const [error, setError] = useState("")
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

  const myRequest = gig?.requests.find(r => r.clientId === userId && r.status === "accepted")

  const pollPaymentStatus = useCallback(async (requestId: string, maxAttempts = 60): Promise<{ success: boolean; ethAmount?: number; error?: string }> => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await fetch(`/api/requests/${requestId}/payment-status`)
        if (!res.ok) {
          await new Promise(r => setTimeout(r, 3000))
          continue
        }
        const data = await res.json()

        if (data.paymentStatus === "funded") {
          return { success: true, ethAmount: data.ethAmount }
        }
        if (data.paymentStatus === "failed") {
          return { success: false, error: data.failureReason || "Payment failed" }
        }
        if (data.paymentStatus === "deposit_failed" || data.paymentStatus === "requires_manual_review") {
          return { success: false, error: "Payment received but deposit pending. Please contact support." }
        }
      } catch {
        // Ignore fetch errors, keep polling
      }
      await new Promise(r => setTimeout(r, 3000)) // 3s interval
    }
    return { success: false, error: "Timeout waiting for payment confirmation" }
  }, [])

  async function handlePay() {
    if (!myRequest) return
    setError("")
    setPaymentState("opening")

    try {
      // Get payment session
      const res = await fetch(`/api/gigs/${id}/payment-session`, { method: "POST" })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Failed to start payment")
        setPaymentState("error")
        return
      }

      // Dev mode: direct deposit without MoonPay
      if (data.mode === "dev") {
        setPaymentState("processing")
        const payRes = await fetch(`/api/gigs/${id}/pay`, { method: "POST" })
        const payData = await payRes.json()

        if (payRes.ok) {
          setPaymentState("success")
        } else {
          setError(payData.error || "Payment failed")
          setPaymentState("error")
        }
        return
      }

      // Production: MoonPay widget
      const moonpayWindow = window.open(data.widgetUrl, "MoonPay", "width=500,height=700")

      setPaymentState("processing")

      // Start polling for payment status
      const result = await pollPaymentStatus(myRequest.id)

      // Close MoonPay window if still open
      if (moonpayWindow && !moonpayWindow.closed) {
        moonpayWindow.close()
      }

      if (result.success) {
        setPaymentState("success")
      } else {
        setError(result.error || "Payment failed")
        setPaymentState("error")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed")
      setPaymentState("error")
    }
  }

  function handleRetry() {
    setPaymentState("idle")
    setError("")
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

  const alreadyPaid = !!myRequest?.ethAmount

  if (alreadyPaid || paymentState === "success") {
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

  if (paymentState === "processing") {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-md px-6 py-12">
          <div className="rounded-xl border bg-card p-6 text-center shadow-sm">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
            <h1 className="font-serif text-xl font-medium text-foreground mb-2">Processing Payment</h1>
            <p className="text-sm text-muted-foreground mb-4">
              Complete your purchase in the MoonPay window. This page will update automatically when your payment is confirmed.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <div className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
              Waiting for confirmation...
            </div>
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
                Equivalent to <span className="font-medium">Ξ {gig.ethAmount.toFixed(4)} ETH</span> at current rates
              </p>
            )}
          </div>

          <div className="mb-6 rounded-lg bg-secondary/50 p-3">
            <p className="text-xs text-muted-foreground">
              Your payment will be held in escrow until the freelancer delivers the work and it passes AI review.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2">
              <p className="text-sm text-destructive">{error}</p>
              {paymentState === "error" && (
                <button
                  onClick={handleRetry}
                  className="mt-1 text-xs text-destructive underline hover:no-underline"
                >
                  Try again
                </button>
              )}
            </div>
          )}

          <Button
            className="w-full rounded-full"
            size="lg"
            onClick={handlePay}
            disabled={paymentState === "opening" || paymentState === "processing"}
          >
            {paymentState === "opening" || paymentState === "processing" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay $${gig.budget.toLocaleString()}`
            )}
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
