"use client"

import { PrivyProvider, usePrivy } from "@privy-io/react-auth"
import { WagmiProvider } from "@privy-io/wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createConfig, http } from "wagmi"
import { baseSepolia } from "viem/chains"
import { type ReactNode, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

const queryClient = new QueryClient()

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http("https://sepolia.base.org"),
  },
})

// Syncs Privy auth state to our JWT session (runs once per login)
function PrivyAuthSync() {
  const { ready, authenticated, user } = usePrivy()
  const syncedRef = useRef(false)
  const router = useRouter()

  useEffect(() => {
    if (!authenticated) {
      syncedRef.current = false
      return
    }
    if (!ready || !user || syncedRef.current) return
    syncedRef.current = true

    const email = user.email?.address ?? (user.google as { email?: string } | null)?.email
    if (!email) return
    const name = (user.google as { name?: string } | null)?.name ?? email.split("@")[0]

    fetch("/api/auth/privy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ privyUserId: user.id, email, name }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.isNewUser) {
          router.push("/onboarding")
        } else if (data.ok) {
          router.refresh()
        }
      })
      .catch(() => {
        syncedRef.current = false
      })
  }, [ready, authenticated, user, router])

  return null
}

export function PrivyAppProvider({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? ""}
      config={{
        appearance: {
          theme: "light",
          accentColor: "#2D6A4F",
          logo: "/icon.svg",
        },
        loginMethods: ["email", "google"],
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
          requireUserPasswordOnCreate: false,
        },
        defaultChain: baseSepolia,
        supportedChains: [baseSepolia],
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <PrivyAuthSync />
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  )
}
