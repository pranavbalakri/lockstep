import { type Web3AuthContextConfig } from "@web3auth/modal/react"
import { WEB3AUTH_NETWORK, type Web3AuthOptions } from "@web3auth/modal"

const web3AuthOptions: Web3AuthOptions = {
  clientId: process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID ?? "",
  web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
}

export const web3AuthContextConfig: Web3AuthContextConfig = {
  web3AuthOptions,
}
