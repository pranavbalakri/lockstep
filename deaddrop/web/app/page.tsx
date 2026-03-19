"use client";

import { useCallback, useEffect, useState } from "react";
import {
  useWeb3Auth,
  useWeb3AuthConnect,
  useWeb3AuthDisconnect,
  useWeb3AuthUser,
} from "@web3auth/modal/react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  formatEther,
  http,
  parseEther,
  type EIP1193Provider,
} from "viem";
import { mainnet } from "viem/chains";
import {
  DEAD_DROP_ABI,
  type EscrowState,
  STATE_COLOR,
  STATE_LABEL,
} from "@/lib/contract";
import { env } from "@/lib/env";

const CONTRACT_ADDRESS = env.NEXT_PUBLIC_DEADDROP_CONTRACT_ADDRESS as `0x${string}`;

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(env.NEXT_PUBLIC_RPC_URL),
});

// ─── styles ──────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  padding: 24,
  borderRadius: 16,
  background: "rgba(15, 23, 42, 0.85)",
  border: "1px solid rgba(125, 211, 252, 0.15)",
  marginTop: 20,
};

const label: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "#7dd3fc",
  marginBottom: 6,
};

const mono: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: 13,
  color: "#e2e8f0",
  wordBreak: "break-all",
};

const btn = (color = "#3b82f6"): React.CSSProperties => ({
  padding: "10px 20px",
  borderRadius: 10,
  border: "none",
  background: color,
  color: "#fff",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
});

// ─── types ────────────────────────────────────────────────────────────────────

interface ContractData {
  state: EscrowState;
  depositedAmount: bigint;
  client: `0x${string}`;
  freelancer: `0x${string}`;
  arbiter: `0x${string}`;
}

// ─── component ────────────────────────────────────────────────────────────────

export default function Home() {
  const { provider, isConnected } = useWeb3Auth();
  const { connect } = useWeb3AuthConnect();
  const { disconnect } = useWeb3AuthDisconnect();
  const { userInfo } = useWeb3AuthUser();

  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [txPending, setTxPending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── resolve connected address ──────────────────────────────────────────────

  useEffect(() => {
    if (!isConnected || !provider) {
      setAddress(null);
      return;
    }
    const walletClient = createWalletClient({
      chain: mainnet,
      transport: custom(provider as EIP1193Provider),
    });
    walletClient.getAddresses().then(([addr]) => setAddress(addr ?? null));
  }, [isConnected, provider]);

  // ── read contract ──────────────────────────────────────────────────────────

  const refreshContract = useCallback(async () => {
    if (!CONTRACT_ADDRESS) return;
    const [state, depositedAmount, client, freelancer, arbiter] =
      await Promise.all([
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: DEAD_DROP_ABI,
          functionName: "state",
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: DEAD_DROP_ABI,
          functionName: "depositedAmount",
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: DEAD_DROP_ABI,
          functionName: "CLIENT",
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: DEAD_DROP_ABI,
          functionName: "FREELANCER",
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: DEAD_DROP_ABI,
          functionName: "ARBITER",
        }),
      ]);
    setContractData({
      state: state as EscrowState,
      depositedAmount,
      client,
      freelancer,
      arbiter,
    });
  }, []);

  useEffect(() => {
    refreshContract();
  }, [refreshContract]);

  // ── write helpers ──────────────────────────────────────────────────────────

  const getWalletClient = useCallback(() => {
    if (!provider) throw new Error("Not connected");
    return createWalletClient({
      chain: mainnet,
      transport: custom(provider as EIP1193Provider),
    });
  }, [provider]);

  const sendTx = useCallback(
    async (fn: (wc: ReturnType<typeof createWalletClient>) => Promise<`0x${string}`>) => {
      setError(null);
      setTxHash(null);
      setTxPending(true);
      try {
        const wc = getWalletClient();
        const hash = await fn(wc);
        setTxHash(hash);
        await publicClient.waitForTransactionReceipt({ hash });
        await refreshContract();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setTxPending(false);
      }
    },
    [getWalletClient, refreshContract]
  );

  const handleDeposit = () =>
    sendTx((wc) =>
      wc.writeContract({
        chain: mainnet,
        address: CONTRACT_ADDRESS,
        abi: DEAD_DROP_ABI,
        functionName: "deposit",
        account: address!,
        value: parseEther(depositAmount),
      })
    );

  const handleRelease = () =>
    sendTx((wc) =>
      wc.writeContract({
        chain: mainnet,
        address: CONTRACT_ADDRESS,
        abi: DEAD_DROP_ABI,
        functionName: "release",
        account: address!,
      })
    );

  const handleDispute = () =>
    sendTx((wc) =>
      wc.writeContract({
        chain: mainnet,
        address: CONTRACT_ADDRESS,
        abi: DEAD_DROP_ABI,
        functionName: "dispute",
        account: address!,
      })
    );

  // ── role detection ─────────────────────────────────────────────────────────

  const role = (() => {
    if (!address || !contractData) return null;
    const a = address.toLowerCase();
    if (a === contractData.client.toLowerCase()) return "client";
    if (a === contractData.freelancer.toLowerCase()) return "freelancer";
    if (a === contractData.arbiter.toLowerCase()) return "arbiter";
    return "observer";
  })();

  const { state } = contractData ?? { state: 0 as EscrowState };
  const isClient = role === "client";
  const isArbiter = role === "arbiter";

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "64px 24px 96px" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ margin: 0, letterSpacing: "0.2em", textTransform: "uppercase", color: "#7dd3fc", fontSize: 11 }}>
            Escrow
          </p>
          <h1 style={{ margin: "4px 0 0", fontSize: "2.5rem", fontWeight: 700 }}>DeadDrop</h1>
        </div>
        {isConnected ? (
          <button style={btn("#1e293b")} onClick={() => disconnect()}>
            Disconnect
          </button>
        ) : (
          <button
            style={btn()}
            onClick={() => connect()}
          >
            Connect Wallet
          </button>
        )}
      </div>

      {/* not connected */}
      {!isConnected && (
        <div style={card}>
          <p style={{ margin: 0, color: "#94a3b8", lineHeight: 1.7 }}>
            Connect with Google, email, or any social login — no browser
            extension required. MetaMask Embedded Wallets handles key
            management so you can interact with the escrow contract directly.
          </p>
        </div>
      )}

      {/* wallet card */}
      {isConnected && address && (
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {userInfo?.profileImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userInfo.profileImage}
                alt="avatar"
                style={{ width: 36, height: 36, borderRadius: "50%" }}
              />
            )}
            <div>
              {userInfo?.name && (
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{userInfo.name}</p>
              )}
              <p style={{ ...mono, margin: 0 }}>{address}</p>
            </div>
            {role && (
              <span
                style={{
                  marginLeft: "auto",
                  padding: "4px 10px",
                  borderRadius: 6,
                  background: "rgba(125, 211, 252, 0.12)",
                  color: "#7dd3fc",
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                {role}
              </span>
            )}
          </div>
        </div>
      )}

      {/* contract state card */}
      {contractData && (
        <div style={card}>
          <p style={label}>Contract State</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <span
              style={{
                padding: "5px 14px",
                borderRadius: 20,
                background: STATE_COLOR[contractData.state] + "22",
                border: `1px solid ${STATE_COLOR[contractData.state]}55`,
                color: STATE_COLOR[contractData.state],
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {STATE_LABEL[contractData.state]}
            </span>
            {contractData.depositedAmount > 0n && (
              <span style={{ color: "#e2e8f0", fontSize: 14 }}>
                {formatEther(contractData.depositedAmount)} ETH locked
              </span>
            )}
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {(
              [
                ["Client", contractData.client],
                ["Freelancer", contractData.freelancer],
                ["Arbiter", contractData.arbiter],
              ] as [string, string][]
            ).map(([name, addr]) => (
              <div key={name}>
                <p style={label}>{name}</p>
                <p style={{ ...mono, margin: 0 }}>{addr}</p>
              </div>
            ))}
          </div>

          <p style={{ ...mono, margin: "16px 0 0", fontSize: 11, color: "#475569" }}>
            {CONTRACT_ADDRESS}
          </p>
        </div>
      )}

      {/* actions */}
      {isConnected && contractData && (
        <div style={card}>
          <p style={label}>Actions</p>

          {/* deposit */}
          {isClient && state === 0 && (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="number"
                min="0"
                step="0.001"
                placeholder="ETH amount"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(125, 211, 252, 0.2)",
                  background: "rgba(15, 23, 42, 0.6)",
                  color: "#e2e8f0",
                  fontSize: 14,
                  width: 160,
                }}
              />
              <button
                style={btn()}
                disabled={txPending || !depositAmount}
                onClick={handleDeposit}
              >
                {txPending ? "Sending…" : "Deposit"}
              </button>
            </div>
          )}

          {/* release */}
          {(isClient || isArbiter) && state === 1 && (
            <button
              style={{ ...btn("#22c55e"), marginRight: 10 }}
              disabled={txPending}
              onClick={handleRelease}
            >
              {txPending ? "Sending…" : "Release to Freelancer"}
            </button>
          )}

          {/* dispute */}
          {isArbiter && state === 1 && (
            <button
              style={btn("#ef4444")}
              disabled={txPending}
              onClick={handleDispute}
            >
              {txPending ? "Sending…" : "Dispute (Refund Client)"}
            </button>
          )}

          {/* observer / terminal states */}
          {role === "observer" && (
            <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
              Your wallet is not a participant in this escrow.
            </p>
          )}
          {state === 2 && (
            <p style={{ margin: 0, color: "#22c55e", fontSize: 14 }}>
              Funds have been released to the freelancer.
            </p>
          )}
          {state === 3 && (
            <p style={{ margin: 0, color: "#ef4444", fontSize: 14 }}>
              Escrow was disputed — funds refunded to the client.
            </p>
          )}
        </div>
      )}

      {/* tx feedback */}
      {txHash && (
        <div
          style={{
            ...card,
            borderColor: "rgba(34, 197, 94, 0.3)",
            background: "rgba(34, 197, 94, 0.05)",
          }}
        >
          <p style={{ ...label, color: "#22c55e" }}>Transaction confirmed</p>
          <p style={{ ...mono, margin: 0 }}>{txHash}</p>
        </div>
      )}

      {error && (
        <div
          style={{
            ...card,
            borderColor: "rgba(239, 68, 68, 0.3)",
            background: "rgba(239, 68, 68, 0.05)",
          }}
        >
          <p style={{ ...label, color: "#ef4444" }}>Error</p>
          <p style={{ margin: 0, color: "#fca5a5", fontSize: 13 }}>{error}</p>
        </div>
      )}
    </main>
  );
}
