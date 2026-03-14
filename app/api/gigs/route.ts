import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSessionFromRequest } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category")
  const page = parseInt(searchParams.get("page") ?? "1")
  const limit = parseInt(searchParams.get("limit") ?? "8")
  const sort = searchParams.get("sort") ?? "newest"
  const minBudget = searchParams.get("minBudget")
  const maxBudget = searchParams.get("maxBudget")
  const skill = searchParams.get("skill")

  const where: Record<string, unknown> = {}
  if (category && category !== "All") where.category = category

  if (minBudget || maxBudget) {
    where.budget = {
      ...(minBudget ? { gte: parseFloat(minBudget) } : {}),
      ...(maxBudget ? { lte: parseFloat(maxBudget) } : {}),
    }
  }

  const orderBy =
    sort === "highest_budget"
      ? { budget: "desc" as const }
      : sort === "most_requested"
      ? { createdAt: "desc" as const }
      : sort === "deadline_soonest"
      ? { deadline: "asc" as const }
      : { createdAt: "desc" as const }

  let gigs = await prisma.gig.findMany({
    where,
    orderBy,
    include: { freelancer: { select: { id: true, name: true } }, requests: { select: { id: true } } },
  })

  if (skill) {
    gigs = gigs.filter((g) => {
      const skills: string[] = JSON.parse(g.skills)
      return skills.some((s) => s.toLowerCase().includes(skill.toLowerCase()))
    })
  }

  const total = gigs.length
  const paginated = gigs.slice((page - 1) * limit, page * limit)

  return NextResponse.json({
    gigs: paginated.map((g) => ({
      ...g,
      skills: JSON.parse(g.skills),
      requestCount: g.requests.length,
      requests: undefined,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== "freelancer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { title, category, description, budget, deadline, skills, deliverables, ethAmount } = await req.json()

    if (!title || !category || !description || !budget || !deadline || !deliverables) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 })
    }

    const gig = await prisma.gig.create({
      data: {
        freelancerId: session.id,
        title,
        category,
        description,
        budget: parseFloat(budget),
        deadline: new Date(deadline),
        skills: JSON.stringify(skills ?? []),
        deliverables,
        ...(ethAmount ? { ethAmount: parseFloat(ethAmount) } : {}),
      },
    })

    return NextResponse.json({ gig: { ...gig, skills: JSON.parse(gig.skills) } }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
