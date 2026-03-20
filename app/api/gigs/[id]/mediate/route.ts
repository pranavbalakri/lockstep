import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSessionFromRequest } from "@/lib/auth"
import { releaseEscrow, disputeEscrow } from "@/lib/escrow"

const AI_BACKEND = process.env.AI_BACKEND_URL ?? "http://localhost:8000"

async function runMediation(gig: {
  description: string
  deliverables: string
  category: string
  clientArgument: string
  freelancerArgument: string
}, submission: { textContent?: string | null; url?: string | null }) {
  // Parse scope
  const scopeRes = await fetch(`${AI_BACKEND}/api/parse-scope`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      description: `${gig.description}\n\nDeliverables: ${gig.deliverables}`,
      work_type: gig.category,
    }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!scopeRes.ok) throw new Error("Scope parsing failed")
  const scope = await scopeRes.json()

  // Evaluate deliverable
  const evalRes = await fetch(`${AI_BACKEND}/api/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deliverable_text: submission.textContent ?? "",
      deliverable_url: submission.url ?? null,
      criteria: scope.criteria,
      work_type: gig.category,
    }),
    signal: AbortSignal.timeout(60_000),
  })
  if (!evalRes.ok) throw new Error("Evaluation failed")
  const evaluation = await evalRes.json()

  // Mediate with both arguments
  const mediateRes = await fetch(`${AI_BACKEND}/api/mediate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      description: `${gig.description}\n\nDeliverables: ${gig.deliverables}`,
      criteria: scope.criteria,
      deliverable_text: submission.textContent ?? "",
      evaluations: evaluation.evaluations,
      verdict: evaluation.verdict,
      client_argument: gig.clientArgument,
      freelancer_argument: gig.freelancerArgument,
    }),
    signal: AbortSignal.timeout(60_000),
  })
  if (!mediateRes.ok) throw new Error("Mediation failed")
  return mediateRes.json()
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const gig = await prisma.gig.findUnique({
    where: { id },
    include: { submissions: { orderBy: { version: "desc" as const }, take: 1 } },
  })
  if (!gig) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (gig.status !== "disputed") {
    return NextResponse.json({ error: "Gig is not in dispute" }, { status: 400 })
  }

  // Verify the session user is a participant
  const isFreelancer = session.role === "freelancer" && gig.freelancerId === session.id
  const acceptedRequest = isFreelancer
    ? null
    : await prisma.request.findFirst({ where: { gigId: id, clientId: session.id, status: "accepted" } })
  const isClient = session.role === "client" && !!acceptedRequest

  if (!isFreelancer && !isClient) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { argument } = await req.json()
  if (!argument?.trim()) {
    return NextResponse.json({ error: "Argument is required" }, { status: 400 })
  }

  // Input validation for security
  const MAX_ARGUMENT_LENGTH = 5000
  if (argument.length > MAX_ARGUMENT_LENGTH) {
    return NextResponse.json(
      { error: `Argument must be ${MAX_ARGUMENT_LENGTH} characters or less` },
      { status: 400 }
    )
  }

  // Store argument for this party
  const update = isClient
    ? { clientArgument: argument }
    : { freelancerArgument: argument }
  const updated = await prisma.gig.update({ where: { id }, data: update })

  const clientArg = isClient ? argument : updated.clientArgument
  const freelancerArg = isFreelancer ? argument : updated.freelancerArgument

  // If both parties have argued, run mediator and resolve
  if (clientArg && freelancerArg) {
    const latestSubmission = gig.submissions[0]
    if (!latestSubmission) {
      return NextResponse.json({ error: "No submission found" }, { status: 400 })
    }

    try {
      const result = await runMediation(
        {
          description: gig.description,
          deliverables: gig.deliverables,
          category: gig.category,
          clientArgument: clientArg,
          freelancerArgument: freelancerArg,
        },
        { textContent: latestSubmission.textContent, url: latestSubmission.url }
      )

      // Freelancer gets >= 50% → release; otherwise → refund client
      const verdict = result.proposed_split.freelancer_percentage >= 50 ? "released" : "refunded"

      if (gig.contractAddress) {
        try {
          if (verdict === "released") {
            await releaseEscrow(gig.contractAddress as `0x${string}`)
          } else {
            await disputeEscrow(gig.contractAddress as `0x${string}`)
          }
        } catch (err) {
          console.error("Escrow resolution failed:", err)
        }
      }

      await prisma.gig.update({
        where: { id },
        data: {
          mediatorVerdict: verdict,
          mediatorReasoning: result.reasoning,
          status: verdict === "released" ? "completed" : "disputed",
        },
      })

      return NextResponse.json({ resolved: true, verdict, reasoning: result.reasoning })
    } catch (err) {
      console.error("Mediation pipeline failed:", err)
      return NextResponse.json({ error: "Mediation failed, try again later" }, { status: 500 })
    }
  }

  return NextResponse.json({
    resolved: false,
    waiting: isClient ? "freelancer" : "client",
  })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gig = await prisma.gig.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      clientArgument: true,
      freelancerArgument: true,
      mediatorVerdict: true,
      mediatorReasoning: true,
      description: true,
      deliverables: true,
      freelancerId: true,
      submissions: { select: { textContent: true, url: true, notes: true, version: true }, orderBy: { version: "desc" as const }, take: 1 },
    },
  })
  if (!gig) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const { submissions, ...gigRest } = gig
  return NextResponse.json({ gig: { ...gigRest, submission: submissions[0] ?? null } })
}
