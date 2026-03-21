import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { signToken, setCookieOptions } from "@/lib/auth"

// TODO: Add server-side Privy token verification before production deployment.
// For now this trusts the privyUserId from the client (acceptable for hackathon demo).
export async function POST(req: NextRequest) {
  try {
    const { privyUserId, email, name, role } = await req.json()

    if (!privyUserId || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Find existing user by privyId or email
    let user = await prisma.user.findFirst({
      where: { OR: [{ privyId: privyUserId }, { email }] },
    })

    if (!user) {
      // New user — need role to create account
      if (!role || !name) {
        return NextResponse.json({ isNewUser: true })
      }
      user = await prisma.user.create({
        data: { privyId: privyUserId, name, email, role },
      })
    } else if (!user.privyId) {
      // Existing email/password user — link their Privy ID
      user = await prisma.user.update({
        where: { id: user.id },
        data: { privyId: privyUserId },
      })
    }

    const token = await signToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    })

    const response = NextResponse.json({ ok: true })
    response.cookies.set({ value: token, ...setCookieOptions() })
    return response
  } catch (err) {
    console.error("Privy auth error:", err)
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
}
