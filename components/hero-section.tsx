import Link from "next/link"
import { Button } from "@/components/ui/button"

export function HeroSection() {
  return (
    <section className="px-6 pb-20 pt-16">
      <div className="mx-auto max-w-4xl text-center">
        {/* Stats Pill */}
        <div className="mb-12 inline-flex items-center rounded-full border bg-background px-6 py-3 shadow-sm">
          <div className="flex items-center gap-2 pr-6">
            <span className="text-sm text-muted-foreground">Escrowed</span>
            <span className="text-sm font-semibold text-foreground">$4.2M</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2 px-6">
            <span className="text-sm text-muted-foreground">Jobs completed</span>
            <span className="text-sm font-semibold text-foreground">12.4k</span>
          </div>
          <div className="hidden h-4 w-px bg-border sm:block" />
          <div className="hidden items-center gap-2 pl-6 sm:flex">
            <span className="text-sm text-muted-foreground">Platform fees</span>
            <span className="text-sm font-semibold text-foreground">0%</span>
          </div>
        </div>

        {/* Headline */}
        <h1 className="mb-5 font-serif text-5xl font-normal tracking-tight text-foreground sm:text-6xl text-balance">
          Trustless freelance payments
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mb-10 max-w-md text-base leading-relaxed text-muted-foreground">
          AI-verified deliverables. Instant escrow release.
          <br />
          No middleman. No trust required.
        </p>

        {/* CTAs */}
        <div className="flex items-center justify-center gap-3">
          <Button asChild size="lg" className="rounded-full px-7">
            <Link href="/gigs">Find work</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full px-7">
            <Link href="/post">Post a job</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
