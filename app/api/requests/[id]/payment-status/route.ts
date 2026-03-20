import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSessionFromRequest } from "@/lib/auth"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSessionFromRequest(req)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const request = await prisma.request.findUnique({
    where: { id },
    select: {
      id: true,
      clientId: true,
      paymentStatus: true,
      ethAmount: true,
      expectedEthAmount: true,
      slippagePercent: true,
      paymentFailureReason: true,
      gig: {
        select: {
          freelancerId: true,
        },
      },
    },
  })

  if (!request) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Only allow client or freelancer of this request to check status
  const isClient = session.role === "client" && request.clientId === session.id
  const isFreelancer =
    session.role === "freelancer" && request.gig.freelancerId === session.id

  if (!isClient && !isFreelancer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json({
    paymentStatus: request.paymentStatus,
    ethAmount: request.ethAmount,
    expectedEthAmount: request.expectedEthAmount,
    slippagePercent: request.slippagePercent,
    failureReason: request.paymentFailureReason,
  })
}
