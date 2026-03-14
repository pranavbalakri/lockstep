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

  const clientWallet = "0xB1Ea11ff06A187bE5811c5eCF4cE25eaEF156ae8"
  const freelancerWallet = "0x266324a33E995D20Ac99CdB8a5CcdD476bBC4Be5"

  const alex = await prisma.user.create({
    data: { name: "Alex Chen", email: "alex@lockstep.dev", password, role: "client", walletAddress: clientWallet },
  })
  const jordan = await prisma.user.create({
    data: { name: "Jordan Kim", email: "jordan@lockstep.dev", password, role: "freelancer", walletAddress: freelancerWallet },
  })
  const sam = await prisma.user.create({
    data: { name: "Sam Patel", email: "sam@lockstep.dev", password, role: "freelancer", walletAddress: freelancerWallet },
  })

  // Freelancers post their service gigs
  // jordan posts 6 gigs, sam posts 6 gigs
  const gigs = await Promise.all([
    prisma.gig.create({
      data: {
        freelancerId: jordan.id,
        title: "React Dashboard Development",
        category: "Development",
        description: "I build production-ready React admin dashboards for SaaS companies. With 4+ years and 15+ dashboards shipped, I specialize in real-time data visualization, user management, and analytics. I integrate with any REST API and handle large datasets efficiently using virtualization and pagination.",
        budget: 2500,
        deadline: new Date("2026-04-15"),
        skills: JSON.stringify(["React", "TypeScript", "Tailwind CSS", "REST API"]),
        deliverables: "Fully functional admin dashboard with at least 5 views: overview, users, analytics, settings, and reports. All components documented.",
        status: "open",
      },
    }),
    prisma.gig.create({
      data: {
        freelancerId: jordan.id,
        title: "Fintech Brand Identity Design",
        category: "Design",
        description: "I craft modern, trustworthy brand identities for fintech companies. 6 years of experience working with payment startups and financial platforms. I explore both wordmark and icon-based options and deliver concepts that balance approachability with credibility.",
        budget: 800,
        deadline: new Date("2026-03-30"),
        skills: JSON.stringify(["Logo Design", "Brand Identity", "Figma", "Illustrator"]),
        deliverables: "3 initial concepts, 2 rounds of revisions, final files in SVG, PNG, and PDF. Brand guidelines document.",
        status: "open",
      },
    }),
    prisma.gig.create({
      data: {
        freelancerId: jordan.id,
        title: "API Documentation Writing",
        category: "Writing",
        description: "I write comprehensive, developer-friendly API documentation that engineers actually want to read. 5 years of experience documenting REST APIs — my docs are structured around developer jobs-to-be-done with real working examples.",
        budget: 1200,
        deadline: new Date("2026-04-10"),
        skills: JSON.stringify(["Technical Writing", "REST API", "OpenAPI", "Markdown"]),
        deliverables: "Complete API reference docs, getting started guide, 5 code examples in JavaScript and Python, and a Postman collection.",
        status: "in_progress",
      },
    }),
    prisma.gig.create({
      data: {
        freelancerId: jordan.id,
        title: "Airflow Data Pipeline Engineering",
        category: "Data",
        description: "I build production-grade Apache Airflow data pipelines. 4 years experience, pipelines handling 10M+ records/day. I design idempotent DAGs with proper retry logic, dead-letter queues, and Slack alerting. All pipelines come with runbooks.",
        budget: 4500,
        deadline: new Date("2026-04-20"),
        skills: JSON.stringify(["Python", "Apache Airflow", "SQL", "ETL", "Data Engineering"]),
        deliverables: "Production-ready Airflow DAGs with proper error handling, monitoring, and alerting. Documentation and runbooks.",
        status: "open",
      },
    }),
    prisma.gig.create({
      data: {
        freelancerId: jordan.id,
        title: "B2B SaaS Marketing Strategy",
        category: "Marketing",
        description: "I create 6-month go-to-market plans for B2B SaaS companies targeting SMBs. I map the full funnel across paid, organic, and partnership channels, with realistic budget allocations and monthly execution plans you can actually follow.",
        budget: 3500,
        deadline: new Date("2026-04-18"),
        skills: JSON.stringify(["B2B Marketing", "SaaS", "Growth", "GTM Strategy"]),
        deliverables: "6-month marketing roadmap, channel breakdown, budget allocation, KPIs, and first-month execution plan.",
        status: "open",
      },
    }),
    prisma.gig.create({
      data: {
        freelancerId: jordan.id,
        title: "Figma to Next.js Implementation",
        category: "Development",
        description: "I convert Figma designs into pixel-perfect Next.js applications using Tailwind CSS. I live in both tools and deliver faithful, responsive implementations. Clean component structure, accessible markup, deployed to Vercel.",
        budget: 1800,
        deadline: new Date("2026-04-05"),
        skills: JSON.stringify(["Next.js", "React", "Tailwind CSS", "Figma"]),
        deliverables: "All screens implemented, responsive on mobile and desktop, deployed to Vercel.",
        status: "open",
      },
    }),
    prisma.gig.create({
      data: {
        freelancerId: sam.id,
        title: "Smart Contract Security Audit",
        category: "Blockchain",
        description: "I perform thorough security audits of Solidity smart contracts before mainnet deployment. Certified auditor with a track record of catching critical reentrancy, overflow, and access-control bugs. I combine static analysis, manual review, and fuzzing for complete coverage.",
        budget: 5000,
        deadline: new Date("2026-04-01"),
        skills: JSON.stringify(["Solidity", "Security Auditing", "EVM", "DeFi"]),
        deliverables: "Full audit report with severity ratings, proof-of-concept exploits for any vulnerabilities found, and remediation recommendations.",
        status: "open",
      },
    }),
    prisma.gig.create({
      data: {
        freelancerId: sam.id,
        title: "iOS Bug Fix & Stabilization",
        category: "Development",
        description: "I diagnose and fix iOS bugs — crashes, memory leaks, and UI issues. 7 years Swift experience. My process: reproduce first, document root cause, fix, write regression tests. I don't just patch symptoms.",
        budget: 3000,
        deadline: new Date("2026-03-25"),
        skills: JSON.stringify(["Swift", "iOS", "Xcode", "UIKit"]),
        deliverables: "All reported issues resolved, regression tests added, and a root-cause report for each fix.",
        status: "open",
      },
    }),
    prisma.gig.create({
      data: {
        freelancerId: sam.id,
        title: "SEO Content — 10 SaaS Articles",
        category: "Writing",
        description: "I write long-form SEO content for SaaS companies. Each article is 1,500–2,000 words, keyword-targeted, well-researched, and structured for both readers and search engines. No fluff, no AI filler.",
        budget: 600,
        deadline: new Date("2026-04-12"),
        skills: JSON.stringify(["SEO", "Content Writing", "SaaS", "Keyword Research"]),
        deliverables: "10 published-ready articles in Google Docs with meta descriptions, suggested internal links, and image alt text.",
        status: "open",
      },
    }),
    prisma.gig.create({
      data: {
        freelancerId: sam.id,
        title: "ML Churn Prediction Model",
        category: "Data",
        description: "I build production-ready churn prediction models from historical subscription data. I can identify at-risk users 30 days in advance with ≥80% precision. Deliverable includes a trained model, feature importance report, and a live API endpoint.",
        budget: 6000,
        deadline: new Date("2026-05-01"),
        skills: JSON.stringify(["Python", "Machine Learning", "scikit-learn", "Data Analysis"]),
        deliverables: "Trained model with ≥80% precision, feature importance report, API endpoint for real-time predictions, and documentation.",
        status: "open",
      },
    }),
    prisma.gig.create({
      data: {
        freelancerId: sam.id,
        title: "Brand Identity System",
        category: "Design",
        description: "I design complete brand identity systems for B2C apps. Logo, color palette, typography, icon set, and a full Figma component library — everything you need to build consistently at scale.",
        budget: 4200,
        deadline: new Date("2026-04-25"),
        skills: JSON.stringify(["Brand Design", "Figma", "Design Systems", "Illustration"]),
        deliverables: "Brand guidelines PDF, Figma component library, logo package (all formats), icon set (48 icons), and 3 application examples.",
        status: "open",
      },
    }),
    prisma.gig.create({
      data: {
        freelancerId: sam.id,
        title: "HubSpot Email Automation Setup",
        category: "Marketing",
        description: "I set up complete email marketing automation systems in HubSpot. Onboarding sequences, re-engagement campaigns, newsletter templates — all with A/B test variants and analytics configured from day one.",
        budget: 1400,
        deadline: new Date("2026-04-08"),
        skills: JSON.stringify(["HubSpot", "Email Marketing", "Marketing Automation", "Copywriting"]),
        deliverables: "All email sequences live in HubSpot with A/B test variants, analytics dashboard configured, and copywriting for all emails.",
        status: "open",
      },
    }),
  ])

  // Alex (client) sends hire requests to freelancers' gigs
  await prisma.request.create({
    data: {
      gigId: gigs[0].id,
      clientId: alex.id,
      proposal: "We're building an internal ops dashboard for our 50-person team. Need 5 views: team overview, project tracker, analytics, user management, and settings. We have a well-documented REST API ready. Timeline and budget work for us.",
      proposedTimeline: "3 weeks",
      status: "pending",
    },
  })
  await prisma.request.create({
    data: {
      gigId: gigs[1].id,
      clientId: alex.id,
      proposal: "We're launching a B2B payments platform and need a logo that feels both trustworthy and modern. We have a rough brand direction (navy + gold) but are open to your exploration. Budget approved.",
      proposedTimeline: "10 days",
      status: "pending",
    },
  })
  await prisma.request.create({
    data: {
      gigId: gigs[2].id,
      clientId: alex.id,
      proposal: "Our REST API has 40+ endpoints and the docs haven't been updated in 8 months. We need the full reference + getting started guide + Postman collection. Codebase access can be provided.",
      proposedTimeline: "2 weeks",
      status: "accepted",
    },
  })
  await prisma.request.create({
    data: {
      gigId: gigs[6].id,
      clientId: alex.id,
      proposal: "We're deploying an ERC-20 token + staking contract to mainnet next month. Need a full audit before we go live. Happy to share the repo privately. Budget and timeline work.",
      proposedTimeline: "7 days",
      status: "pending",
    },
  })
  await prisma.request.create({
    data: {
      gigId: gigs[7].id,
      clientId: alex.id,
      proposal: "Our iOS app has 3 crash bugs (filed in Linear with reproduction steps) and 5 UI issues. We need all 8 fixed with regression tests. Can share TestFlight access and our codebase.",
      proposedTimeline: "5 days",
      status: "pending",
    },
  })
  await prisma.request.create({
    data: {
      gigId: gigs[9].id,
      clientId: alex.id,
      proposal: "We have 2 years of subscription data (anonymized) and want to identify churn risk 30 days out. We can provide CSV exports and a sandbox DB. The API endpoint should integrate with our existing Node backend.",
      proposedTimeline: "3 weeks",
      status: "pending",
    },
  })
  await prisma.request.create({
    data: {
      gigId: gigs[5].id,
      clientId: alex.id,
      proposal: "We have 12 Figma screens fully designed and approved. Need pixel-perfect implementation in Next.js with Tailwind. Designs are clean — no edge cases or complex animations. Vercel deploy at the end.",
      proposedTimeline: "12 days",
      status: "pending",
    },
  })

  console.log("✓ Seed complete")
  console.log("  Users: alex@lockstep.dev, jordan@lockstep.dev, sam@lockstep.dev (all pw: password123)")
  console.log(`  Gigs: ${gigs.length} created`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
