import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { signToken, setCookieOptions } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const token = await signToken({ id: user.id, name: user.name, email: user.email, role: user.role })
    const res = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } })
    const opts = setCookieOptions()
    res.cookies.set({ ...opts, value: token })
    return res
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
