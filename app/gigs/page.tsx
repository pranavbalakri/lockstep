"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { RoleCard } from "@/components/role-card"
import { Button } from "@/components/ui/button"
import { getInitials, getAvatarColor } from "@/lib/avatar"

const CATEGORIES = ["Development", "Design", "Writing", "Marketing", "Data", "Blockchain"]
const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "highest_budget", label: "Highest budget" },
  { value: "most_requested", label: "Most requested" },
  { value: "deadline_soonest", label: "Deadline soonest" },
]

interface Gig {
  id: string
  title: string
  budget: number
  category: string
  status: string
  requestCount: number
  freelancer: { id: string; name: string }
}

import { Suspense } from "react"

function GigsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [gigs, setGigs] = useState<Gig[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)

  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [minBudget, setMinBudget] = useState("")
  const [maxBudget, setMaxBudget] = useState("")
  const [skill, setSkill] = useState(() => searchParams.get("q") ?? "")
  const [sort, setSort] = useState("newest")

  const fetchGigs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set("page", String(page))
    params.set("limit", "12")
    params.set("sort", sort)
    if (selectedCategories.length === 1) params.set("category", selectedCategories[0])
    if (minBudget) params.set("minBudget", minBudget)
    if (maxBudget) params.set("maxBudget", maxBudget)
    if (skill) params.set("skill", skill)

    const res = await fetch(`/api/gigs?${params}`)
    if (res.ok) {
      const data = await res.json()
      setGigs(data.gigs)
      setTotal(data.total)
      setPages(data.pages)
    }
    setLoading(false)
  }, [page, sort, selectedCategories, minBudget, maxBudget, skill])

  useEffect(() => { fetchGigs() }, [fetchGigs])

  function toggleCategory(cat: string) {
    setPage(1)
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  function clearFilters() {
    setSelectedCategories([])
    setMinBudget("")
    setMaxBudget("")
    setSkill("")
    setSort("newest")
    setPage(1)
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-normal text-foreground">Find work</h1>
            <p className="mt-1 text-sm text-muted-foreground">{total} gig{total !== 1 ? "s" : ""} available</p>
          </div>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1) }}
            className="h-9 rounded-full border bg-card px-4 text-sm text-foreground outline-none focus:border-primary"
          >
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-6 flex flex-col gap-6">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">Category</h3>
                  {(selectedCategories.length > 0 || minBudget || maxBudget || skill) && (
                    <button onClick={clearFilters} className="text-xs text-primary hover:text-primary/80">
                      Clear all
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {CATEGORIES.map((cat) => (
                    <label key={cat} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat)}
                        onChange={() => toggleCategory(cat)}
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                      <span className="text-sm text-foreground">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-medium text-foreground">Budget range</h3>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 flex-1 items-center rounded-lg border bg-background px-2 focus-within:border-primary">
                    <span className="text-xs text-muted-foreground">$</span>
                    <input
                      type="number"
                      placeholder="Min"
                      value={minBudget}
                      onChange={(e) => { setMinBudget(e.target.value); setPage(1) }}
                      className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">–</span>
                  <div className="flex h-9 flex-1 items-center rounded-lg border bg-background px-2 focus-within:border-primary">
                    <span className="text-xs text-muted-foreground">$</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={maxBudget}
                      onChange={(e) => { setMaxBudget(e.target.value); setPage(1) }}
                      className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-medium text-foreground">Skills</h3>
                <input
                  type="text"
                  placeholder="Search by skill…"
                  value={skill}
                  onChange={(e) => { setSkill(e.target.value); setPage(1) }}
                  className="h-9 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
                />
              </div>
            </div>
          </aside>

          {/* Main */}
          <div className="min-w-0 flex-1">
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-36 animate-pulse rounded-xl border bg-card" />
                ))}
              </div>
            ) : gigs.length === 0 ? (
              <div className="rounded-xl border bg-card py-20 text-center">
                <p className="text-muted-foreground">No gigs match your filters.</p>
                <button onClick={clearFilters} className="mt-3 text-sm font-medium text-primary hover:text-primary/80">
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {gigs.map((gig) => (
                    <RoleCard
                      key={gig.id}
                      id={gig.id}
                      title={gig.title}
                      rate={`$${gig.budget.toLocaleString()}`}
                      hiredCount={gig.requestCount}
                      avatars={[
                        { initials: getInitials(gig.freelancer.name), color: getAvatarColor(gig.freelancer.id) },
                      ]}
                    />
                  ))}
                </div>

                {pages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      disabled={page >= pages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

export default function GigsPage() {
  return (
    <Suspense>
      <GigsContent />
    </Suspense>
  )
}
