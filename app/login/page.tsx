"use client"

import { useEffect } from "react"
import { usePrivy } from "@privy-io/react-auth"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"

function LoginRedirector() {
  const { ready, authenticated, login } = usePrivy()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") ?? "/dashboard"

  useEffect(() => {
    if (!ready) return
    if (authenticated) {
      router.replace(redirect)
    } else {
      login()
    }
  }, [ready, authenticated, login, router, redirect])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background" />}>
      <LoginRedirector />
    </Suspense>
  )
}
