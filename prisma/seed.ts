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

  const alex = await prisma.user.create({
    data: { name: "Alex Chen", email: "alex@lockstep.dev", password, role: "client" },
  })
  const jordan = await prisma.user.create({
    data: { name: "Jordan Kim", email: "jordan@lockstep.dev", password, role: "freelancer" },
  })
  const sam = await prisma.user.create({
    data: { name: "Sam Patel", email: "sam@lockstep.dev", password, role: "freelancer" },
  })

  const gigs = await Promise.all([
    prisma.gig.create({
      data: {
        clientId: alex.id,
        title: "Build React Dashboard",
        category: "Development",
        description: "Looking for an experienced React developer to build a comprehensive admin dashboard. The dashboard needs real-time data visualization, user management, and analytics. Must integrate with our existing REST API and handle large datasets efficiently.",
        budget: 2500,
        deadline: new Date("2026-04-15"),
        skills: JSON.stringify(["React", "TypeScript", "Tailwind CSS", "REST API"]),
        deliverables: "Fully functional admin dashboard with at least 5 views: overview, users, analytics, settings, and reports. All components documented.",
        status: "open",
      },
    }),
    prisma.gig.create({
      data: {
        clientId: alex.id,
        title: "Logo Design for Fintech Startup",
        category: "Design",
        description: "We need a modern, trustworthy logo for our fintech startup. The brand should feel innovative yet secure. We want to explore both wordmark and icon-based options.",
        budget: 800,
        deadline: new Date("2026-03-30"),
        skills: JSON.stringify(["Logo Design", "Brand Identity", "Figma", "Illustrator"]),
        deliverables: "3 initial concepts, 2 rounds of revisions, final files in SVG, PNG, and PDF. Brand guidelines document.",
        status: "open",
      },
    }),
    prisma.gig.create({
      data: {
        clientId: alex.id,
        title: "Smart Contract Audit",
        category: "Blockchain",
        description: "We need a thorough security audit of our ERC-20 token contract and staking mechanism before mainnet deployment. Looking for an auditor with proven track record.",
        budget: 5000,
        deadline: new Date("2026-04-01"),
        skills: JSON.stringify(["Solidity", "Security Auditing", "EVM", "DeFi"]),
        deliverables: "Full audit report with severity ratings, proof-of-concept exploits for any vulnerabilities found, and remediation recommendations.",
        status: "open",
      },
    }),
    prisma.gig.create({
      data: {
        clientId: alex.id,
        title: "Technical Writing (API Docs)",
        category: "Writing",
        description: "Our REST API has grown significantly and our documentation is outdated. We need a technical writer to create comprehensive, developer-friendly documentation with examples.",
        budget: 1200,
        deadline: new Date("2026-04-10"),
        skills: JSON.stringify(["Technical Writing", "REST API", "OpenAPI", "Markdown"]),
        deliverables: "Complete API reference docs, getting started guide, 5 code examples in JavaScript and Python, and a Postman collection.",
        status: "in_progress",
      },
    }),
    prisma.gig.create({
      data: {
        clientId: alex.id,
        title: "iOS App Bug Fixes",
        category: "Development",
        description: "Our iOS app has 3 critical bugs causing crashes and 5 minor UI issues. Need an experienced iOS developer to diagnose and fix all reported issues.",
        budget: 3000,
        deadline: new Date("2026-03-25"),
        skills: JSON.stringify(["Swift", "iOS", "Xcode", "UIKit"]),
        deliverables: "All 8 issues resolved, regression tests added, and a brief report explaining root causes and fixes applied.",
        status: "open",
      },
    }),
    prisma.gig.create({
      data: {
        clientId: alex.id,
        title: "Data Pipeline (Python/Airflow)",
        category: "Data",
        description: "We need to build an automated data pipeline that ingests data from 3 sources, transforms it, and loads it into our data warehouse. Must handle failures gracefully.",
        budget: 4500,
        deadline: new Date("2026-04-20"),
        skills: JSON.stringify(["Python", "Apache Airflow", "SQL", "ETL", "Data Engineering"]),
        deliverables: "Production-ready Airflow DAGs with proper error handling, monitoring, and alerting. Documentation and runbooks.",
        status: "open",
      },
    }),
    prisma.gig.create({
      data: {
        clientId: alex.id,
        title: "Figma to Next.js Conversion",
        category: "Development",
        description: "Convert 12 Figma screens into a pixel-perfect Next.js application using Tailwind CSS. The designs are clean and modern — we need faithful implementation.",
        budget: 1800,
        deadline: new Date("2026-04-05"),
        skills: JSON.stringify(["Next.js", "React", "Tailwind CSS", "Figma"]),
        deliverables: "All 12 screens implemented, responsive on mobile and desktop, deployed to Vercel.",
        status: "open",
      },
    }),
    prisma.gig.create({
      data: {
        clientId: alex.id,
        title: "SEO Content (10 Articles)",
        category: "Writing",
        description: "Need 10 high-quality blog articles targeting specific keywords in the SaaS space. Each article should be 1,500–2,000 words, well-researched, and SEO-optimized.",
        budget: 600,
        deadline: new Date("2026-04-12"),
        skills: JSON.stringify(["SEO", "Content Writing", "SaaS", "Keyword Research"]),
        deliverables: "10 published-ready articles in Google Docs format with meta descriptions, suggested internal links, and image alt text.",
        status: "open",
      },
    }),
    prisma.gig.create({
      data: {
        clientId: alex.id,
        title: "Marketing Strategy & Growth Plan",
        category: "Marketing",
        description: "Looking for a B2B SaaS marketing strategist to create a 6-month go-to-market plan targeting SMBs. Should include paid, organic, and partnership channels.",
        budget: 3500,
        deadline: new Date("2026-04-18"),
        skills: JSON.stringify(["B2B Marketing", "SaaS", "Growth", "GTM Strategy"]),
        deliverables: "6-month marketing roadmap, channel breakdown, budget allocation, KPIs, and first-month execution plan.",
        status: "open",
      },
    }),
    prisma.gig.create({
      data: {
        clientId: alex.id,
        title: "ML Model: Churn Prediction",
        category: "Data",
        description: "Build a churn prediction model using our historical subscription data. We have 2 years of data and need a model that can identify at-risk users 30 days in advance.",
        budget: 6000,
        deadline: new Date("2026-05-01"),
        skills: JSON.stringify(["Python", "Machine Learning", "scikit-learn", "Data Analysis"]),
        deliverables: "Trained model with ≥80% precision, feature importance report, API endpoint for real-time predictions, and documentation.",
        status: "open",
      },
    }),
    prisma.gig.create({
      data: {
        clientId: alex.id,
        title: "Brand Identity System",
        category: "Design",
        description: "Complete brand overhaul for a B2C wellness app. Need logo, color palette, typography, icon set, and component library in Figma.",
        budget: 4200,
        deadline: new Date("2026-04-25"),
        skills: JSON.stringify(["Brand Design", "Figma", "Design Systems", "Illustration"]),
        deliverables: "Brand guidelines PDF, Figma component library, logo package (all formats), icon set (48 icons), and 3 application examples.",
        status: "open",
      },
    }),
    prisma.gig.create({
      data: {
        clientId: alex.id,
        title: "Email Marketing Automation",
        category: "Marketing",
        description: "Set up a complete email marketing automation system in HubSpot. Includes onboarding sequence (7 emails), re-engagement campaign, and monthly newsletter template.",
        budget: 1400,
        deadline: new Date("2026-04-08"),
        skills: JSON.stringify(["HubSpot", "Email Marketing", "Marketing Automation", "Copywriting"]),
        deliverables: "All email sequences live in HubSpot with A/B test variants, analytics dashboard configured, and copywriting for all emails.",
        status: "open",
      },
    }),
  ])

  await prisma.request.create({
    data: {
      gigId: gigs[0].id,
      freelancerId: jordan.id,
      proposal: "I've built 15+ React dashboards for SaaS companies over the past 4 years. I specialize in real-time data visualization using Recharts and D3. I'll start with a component audit, then build the 5 views iteratively with weekly check-ins.",
      proposedTimeline: "3 weeks",
      status: "pending",
    },
  })
  await prisma.request.create({
    data: {
      gigId: gigs[0].id,
      freelancerId: sam.id,
      proposal: "Senior frontend engineer here with deep React expertise. I've delivered similar dashboards for fintech clients — happy to share case studies. My approach: design system first, then views.",
      proposedTimeline: "2.5 weeks",
      status: "pending",
    },
  })
  await prisma.request.create({
    data: {
      gigId: gigs[1].id,
      freelancerId: jordan.id,
      proposal: "Brand designer with 6 years of fintech experience. I've worked with 3 payment startups. I'll deliver concepts that balance approachability with credibility.",
      proposedTimeline: "10 days",
      status: "pending",
    },
  })
  await prisma.request.create({
    data: {
      gigId: gigs[2].id,
      freelancerId: sam.id,
      proposal: "Certified smart contract auditor. I'll perform static analysis, manual review, and fuzzing. Past audits have caught critical reentrancy and overflow bugs.",
      proposedTimeline: "7 days",
      status: "pending",
    },
  })

  // in_progress gig has an accepted request
  await prisma.request.create({
    data: {
      gigId: gigs[3].id,
      freelancerId: jordan.id,
      proposal: "Technical writer with 5 years of API documentation experience. I've written docs for Stripe, Twilio, and SendGrid-style APIs. I'll structure everything around developer jobs-to-be-done.",
      proposedTimeline: "2 weeks",
      status: "accepted",
    },
  })
  await prisma.request.create({
    data: {
      gigId: gigs[4].id,
      freelancerId: sam.id,
      proposal: "iOS developer, 7 years Swift experience. Bug fixes are my specialty — I'll reproduce each issue first, document the root cause, then fix and write regression tests.",
      proposedTimeline: "5 days",
      status: "pending",
    },
  })
  await prisma.request.create({
    data: {
      gigId: gigs[5].id,
      freelancerId: jordan.id,
      proposal: "Data engineer with 4 years Airflow experience. I've built pipelines handling 10M+ records/day. I'll design idempotent DAGs with proper retry logic and Slack alerting.",
      proposedTimeline: "3 weeks",
      status: "pending",
    },
  })
  await prisma.request.create({
    data: {
      gigId: gigs[6].id,
      freelancerId: sam.id,
      proposal: "Full-stack dev who lives in Figma and Next.js. I'll match your designs pixel-perfectly and make every interaction feel right. Ship in under 2 weeks.",
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
