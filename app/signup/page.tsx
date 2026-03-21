"use client"

import { useEffect } from "react"
import { usePrivy } from "@privy-io/react-auth"
import { useRouter } from "next/navigation"

export default function SignupPage() {
  const { ready, authenticated, login } = usePrivy()
  const router = useRouter()

  useEffect(() => {
    if (!ready) return
    if (authenticated) {
      router.replace("/dashboard")
    } else {
      login()
    }
  }, [ready, authenticated, login, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}
