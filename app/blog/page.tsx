import Link from "next/link"
import { Header } from "@/components/header"

const POSTS = [
  {
    slug: "why-escrow-is-broken",
    title: "Why Traditional Freelance Escrow Is Broken — And What Comes Next",
    date: "March 8, 2026",
    excerpt: "Most escrow solutions rely on centralized arbiters who charge 3–8% and take days to resolve disputes. Smart contracts change the game — but only if the verification layer is airtight.",
  },
  {
    slug: "ai-verified-deliverables",
    title: "AI-Verified Deliverables: The End of \"It Doesn't Match the Brief\"",
    date: "February 21, 2026",
    excerpt: "The biggest source of freelance disputes isn't fraud — it's ambiguity. We look at how LLM-based contract parsing is closing that gap automatically at delivery time.",
  },
  {
    slug: "zero-platform-fees",
    title: "Zero Platform Fees: Sustainable Model or Marketing Stunt?",
    date: "February 5, 2026",
    excerpt: "Fiverr takes 20%. Upwork takes 10–20%. Lockstep takes 0%. Here's how the economics work when escrow float replaces fee extraction as the business model.",
  },
  {
    slug: "trustless-freelancing-future",
    title: "Trustless Freelancing and the Future of Independent Work",
    date: "January 18, 2026",
    excerpt: "48 million Americans freelanced in 2025. The infrastructure supporting them — payments, contracts, reputation — is still stuck in 2010. It doesn't have to be.",
  },
]

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-12">
          <h1 className="font-serif text-4xl font-normal text-foreground">Blog</h1>
          <p className="mt-2 text-base text-muted-foreground">Thinking on trustless work, escrow, and the future of freelancing.</p>
        </div>

        <div className="flex flex-col gap-6">
          {POSTS.map((post) => (
            <article key={post.slug} className="group rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
              <p className="mb-2 text-xs text-muted-foreground">{post.date}</p>
              <h2 className="font-serif text-xl font-normal text-foreground group-hover:text-primary transition-colors">
                {post.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-2">{post.excerpt}</p>
              <div className="mt-4">
                <span className="text-sm font-medium text-primary">
                  Read more →
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  )
}
