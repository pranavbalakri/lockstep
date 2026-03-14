import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { signToken, setCookieOptions } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role } = await req.json()

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }
    if (!["freelancer", "client"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role },
    })

    const token = await signToken({ id: user.id, name: user.name, email: user.email, role: user.role })
    const res = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } })
    const opts = setCookieOptions()
    res.cookies.set({ ...opts, value: token })
    return res
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
