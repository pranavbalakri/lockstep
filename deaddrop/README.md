# DeadDrop Phase 1 Setup

This workspace is split into:

- `contracts/` for Foundry smart contracts and deployment scripts
- `web/` for the Next.js frontend using `wagmi`, `viem`, and the OpenAI SDK

## What is already set up

- Workspace root with `pnpm` scripts
- Minimal Next.js app scaffold in `web/`
- Foundry project scaffold in `contracts/`
- Shared environment variable template in `.env.example`

## Tooling to install on your machine

### Node.js

Node.js is already available in this environment (`v25.3.0`).

### Foundry

Install Foundry:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

Then install the standard library inside `contracts/`:

```bash
forge install foundry-rs/forge-std
```

### MetaMask

Install the browser extension from the official MetaMask site and connect it to the RPC network you want to use for deployment and testing.

### Web dependencies

From `deaddrop/`, install the frontend packages:

```bash
pnpm install
```

## Environment variables

Use the shared root `.env.example` as the reference list, then put values in the tool-specific files below.

### Frontend

Copy `web/.env.example` to `web/.env.local` and fill in:

```bash
NEXT_PUBLIC_RPC_URL=
NEXT_PUBLIC_DEADDROP_CONTRACT_ADDRESS=
OPENAI_API_KEY=
DEPLOYER_PRIVATE_KEY=
CLIENT_ADDRESS=
FREELANCER_ADDRESS=
```

### Contracts

Copy `contracts/.env.example` to `contracts/.env` and fill in:

```bash
NEXT_PUBLIC_RPC_URL=
DEPLOYER_PRIVATE_KEY=
CLIENT_ADDRESS=
FREELANCER_ADDRESS=
```

Use the deployed contract address in the frontend env file once the first deployment is complete.

## Deployment

Once `contracts/.env` is filled in, deploy with:

```bash
source contracts/.env
cd contracts
forge script script/Deploy.s.sol:DeployDeadDrop --rpc-url "$NEXT_PUBLIC_RPC_URL" --broadcast
```

The contract ABI is generated at `contracts/out/DeadDrop.sol/DeadDrop.json`.

## Local verification

To prove the escrow can actually move ETH from the client wallet to the freelancer wallet on a local chain:

1. Start Anvil:

```bash
anvil --port 8545 --host 127.0.0.1
```

2. In another terminal, run:

```bash
cd deaddrop
pnpm verify:local
```

By default this uses Anvil account `0` as the client and account `1` as the freelancer, deploys a fresh `DeadDrop` contract, deposits `1 ETH`, releases it, and confirms the freelancer balance increased by exactly `1 ETH`.
