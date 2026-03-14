import "dotenv/config"
import { PrismaClient } from "../lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  await prisma.submission.deleteMany()
  await prisma.request.deleteMany()
  await prisma.gig.deleteMany()
  await prisma.user.deleteMany()

  const password = await bcrypt.hash("password123", 10)

  const wallets = {
    alex: "0xB1Ea11ff06A187bE5811c5eCF4cE25eaEF156ae8",
    maya: "0x0cF51aAE25728A1D4b0A811D7Afa3b12B7A0f1D1",
    riley: "0xD59cA4d95eb0B3C55a1b0A5A5631973F9ca81221",
    jordan: "0x266324a33E995D20Ac99CdB8a5CcdD476bBC4Be5",
    sam: "0x9f2aDfc32F35c36A6D6b24Bb9C6fA9b5f0e42A10",
    taylor: "0x8A1CE3c3A419EeD9b4d4F4C5aF2Ac91B8711e111",
    casey: "0x91C0ffB5734A0A44AE1d0b4c4dc5488ef5591111",
  }

  async function createUser(name: string, email: string, role: "client" | "freelancer", walletAddress: string) {
    return prisma.user.create({
      data: { name, email, password, role, walletAddress },
    })
  }

  const [alex, maya, riley, jordan, sam, taylor, casey] = await Promise.all([
    createUser("Alex Chen", "alex@lockstep.dev", "client", wallets.alex),
    createUser("Maya Brooks", "maya@lockstep.dev", "client", wallets.maya),
    createUser("Riley Gomez", "riley@lockstep.dev", "client", wallets.riley),
    createUser("Jordan Kim", "jordan@lockstep.dev", "freelancer", wallets.jordan),
    createUser("Sam Patel", "sam@lockstep.dev", "freelancer", wallets.sam),
    createUser("Taylor Nguyen", "taylor@lockstep.dev", "freelancer", wallets.taylor),
    createUser("Casey Rivera", "casey@lockstep.dev", "freelancer", wallets.casey),
  ])

  const gigDefinitions = [
    {
      freelancerId: jordan.id,
      title: "React Dashboard Development",
      category: "Development",
      description: "I build production-ready React admin dashboards for SaaS companies. With 4+ years and 15+ dashboards shipped, I specialize in real-time data visualization, user management, and analytics. I integrate with any REST API and handle large datasets efficiently using virtualization and pagination.",
      budget: 2500,
      deadline: "2026-04-15",
      skills: ["React", "TypeScript", "Tailwind CSS", "REST API"],
      deliverables: "Fully functional admin dashboard with at least 5 views: overview, users, analytics, settings, and reports. All components documented.",
      status: "open",
    },
    {
      freelancerId: jordan.id,
      title: "Fintech Brand Identity Design",
      category: "Design",
      description: "I craft modern, trustworthy brand identities for fintech companies. 6 years of experience working with payment startups and financial platforms. I explore both wordmark and icon-based options and deliver concepts that balance approachability with credibility.",
      budget: 800,
      deadline: "2026-03-30",
      skills: ["Logo Design", "Brand Identity", "Figma", "Illustrator"],
      deliverables: "3 initial concepts, 2 rounds of revisions, final files in SVG, PNG, and PDF. Brand guidelines document.",
      status: "open",
    },
    {
      freelancerId: jordan.id,
      title: "API Documentation Writing",
      category: "Writing",
      description: "I write comprehensive, developer-friendly API documentation that engineers actually want to read. 5 years of experience documenting REST APIs — my docs are structured around developer jobs-to-be-done with real working examples.",
      budget: 1200,
      deadline: "2026-04-10",
      skills: ["Technical Writing", "REST API", "OpenAPI", "Markdown"],
      deliverables: "Complete API reference docs, getting started guide, 5 code examples in JavaScript and Python, and a Postman collection.",
      status: "in_progress",
    },
    {
      freelancerId: jordan.id,
      title: "Airflow Data Pipeline Engineering",
      category: "Data",
      description: "I build production-grade Apache Airflow data pipelines. 4 years experience, pipelines handling 10M+ records/day. I design idempotent DAGs with proper retry logic, dead-letter queues, and Slack alerting. All pipelines come with runbooks.",
      budget: 4500,
      deadline: "2026-04-20",
      skills: ["Python", "Apache Airflow", "SQL", "ETL", "Data Engineering"],
      deliverables: "Production-ready Airflow DAGs with proper error handling, monitoring, and alerting. Documentation and runbooks.",
      status: "open",
    },
    {
      freelancerId: jordan.id,
      title: "B2B SaaS Marketing Strategy",
      category: "Marketing",
      description: "I create 6-month go-to-market plans for B2B SaaS companies targeting SMBs. I map the full funnel across paid, organic, and partnership channels, with realistic budget allocations and monthly execution plans you can actually follow.",
      budget: 3500,
      deadline: "2026-04-18",
      skills: ["B2B Marketing", "SaaS", "Growth", "GTM Strategy"],
      deliverables: "6-month marketing roadmap, channel breakdown, budget allocation, KPIs, and first-month execution plan.",
      status: "open",
    },
    {
      freelancerId: jordan.id,
      title: "Figma to Next.js Implementation",
      category: "Development",
      description: "I convert Figma designs into pixel-perfect Next.js applications using Tailwind CSS. I live in both tools and deliver faithful, responsive implementations. Clean component structure, accessible markup, deployed to Vercel.",
      budget: 1800,
      deadline: "2026-04-05",
      skills: ["Next.js", "React", "Tailwind CSS", "Figma"],
      deliverables: "All screens implemented, responsive on mobile and desktop, deployed to Vercel.",
      status: "open",
    },
    {
      freelancerId: sam.id,
      title: "Smart Contract Security Audit",
      category: "Blockchain",
      description: "I perform thorough security audits of Solidity smart contracts before mainnet deployment. Certified auditor with a track record of catching critical reentrancy, overflow, and access-control bugs. I combine static analysis, manual review, and fuzzing for complete coverage.",
      budget: 5000,
      deadline: "2026-04-01",
      skills: ["Solidity", "Security Auditing", "EVM", "DeFi"],
      deliverables: "Full audit report with severity ratings, proof-of-concept exploits for any vulnerabilities found, and remediation recommendations.",
      status: "open",
    },
    {
      freelancerId: sam.id,
      title: "iOS Bug Fix & Stabilization",
      category: "Development",
      description: "I diagnose and fix iOS bugs — crashes, memory leaks, and UI issues. 7 years Swift experience. My process: reproduce first, document root cause, fix, write regression tests. I don't just patch symptoms.",
      budget: 3000,
      deadline: "2026-03-25",
      skills: ["Swift", "iOS", "Xcode", "UIKit"],
      deliverables: "All reported issues resolved, regression tests added, and a root-cause report for each fix.",
      status: "open",
    },
    {
      freelancerId: sam.id,
      title: "SEO Content — 10 SaaS Articles",
      category: "Writing",
      description: "I write long-form SEO content for SaaS companies. Each article is 1,500–2,000 words, keyword-targeted, well-researched, and structured for both readers and search engines. No fluff, no AI filler.",
      budget: 600,
      deadline: "2026-04-12",
      skills: ["SEO", "Content Writing", "SaaS", "Keyword Research"],
      deliverables: "10 published-ready articles in Google Docs with meta descriptions, suggested internal links, and image alt text.",
      status: "open",
    },
    {
      freelancerId: sam.id,
      title: "ML Churn Prediction Model",
      category: "Data",
      description: "I build production-ready churn prediction models from historical subscription data. I can identify at-risk users 30 days in advance with ≥80% precision. Deliverable includes a trained model, feature importance report, and a live API endpoint.",
      budget: 6000,
      deadline: "2026-05-01",
      skills: ["Python", "Machine Learning", "scikit-learn", "Data Analysis"],
      deliverables: "Trained model with ≥80% precision, feature importance report, API endpoint for real-time predictions, and documentation.",
      status: "open",
    },
    {
      freelancerId: sam.id,
      title: "Brand Identity System",
      category: "Design",
      description: "I design complete brand identity systems for B2C apps. Logo, color palette, typography, icon set, and a full Figma component library — everything you need to build consistently at scale.",
      budget: 4200,
      deadline: "2026-04-25",
      skills: ["Brand Design", "Figma", "Design Systems", "Illustration"],
      deliverables: "Brand guidelines PDF, Figma component library, logo package (all formats), icon set (48 icons), and 3 application examples.",
      status: "open",
    },
    {
      freelancerId: sam.id,
      title: "HubSpot Email Automation Setup",
      category: "Marketing",
      description: "I set up complete email marketing automation systems in HubSpot. Onboarding sequences, re-engagement campaigns, newsletter templates — all with A/B test variants and analytics configured from day one.",
      budget: 1400,
      deadline: "2026-04-08",
      skills: ["HubSpot", "Email Marketing", "Marketing Automation", "Copywriting"],
      deliverables: "All email sequences live in HubSpot with A/B test variants, analytics dashboard configured, and copywriting for all emails.",
      status: "open",
    },
    {
      freelancerId: taylor.id,
      title: "Shopify Store Performance Optimization",
      category: "Development",
      description: "I optimize Shopify storefronts for speed, conversion, and maintainability. I audit theme code, cut unused JavaScript, improve Core Web Vitals, and document every change for your team.",
      budget: 2200,
      deadline: "2026-04-14",
      skills: ["Shopify", "Liquid", "JavaScript", "Performance"],
      deliverables: "Improved storefront performance, performance audit summary, code changes pushed to repo, and before/after Lighthouse benchmarks.",
      status: "open",
    },
    {
      freelancerId: taylor.id,
      title: "Customer Research Interview Synthesis",
      category: "Research",
      description: "I turn raw customer interviews into actionable product insights. I code transcripts, extract patterns, and package themes into a decision-ready report with quotes and priority recommendations.",
      budget: 1600,
      deadline: "2026-04-11",
      skills: ["User Research", "Interviewing", "Analysis", "Product Strategy"],
      deliverables: "Interview synthesis report, key themes, top pain points, representative quotes, and prioritized recommendations.",
      status: "open",
    },
    {
      freelancerId: taylor.id,
      title: "Lifecycle Email Copywriting",
      category: "Marketing",
      description: "I write full lifecycle email programs for SaaS products, from onboarding through win-back. Expect concise copy, clear CTAs, and testing ideas tied to actual product moments.",
      budget: 950,
      deadline: "2026-04-07",
      skills: ["Email Copywriting", "Lifecycle Marketing", "SaaS", "Retention"],
      deliverables: "Welcome, activation, retention, and win-back email sequences with subject line variants and testing notes.",
      status: "open",
    },
    {
      freelancerId: taylor.id,
      title: "Analytics Instrumentation Plan",
      category: "Data",
      description: "I design product analytics event schemas that help growth and product teams answer real questions. I map events, properties, naming conventions, and QA steps for a clean rollout.",
      budget: 1300,
      deadline: "2026-04-09",
      skills: ["Analytics", "Amplitude", "Mixpanel", "Product Analytics"],
      deliverables: "Event taxonomy, tracking plan spreadsheet, implementation notes, and QA checklist for launch.",
      status: "open",
    },
    {
      freelancerId: casey.id,
      title: "Pitch Deck Narrative & Design Refresh",
      category: "Design",
      description: "I turn dense investor decks into crisp, convincing stories. I tighten the narrative, simplify slides, and give the deck a visual system that still feels founder-led instead of agency-polished.",
      budget: 1900,
      deadline: "2026-04-13",
      skills: ["Pitch Decks", "Storytelling", "Presentation Design", "Figma"],
      deliverables: "Refined deck narrative, redesigned slides, speaker notes for key slides, and export-ready PDF.",
      status: "open",
    },
    {
      freelancerId: casey.id,
      title: "Webflow Marketing Site Build",
      category: "Development",
      description: "I build polished Webflow marketing sites with strong CMS structure and responsive behavior. Ideal for startups that want a site marketing can update without engineering help.",
      budget: 2800,
      deadline: "2026-04-19",
      skills: ["Webflow", "CMS", "Responsive Design", "SEO"],
      deliverables: "Fully built marketing site in Webflow, CMS collections configured, responsive QA, and on-page SEO basics completed.",
      status: "open",
    },
    {
      freelancerId: casey.id,
      title: "Developer Relations Launch Kit",
      category: "Writing",
      description: "I create launch-ready developer relations content for API and infrastructure products. That includes sample announcements, docs updates, and social copy aligned to the product narrative.",
      budget: 1700,
      deadline: "2026-04-16",
      skills: ["Developer Relations", "Launch Strategy", "Technical Writing", "Content"],
      deliverables: "Launch brief, technical announcement post, docs update recommendations, and social copy for launch week.",
      status: "open",
    },
    {
      freelancerId: casey.id,
      title: "Community Growth Playbook",
      category: "Marketing",
      description: "I design community growth systems for early-stage products: programming cadence, ambassador structure, rituals, and moderation workflows that are sustainable for a small team.",
      budget: 1450,
      deadline: "2026-04-22",
      skills: ["Community", "Growth", "Programs", "Operations"],
      deliverables: "90-day community playbook, event calendar, moderator guidelines, and ambassador program outline.",
      status: "open",
    },
  ]

  const gigs = await Promise.all(
    gigDefinitions.map((gig) =>
      prisma.gig.create({
        data: {
          ...gig,
          deadline: new Date(gig.deadline),
          skills: JSON.stringify(gig.skills),
        },
      })
    )
  )

  const requests = [
    {
      gigId: gigs[0].id,
      clientId: alex.id,
      proposal: "We're building an internal ops dashboard for our 50-person team. Need 5 views: team overview, project tracker, analytics, user management, and settings. We have a well-documented REST API ready. Timeline and budget work for us.",
      proposedTimeline: "3 weeks",
      status: "pending",
    },
    {
      gigId: gigs[1].id,
      clientId: alex.id,
      proposal: "We're launching a B2B payments platform and need a logo that feels both trustworthy and modern. We have a rough brand direction (navy + gold) but are open to your exploration. Budget approved.",
      proposedTimeline: "10 days",
      status: "pending",
    },
    {
      gigId: gigs[2].id,
      clientId: alex.id,
      proposal: "Our REST API has 40+ endpoints and the docs haven't been updated in 8 months. We need the full reference + getting started guide + Postman collection. Codebase access can be provided.",
      proposedTimeline: "2 weeks",
      status: "accepted",
    },
    {
      gigId: gigs[6].id,
      clientId: alex.id,
      proposal: "We're deploying an ERC-20 token + staking contract to mainnet next month. Need a full audit before we go live. Happy to share the repo privately. Budget and timeline work.",
      proposedTimeline: "7 days",
      status: "pending",
    },
    {
      gigId: gigs[7].id,
      clientId: alex.id,
      proposal: "Our iOS app has 3 crash bugs (filed in Linear with reproduction steps) and 5 UI issues. We need all 8 fixed with regression tests. Can share TestFlight access and our codebase.",
      proposedTimeline: "5 days",
      status: "pending",
    },
    {
      gigId: gigs[9].id,
      clientId: alex.id,
      proposal: "We have 2 years of subscription data (anonymized) and want to identify churn risk 30 days out. We can provide CSV exports and a sandbox DB. The API endpoint should integrate with our existing Node backend.",
      proposedTimeline: "3 weeks",
      status: "pending",
    },
    {
      gigId: gigs[5].id,
      clientId: alex.id,
      proposal: "We have 12 Figma screens fully designed and approved. Need pixel-perfect implementation in Next.js with Tailwind. Designs are clean — no edge cases or complex animations. Vercel deploy at the end.",
      proposedTimeline: "12 days",
      status: "pending",
    },
    {
      gigId: gigs[12].id,
      clientId: maya.id,
      proposal: "Our Shopify store is sitting at 42 mobile performance score and conversion has dipped. We need a focused optimization pass with clear before-and-after benchmarks and documented changes.",
      proposedTimeline: "9 days",
      status: "pending",
    },
    {
      gigId: gigs[13].id,
      clientId: maya.id,
      proposal: "We just finished 14 customer interviews and need a synthesis that highlights repeat pain points and onboarding opportunities before our next sprint planning.",
      proposedTimeline: "1 week",
      status: "pending",
    },
    {
      gigId: gigs[14].id,
      clientId: maya.id,
      proposal: "We're overhauling our lifecycle email program and need all key journeys rewritten with stronger activation copy. Looking for someone who can structure the full sequence, not just polish language.",
      proposedTimeline: "6 days",
      status: "accepted",
    },
    {
      gigId: gigs[15].id,
      clientId: maya.id,
      proposal: "We're implementing Amplitude from scratch and need a clean event taxonomy across signup, activation, collaboration, and billing. We'd like a rollout plan engineering can follow directly.",
      proposedTimeline: "8 days",
      status: "pending",
    },
    {
      gigId: gigs[16].id,
      clientId: riley.id,
      proposal: "We have a strong product but the fundraising deck still feels like a wall of text. Need a narrative cleanup and visual refresh before partner meetings start next month.",
      proposedTimeline: "10 days",
      status: "pending",
    },
    {
      gigId: gigs[17].id,
      clientId: riley.id,
      proposal: "We need a clean Webflow marketing site for a new product line. Five marketing pages, CMS for case studies, and enough polish that our small team can self-serve edits after launch.",
      proposedTimeline: "2.5 weeks",
      status: "pending",
    },
    {
      gigId: gigs[18].id,
      clientId: riley.id,
      proposal: "We're launching a developer product in May and need the surrounding content package: technical announcement, launch brief, and docs update recommendations that support adoption.",
      proposedTimeline: "11 days",
      status: "pending",
    },
    {
      gigId: gigs[19].id,
      clientId: riley.id,
      proposal: "Our user community is growing faster than our internal processes. Need a 90-day operating playbook with a lightweight ambassador structure and moderation guidance.",
      proposedTimeline: "2 weeks",
      status: "pending",
    },
  ]

  await prisma.request.createMany({ data: requests })

  console.log("✓ Seed complete")
  console.log("  Accounts:")
  console.log("   - Clients: alex@lockstep.dev, maya@lockstep.dev, riley@lockstep.dev")
  console.log("   - Freelancers: jordan@lockstep.dev, sam@lockstep.dev, taylor@lockstep.dev, casey@lockstep.dev")
  console.log("  Password: password123")
  console.log(`  Gigs: ${gigs.length} created`)
  console.log(`  Requests: ${requests.length} created`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
