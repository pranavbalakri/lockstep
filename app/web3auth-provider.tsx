"use client"

import { type ReactNode } from "react"
import { Web3AuthProvider } from "@web3auth/modal/react"
import { web3AuthContextConfig } from "@/lib/web3auth"

export function Web3AuthAppProvider({ children }: { children: ReactNode }) {
  return (
    <Web3AuthProvider config={web3AuthContextConfig}>
      {children}
    </Web3AuthProvider>
  )
}
