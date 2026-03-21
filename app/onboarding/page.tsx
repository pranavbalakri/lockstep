"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { usePrivy } from "@privy-io/react-auth"
import { Button } from "@/components/ui/button"

export default function OnboardingPage() {
  const { user } = usePrivy()
  const [role, setRole] = useState<"freelancer" | "client">("freelancer")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    setError("")

    const email = user.email?.address ?? (user.google as { email?: string } | null)?.email
    const name = (user.google as { name?: string } | null)?.name ?? email?.split("@")[0] ?? "User"

    try {
      const res = await fetch("/api/auth/privy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privyUserId: user.id, email, name, role }),
      })
      const data = await res.json()
      if (data.ok) {
        router.push("/dashboard")
        router.refresh()
      } else {
        setError(data.error ?? "Something went wrong")
      }
    } catch {
      setError("Something went wrong")
    }
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl font-normal text-foreground">Welcome to Giggle</h1>
          <p className="mt-2 text-sm text-muted-foreground">One last thing — how will you use Giggle?</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">I am a…</label>
              <div className="flex rounded-lg border bg-secondary p-1">
                {(["freelancer", "client"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                      role === r
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r === "freelancer" ? "Freelancer" : "Client"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {role === "freelancer"
                  ? "Post gigs, accept jobs, and get paid trustlessly."
                  : "Hire talent and lock funds in escrow until work is delivered."}
              </p>
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" size="lg" className="rounded-full" disabled={loading}>
              {loading ? "Setting up your account…" : "Get started"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
