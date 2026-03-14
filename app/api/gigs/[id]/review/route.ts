import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSessionFromRequest } from "@/lib/auth"
import { releaseEscrow, disputeEscrow } from "@/lib/escrow"

const AI_BACKEND = process.env.AI_BACKEND_URL ?? "http://localhost:8000"

async function runAiReview(gig: {
  description: string
  deliverables: string
  category: string
}, submission: {
  textContent?: string | null
  url?: string | null
}): Promise<"release" | "dispute"> {
  try {
    // Step 1: parse scope → get evaluation criteria
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

    // Step 2: evaluate submission against criteria
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

    return evaluation.verdict.action === "RELEASE" ? "release" : "dispute"
  } catch (err) {
    console.error("AI review error:", err)
    // Fallback: if AI is unavailable, favour the client's original action
    return "release"
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const gig = await prisma.gig.findUnique({
    where: { id },
    include: { submission: true },
  })
  if (!gig) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (gig.status !== "submitted") {
    return NextResponse.json({ error: "No submission to review" }, { status: 400 })
  }

  const acceptedRequest = await prisma.request.findFirst({
    where: { gigId: id, clientId: session.id, status: "accepted" },
  })
  if (!acceptedRequest) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { action } = await req.json()
  if (!["accept", "dispute"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  let contractAction: "release" | "dispute"

  if (action === "accept") {
    // Client accepts → always release
    contractAction = "release"
  } else {
    // Client disputes → run AI to decide
    contractAction = await runAiReview(
      { description: gig.description, deliverables: gig.deliverables, category: gig.category },
      { textContent: gig.submission?.textContent, url: gig.submission?.url }
    )
  }

  // Resolve the escrow contract server-side if one exists
  if (gig.contractAddress) {
    try {
      if (contractAction === "release") {
        await releaseEscrow(gig.contractAddress as `0x${string}`)
      } else {
        await disputeEscrow(gig.contractAddress as `0x${string}`)
      }
    } catch (err) {
      console.error("Escrow resolution failed:", err)
      // Continue — update DB even if on-chain call fails (client can retry manually)
    }
  }

  const newStatus = contractAction === "release" ? "completed" : "disputed"
  await prisma.gig.update({ where: { id }, data: { status: newStatus } })

  return NextResponse.json({ status: newStatus, contractAction })
}
