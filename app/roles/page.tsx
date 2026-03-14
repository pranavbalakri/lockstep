import Link from "next/link"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"

export default function RolesPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-14 text-center">
          <h1 className="font-serif text-4xl font-normal text-foreground sm:text-5xl">
            Built for both sides of the contract
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            Whether you&apos;re looking for top-tier talent or your next project, Lockstep is designed to make every engagement trustless and fair.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Freelancers */}
          <div className="rounded-xl border bg-card p-8 shadow-sm">
            <div className="mb-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              For Freelancers
            </div>
            <h2 className="mt-4 font-serif text-2xl font-normal text-foreground">Get paid. No exceptions.</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Stop worrying about clients disappearing after delivery. Lockstep holds funds in escrow before work begins — you submit, AI verifies, funds release.
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {[
                "Browse open gigs across 6 categories",
                "Submit proposals in minutes",
                "Funds escrowed before you start",
                "AI-verified delivery — no disputes",
                "0% platform fee on your earnings",
                "Build a verified track record on-chain",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-0.5 text-primary">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-8 rounded-full px-6">
              <Link href="/gigs">Browse open gigs</Link>
            </Button>
          </div>

          {/* Clients */}
          <div className="rounded-xl border bg-card p-8 shadow-sm">
            <div className="mb-2 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              For Clients
            </div>
            <h2 className="mt-4 font-serif text-2xl font-normal text-foreground">Hire with confidence.</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Post a job, receive proposals from vetted freelancers, and only pay when deliverables match what you asked for. No back-and-forth. No ambiguity.
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {[
                "Post a job in under 5 minutes",
                "Receive proposals from global talent",
                "Escrow held securely until delivery",
                "AI evaluates deliverables vs. spec",
                "Instant release — or raise a dispute",
                "0% platform fees, always",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-0.5 text-primary">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" className="mt-8 rounded-full px-6">
              <Link href="/post">Post a job</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
