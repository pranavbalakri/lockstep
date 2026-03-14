"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RoleCard } from "@/components/role-card"
import { getInitials, getAvatarColor } from "@/lib/avatar"

const CATEGORIES = ["All", "Development", "Design", "Writing", "Marketing", "Data", "Blockchain"]
const PAGE_SIZE = 8

interface Gig {
  id: string
  title: string
  budget: number
  category: string
  status: string
  requestCount: number
  client: { id: string; name: string }
  createdAt: string
}

export function RolesSection() {
  const [activeCategory, setActiveCategory] = useState("All")
  const [page, setPage] = useState(1)
  const [gigs, setGigs] = useState<Gig[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const fetchGigs = useCallback(async (category: string, p: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) })
      if (category !== "All") params.set("category", category)
      const res = await fetch(`/api/gigs?${params}`)
      if (res.ok) {
        const data = await res.json()
        setGigs(data.gigs)
        setTotalPages(data.pages)
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchGigs(activeCategory, page)
  }, [activeCategory, page, fetchGigs])

  function handleCategory(cat: string) {
    setActiveCategory(cat)
    setPage(1)
  }

  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-7xl">
        {/* Category Filter */}
        <div className="mb-8 flex flex-wrap items-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategory(cat)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-serif text-xl font-medium">Freelance Offerings</h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-xl border bg-card" />
            ))}
          </div>
        ) : gigs.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            No gigs in this category yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        )}
      </div>
    </section>
  )
}
