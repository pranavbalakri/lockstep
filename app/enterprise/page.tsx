"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"

export default function EnterprisePage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [company, setCompany] = useState("")
  const [message, setMessage] = useState("")
  const [sent, setSent] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSent(true)
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="border-b px-6 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <p className="mb-4 inline-block rounded-full border px-4 py-1.5 text-sm text-muted-foreground">Enterprise</p>
          <h1 className="font-serif text-4xl font-normal text-foreground sm:text-5xl text-balance">
            Trustless talent for teams that can&apos;t afford surprises
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
            Custom escrow contracts, SLA-backed delivery verification, dedicated support, and volume pricing. Built for procurement teams, agencies, and tech companies operating at scale.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Custom escrow logic", desc: "Configure milestone-based releases, partial payments, and custom dispute resolution rules." },
              { title: "Verified talent pools", desc: "Build private talent pools with background-checked, pre-screened freelancers." },
              { title: "API integration", desc: "Programmatically post jobs, manage contracts, and trigger payments via REST API." },
              { title: "SSO & team access", desc: "SAML-based SSO, role-based access control, and audit logs for compliance." },
              { title: "Priority support", desc: "Dedicated account manager, 99.9% SLA uptime, and 4-hour response windows." },
              { title: "Volume pricing", desc: "Flat rate contracts for high-volume teams. No per-transaction fees over threshold." },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border bg-card p-6">
                <h3 className="font-medium text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact form */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-lg">
          <h2 className="mb-2 font-serif text-2xl font-normal text-foreground text-center">Get in touch</h2>
          <p className="mb-8 text-center text-sm text-muted-foreground">We&apos;ll reach out within one business day.</p>
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            {sent ? (
              <div className="py-8 text-center">
                <p className="font-medium text-foreground">Message received.</p>
                <p className="mt-1 text-sm text-muted-foreground">We&apos;ll be in touch soon.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-foreground">Name</label>
                    <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Chen"
                      className="h-10 rounded-lg border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-foreground">Company</label>
                    <input required value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Corp"
                      className="h-10 rounded-lg border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Work email</label>
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com"
                    className="h-10 rounded-lg border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">How can we help?</label>
                  <textarea required value={message} onChange={(e) => setMessage(e.target.value)} rows={4}
                    placeholder="Tell us about your team size, use case, and what you're looking to accomplish…"
                    className="rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary resize-none" />
                </div>
                <Button type="submit" size="lg" className="rounded-full">Send message</Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
