"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RoleCard } from "@/components/role-card"

const roles = [
  {
    title: "Build React Dashboard",
    rate: "$2,500",
    hiredCount: 12,
    avatars: [
      { initials: "RG", color: "#6366f1" },
      { initials: "SM", color: "#22c55e" },
      { initials: "M", color: "#f97316" },
    ],
  },
  {
    title: "Logo Design for Fintech Startup",
    rate: "$800",
    hiredCount: 8,
    avatars: [
      { initials: "RG", color: "#6366f1" },
      { initials: "AL", color: "#eab308" },
      { initials: "JK", color: "#3b82f6" },
    ],
  },
  {
    title: "Smart Contract Audit",
    rate: "$5,000",
    hiredCount: 3,
    avatars: [
      { initials: "M", color: "#ec4899" },
      { initials: "TS", color: "#8b5cf6" },
      { initials: "A", color: "#14b8a6" },
    ],
  },
  {
    title: "Technical Writing (API Docs)",
    rate: "$1,200",
    hiredCount: 6,
    avatars: [
      { initials: "P", color: "#f97316" },
      { initials: "GF", color: "#22c55e" },
      { initials: "RK", color: "#ef4444" },
    ],
  },
  {
    title: "iOS App Bug Fixes",
    rate: "$3,000",
    hiredCount: 9,
    avatars: [
      { initials: "RG", color: "#6366f1" },
      { initials: "JL", color: "#a855f7" },
      { initials: "KM", color: "#06b6d4" },
    ],
  },
  {
    title: "Data Pipeline (Python/Airflow)",
    rate: "$4,500",
    hiredCount: 5,
    avatars: [
      { initials: "RG", color: "#6366f1" },
      { initials: "AL", color: "#eab308" },
      { initials: "S", color: "#22c55e" },
    ],
  },
  {
    title: "Figma to Next.js Conversion",
    rate: "$1,800",
    hiredCount: 14,
    avatars: [
      { initials: "MT", color: "#ec4899" },
      { initials: "RG", color: "#6366f1" },
      { initials: "JK", color: "#f97316" },
    ],
  },
  {
    title: "SEO Content (10 Articles)",
    rate: "$600",
    hiredCount: 21,
    avatars: [
      { initials: "RG", color: "#6366f1" },
      { initials: "CF", color: "#22c55e" },
      { initials: "AL", color: "#eab308" },
    ],
  },
]

export function RolesSection() {
  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-7xl">
        {/* Category Filter */}
        <div className="mb-8 flex flex-wrap items-center gap-2">
          {["All", "Development", "Design", "Writing", "Marketing", "Data", "Blockchain"].map((category, i) => (
            <button
              key={category}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                i === 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-serif text-xl font-medium">Freelance Offerings</h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map((role, i) => (
            <RoleCard key={i} {...role} />
          ))}
        </div>
      </div>
    </section>
  )
}
