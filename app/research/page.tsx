import { Header } from "@/components/header"

export default function ResearchPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <p className="mb-4 inline-block rounded-full border px-4 py-1.5 text-sm text-muted-foreground">Coming soon</p>
        <h1 className="font-serif text-4xl font-normal text-foreground sm:text-5xl">Research &amp; insights</h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
          Data, analysis, and thinking on the future of trustless work — freelance economics, smart contract escrow, and AI-verified delivery.
        </p>
      </div>
    </main>
  )
}
