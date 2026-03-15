import { NextRequest, NextResponse } from "next/server"
import { getSession, getSessionFromRequest } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ user: null })
  }
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      walletAddress: true,
      bio: true,
      profilePicture: true,
      industry: true,
      professionalTitle: true,
      skills: true,
      workExperience: true,
      education: true,
      createdAt: true,
    },
  })
  return NextResponse.json({ user })
}

export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const {
    name,
    bio,
    profilePicture,
    industry,
    professionalTitle,
    skills,
    workExperience,
    education,
  } = body

  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = String(name).trim().slice(0, 100)
  if (bio !== undefined) data.bio = String(bio).trim().slice(0, 1000)
  if (profilePicture !== undefined) data.profilePicture = profilePicture ? String(profilePicture).trim() : null
  if (industry !== undefined) data.industry = industry ? String(industry).trim().slice(0, 100) : null
  if (professionalTitle !== undefined) data.professionalTitle = professionalTitle ? String(professionalTitle).trim().slice(0, 100) : null
  if (skills !== undefined) data.skills = JSON.stringify(Array.isArray(skills) ? skills : [])
  if (workExperience !== undefined) data.workExperience = JSON.stringify(Array.isArray(workExperience) ? workExperience : [])
  if (education !== undefined) data.education = JSON.stringify(Array.isArray(education) ? education : [])

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: { id: session.id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      walletAddress: true,
      bio: true,
      profilePicture: true,
      industry: true,
      professionalTitle: true,
      skills: true,
      workExperience: true,
      education: true,
    },
  })

  return NextResponse.json({ user })
}
