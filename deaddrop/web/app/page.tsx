import { env } from "@/lib/env";

const setupItems = [
  "Install Foundry (`curl -L https://foundry.paradigm.xyz | bash`, then `foundryup`).",
  "Install web dependencies with `pnpm install` inside `deaddrop/`.",
  "Add the MetaMask browser extension and connect it to your target network.",
  "Fill out `deaddrop/.env.local` with your RPC URL, deployer key, and OpenAI key."
];

export default function Home() {
  return (
    <main
      style={{
        maxWidth: 840,
        margin: "0 auto",
        padding: "72px 24px 96px"
      }}
    >
      <p
        style={{
          margin: 0,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "#7dd3fc",
          fontSize: 12
        }}
      >
        Phase 1 Setup
      </p>
      <h1 style={{ fontSize: "clamp(2.5rem, 8vw, 5rem)", marginBottom: 16 }}>
        DeadDrop workspace is ready.
      </h1>
      <p style={{ color: "#cbd5e1", fontSize: 18, lineHeight: 1.6 }}>
        This app is wired for Next.js, wagmi, viem, and the OpenAI SDK. Contract
        deployment values come from environment variables so we can swap networks
        and deployed addresses cleanly.
      </p>

      <section style={{ marginTop: 40 }}>
        <h2>Environment preview</h2>
        <pre
          style={{
            padding: 20,
            borderRadius: 16,
            background: "rgba(15, 23, 42, 0.85)",
            border: "1px solid rgba(125, 211, 252, 0.2)",
            overflowX: "auto"
          }}
        >
          {JSON.stringify(env, null, 2)}
        </pre>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2>Next steps</h2>
        <ol style={{ color: "#cbd5e1", lineHeight: 1.8, paddingLeft: 20 }}>
          {setupItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>
    </main>
  );
}
