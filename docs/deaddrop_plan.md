# DeadDrop Blockchain Integration Plan

The contract lifecycle maps onto existing gig statuses:

```
open → in_progress → submitted → completed/disputed
          ↑               ↑              ↑
       deploy +        (AI runs)     release() or
       deposit()                     dispute()
```

---

## Step 1 — Add deps to the main app

```bash
npm install viem wagmi @tanstack/react-query
```

---

## Step 2 — Store the contract address in Prisma

Add a `contractAddress` field to the `Gig` model so the DB knows which deployed contract belongs to each gig:

```prisma
model Gig {
  ...
  contractAddress String?   // set after client deploys the escrow
}
```

Then run `prisma migrate dev`.

---

## Step 3 — Wagmi provider in the layout

Wrap `app/layout.tsx` with a `WagmiProvider` + `QueryClientProvider`. This is a client component wrapper around the Server Component layout — same pattern as any context provider.

---

## Step 4 — Three contract interaction points in the UI

**A) Client accepts a request** (`PATCH /api/requests/[id]` → status `accepted`)

After accepting, show a "Fund Escrow" button that:
1. Calls `deployContract({ abi, bytecode, args: [clientWallet, freelancerWallet] })` via wagmi
2. On success, `PATCH /api/gigs/[id]` to save `contractAddress` to the DB

**B) Freelancer submits work** (already exists via `POST /api/gigs/[id]/submit`)

No contract call here — purely off-chain.

**C) Client reviews submission** (`POST /api/gigs/[id]/review`)

After the AI verdict, show "Release Payment" or "Dispute" buttons that:
1. Call `writeContract({ address: gig.contractAddress, abi, functionName: 'release' | 'dispute' })` via wagmi
2. On success, hit the existing review endpoint to update gig status in the DB

---

## Step 5 — ABI constant

Copy the compiled ABI from `deaddrop/contracts/out/DeadDrop.sol/DeadDrop.json` into `lib/contracts/DeadDrop.ts` as a typed constant. Both deploy and write calls need it.

---

## Design rules to keep

- The server **never** touches the contract — no private keys on the backend, no RPC calls server-side.
- API endpoints only update the DB to record what already happened on-chain (contract address, final status).
- All wallet interactions happen in the browser via wagmi.
