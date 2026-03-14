"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Search } from "lucide-react"

export function HeroSection() {
  const [query, setQuery] = useState("")
  const router = useRouter()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) router.push(`/gigs?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <section className="px-6 pb-20 pt-16">
      <div className="mx-auto max-w-4xl text-center">
        {/* Headline */}
        <h1 className="mb-5 font-serif text-5xl font-normal tracking-tight text-foreground sm:text-6xl text-balance">
          Trust the work, giggle it
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mb-10 max-w-md text-base leading-relaxed text-muted-foreground">
          Verified work. Locked payments. Zero risk.
        </p>

        {/* Search */}
        <form onSubmit={handleSearch} className="mx-auto flex max-w-lg items-center gap-2 rounded-full border bg-card px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-ring">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for work…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </form>
      </div>
    </section>
  )
}
