"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"

function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") ?? "/dashboard"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Login failed")
      } else {
        router.push(redirect)
        router.refresh()
      }
    } catch {
      setError("Something went wrong")
    }
    setLoading(false)
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-10 rounded-lg border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-10 rounded-lg border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}
        <Button type="submit" size="lg" className="rounded-full" disabled={loading}>
          {loading ? "Logging in…" : "Log in"}
        </Button>
      </form>
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="font-serif text-3xl font-normal text-foreground">Welcome back</h1>
            <p className="mt-2 text-sm text-muted-foreground">Log in to your Giggle account</p>
          </div>
          <Suspense fallback={<div className="h-48 animate-pulse rounded-xl border bg-card" />}>
            <LoginForm />
          </Suspense>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-primary hover:text-primary/80">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
