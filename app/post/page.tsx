"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"

const CATEGORIES = ["Development", "Design", "Writing", "Marketing", "Data", "Blockchain"]

export default function PostPage() {
  const [user, setUser] = useState<{ role: string } | null>(null)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("Development")
  const [description, setDescription] = useState("")
  const [budget, setBudget] = useState("")
  const [deadline, setDeadline] = useState("")
  const [deliverables, setDeliverables] = useState("")
  const [ethAmount, setEthAmount] = useState("")
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.user) { router.push("/login?redirect=/post"); return }
        if (d.user.role !== "freelancer") { router.push("/dashboard"); return }
        setUser(d.user)
      })
  }, [router])

  function addSkill(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      const val = skillInput.trim()
      if (val && !skills.includes(val)) setSkills([...skills, val])
      setSkillInput("")
    }
  }

  function removeSkill(s: string) {
    setSkills(skills.filter((x) => x !== s))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/gigs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, category, description, budget, deadline, skills, deliverables, ethAmount: ethAmount || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Failed to post job")
      } else {
        router.push(`/gig/${data.gig.id}`)
      }
    } catch {
      setError("Something went wrong")
    }
    setLoading(false)
  }

  if (!user) return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-48 animate-pulse rounded bg-secondary" />
      </div>
    </main>
  )

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-normal text-foreground">Post a gig</h1>
          <p className="mt-1 text-sm text-muted-foreground">Describe your service offering and start receiving hire requests.</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Gig title</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. I'll build a React dashboard for your SaaS"
                className="h-10 rounded-lg border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 rounded-lg border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Description</label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the project, context, and any important details…"
                rows={5}
                className="rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Budget</label>
                <div className="flex h-10 items-center rounded-lg border bg-background px-3 gap-1 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-colors">
                  <span className="text-sm text-muted-foreground">$</span>
                  <input
                    type="number"
                    required
                    min="1"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="2500"
                    className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Deadline</label>
                <input
                  type="date"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="h-10 rounded-lg border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Required skills</label>
              <div className="rounded-lg border bg-background px-3 py-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-colors">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {skills.map((s) => (
                    <span key={s} className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {s}
                      <button type="button" onClick={() => removeSkill(s)}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={addSkill}
                  placeholder="Type a skill and press Enter…"
                  className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Required ETH deposit <span className="font-normal text-muted-foreground">(optional)</span></label>
              <div className="flex h-10 items-center rounded-lg border bg-background px-3 gap-1 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-colors">
                <span className="text-sm text-muted-foreground">Ξ</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={ethAmount}
                  onChange={(e) => setEthAmount(e.target.value)}
                  placeholder="0.05"
                  className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
              <p className="text-xs text-muted-foreground">If set, the client must deposit this amount into an escrow contract when you accept their hire request. The AI reviews delivery and releases funds.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Deliverables</label>
              <textarea
                required
                value={deliverables}
                onChange={(e) => setDeliverables(e.target.value)}
                placeholder="Describe exactly what you expect to receive at the end of this project…"
                rows={3}
                className="rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" size="lg" className="rounded-full px-8" disabled={loading}>
                {loading ? "Posting…" : "Post Gig"}
              </Button>
              <Button asChild variant="ghost" size="lg" className="rounded-full">
                <Link href="/">Cancel</Link>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
