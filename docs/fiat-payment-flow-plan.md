# Fiat Payment Flow Implementation Plan

## Overview
Integrate MoonPay on-ramp so clients can pay USD and have ETH deposited to escrow. Keep custodial model (server wallet as CLIENT) but design for future non-custodial migration.

## Architecture

```
Client clicks Pay → MoonPay widget opens → User pays USD
                                               ↓
                                    MoonPay sends ETH to contract
                                               ↓
                    ┌──────────────────────────┴───────────────────────────┐
                    ↓                                                      ↓
           Webhook: POST /api/webhooks/moonpay              Polling: /api/cron/reconcile
                    ↓                                                      ↓
           Validate signature                                   Read contract state
                    ↓                                                      ↓
           Update Request.ethAmount                            Reconcile DB ↔ chain
                    ↓
           Mark as FUNDED
```

## Implementation Steps

### 1. MoonPay Widget Integration
**Files to modify:**
- `app/gig/[id]/pay/page.tsx` — Replace direct API call with MoonPay widget

**Changes:**
- Install `@moonpay/moonpay-react` SDK
- Create MoonPay widget component that opens on "Pay Now"
- Pass `walletAddress` = escrow contract address
- Pass `baseCurrencyAmount` = gig budget in USD
- Handle `onSuccess` callback to show pending state

### 2. Create Payment Session Endpoint
**New file:** `app/api/gigs/[id]/payment-session/route.ts`

**Purpose:**
- Generate MoonPay signature for secure widget initialization
- Return widget URL with signed parameters
- Store session ID for webhook correlation

**Env vars needed:**
```
MOONPAY_API_KEY=pk_live_...
MOONPAY_SECRET_KEY=sk_live_...
MOONPAY_WEBHOOK_SECRET=whsec_...
```

### 3. Webhook Handler
**New file:** `app/api/webhooks/moonpay/route.ts`

**Logic:**
```typescript
export async function POST(req: NextRequest) {
  // 1. Get raw body for signature verification
  const body = await req.text()
  const signature = req.headers.get("Moonpay-Signature")

  // 2. Verify HMAC signature
  const isValid = verifyMoonPaySignature(body, signature, WEBHOOK_SECRET)
  if (!isValid) return NextResponse.json({ error: "Invalid signature" }, { status: 401 })

  // 3. Parse event
  const event = JSON.parse(body)
  if (event.type !== "transaction_completed") return NextResponse.json({ ok: true })

  // 4. Find request by contract address (externalCustomerId or walletAddress)
  const request = await prisma.request.findFirst({
    where: { gig: { contractAddress: event.data.walletAddress } }
  })

  // 5. Update payment status
  await prisma.request.update({
    where: { id: request.id },
    data: { ethAmount: event.data.cryptoTransactionId ? gig.ethAmount : null }
  })

  return NextResponse.json({ ok: true })
}
```

### 4. Reconciliation Polling Endpoint
**New file:** `app/api/cron/reconcile-escrow/route.ts`

**Purpose:** Safety net to catch missed webhooks

**Logic:**
```typescript
export async function GET(req: NextRequest) {
  // 1. Verify cron secret (Vercel CRON_SECRET or custom)
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 2. Find all requests with contract but no ethAmount (unpaid)
  const unpaidRequests = await prisma.request.findMany({
    where: {
      status: "accepted",
      ethAmount: null,
      gig: { contractAddress: { not: null } }
    },
    include: { gig: true }
  })

  // 3. Check each contract's on-chain state
  for (const request of unpaidRequests) {
    const state = await readContractState(request.gig.contractAddress)
    if (state === "Funded") {
      const amount = await readDepositedAmount(request.gig.contractAddress)
      await prisma.request.update({
        where: { id: request.id },
        data: { ethAmount: formatEther(amount) }
      })
    }
  }

  return NextResponse.json({ reconciled: unpaidRequests.length })
}
```

**Cron config** (`vercel.json`):
```json
{
  "crons": [{
    "path": "/api/cron/reconcile-escrow",
    "schedule": "*/5 * * * *"
  }]
}
```

### 5. Contract State Reader
**Modify:** `lib/escrow.ts`

**Add functions:**
```typescript
export async function getEscrowState(contractAddress: `0x${string}`): Promise<number> {
  const { publicClient } = getClients()
  return publicClient.readContract({
    address: contractAddress,
    abi: DEADDROP_ABI,
    functionName: "state"
  })
}

export async function getDepositedAmount(contractAddress: `0x${string}`): Promise<bigint> {
  const { publicClient } = getClients()
  return publicClient.readContract({
    address: contractAddress,
    abi: DEADDROP_ABI,
    functionName: "depositedAmount"
  })
}
```

### 6. Payment Mode Abstraction
**New file:** `lib/payment.ts`

**Purpose:** Abstract custodial vs non-custodial logic so it's swappable later

```typescript
import { getServerWalletAddress } from "./escrow"

type PaymentMode = "custodial" | "non_custodial"

interface GigPaymentInfo {
  contractAddress: string | null
  paymentMode: PaymentMode
  clientWallet: string | null
}

/** Where MoonPay should send ETH */
export function getDepositTarget(gig: GigPaymentInfo): `0x${string}` {
  if (gig.paymentMode === "non_custodial" && gig.clientWallet) {
    return gig.clientWallet as `0x${string}`
  }
  // Custodial: send directly to contract
  return gig.contractAddress as `0x${string}`
}

/** Who is CLIENT role on the contract */
export function getContractClientAddress(gig: GigPaymentInfo): `0x${string}` {
  if (gig.paymentMode === "non_custodial" && gig.clientWallet) {
    return gig.clientWallet as `0x${string}`
  }
  return getServerWalletAddress()
}
```

**Modify:** `prisma/schema.prisma`
```prisma
model Gig {
  // Add these fields
  paymentMode     String   @default("custodial")
  clientWallet    String?
}
```

Run migration: `npx prisma migrate dev --name add_payment_mode`

### 7. Update Pay Page UI
**Modify:** `app/gig/[id]/pay/page.tsx`

**Changes:**
- Replace `handlePay()` with MoonPay widget launch
- Add "Payment Processing" state while waiting for webhook
- Poll `/api/gigs/[id]` to detect when ethAmount is set
- Show success when payment confirmed

### 8. Environment Variables
**Add to `.env.local` and production:**
```
MOONPAY_API_KEY=pk_live_xxx
MOONPAY_SECRET_KEY=sk_live_xxx
MOONPAY_WEBHOOK_SECRET=whsec_xxx
CRON_SECRET=random_secret_for_cron
```

### 9. Remove Server-Side Deposit (Deprecate)
**Modify:** `app/api/gigs/[id]/pay/route.ts`

**Options:**
- A) Delete entirely — MoonPay handles all deposits
- B) Keep as fallback for dev/testing with `ETH_CHAIN=anvil`

Recommend (B): Keep for local dev, disable in production via env check.

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `app/gig/[id]/pay/page.tsx` | Modify | MoonPay widget integration |
| `app/api/gigs/[id]/payment-session/route.ts` | Create | Generate signed widget URL |
| `app/api/webhooks/moonpay/route.ts` | Create | Handle payment confirmation |
| `app/api/cron/reconcile-escrow/route.ts` | Create | Polling safety net |
| `lib/escrow.ts` | Modify | Add state reader functions |
| `lib/moonpay.ts` | Create | Signature helpers |
| `lib/payment.ts` | Create | Mode-aware payment abstractions |
| `prisma/schema.prisma` | Modify | Add paymentMode, clientWallet fields |
| `app/api/requests/[id]/route.ts` | Modify | Use payment abstraction for deploy |
| `vercel.json` | Create/Modify | Cron schedule |
| `.env.local` | Modify | Add MoonPay keys |

## Design for Non-Custodial Migration

The implementation is explicitly designed to support switching to non-custodial later. Key abstractions:

### Database: Add `paymentMode` field
**Modify:** `prisma/schema.prisma`

```prisma
model Gig {
  // ... existing fields
  paymentMode     String   @default("custodial") // "custodial" | "non_custodial"
  clientWallet    String?  // Client's Web3Auth wallet (for non-custodial)
}
```

This allows per-gig flexibility during migration.

### Abstraction Layer: `lib/payment.ts`
**New file** with mode-aware functions:

```typescript
export async function getDepositTarget(gig: Gig): Promise<`0x${string}`> {
  if (gig.paymentMode === "non_custodial") {
    // Non-custodial: MoonPay sends to client wallet, client calls deposit()
    return gig.clientWallet as `0x${string}`
  }
  // Custodial: MoonPay sends directly to contract
  return gig.contractAddress as `0x${string}`
}

export async function getContractClientAddress(gig: Gig): Promise<`0x${string}`> {
  if (gig.paymentMode === "non_custodial") {
    return gig.clientWallet as `0x${string}`
  }
  return getServerWalletAddress()
}
```

### Contract Deployment Changes
**Modify:** `app/api/requests/[id]/route.ts`

When deploying contract, use abstraction:
```typescript
const clientAddress = await getContractClientAddress(gig)
contractAddress = await deployEscrow(clientAddress, freelancerWallet)
```

### MoonPay Widget Target
**In payment session**, use abstraction:
```typescript
const depositTarget = await getDepositTarget(gig)
// Pass depositTarget to MoonPay as walletAddress
```

### Non-Custodial Flow (Future)

```
1. Client connects Web3Auth wallet on profile/gig page
2. Freelancer accepts → contract deployed with client wallet as CLIENT
3. Client clicks Pay → MoonPay sends ETH to client's wallet
4. Client clicks "Fund Escrow" → calls deposit() from their wallet
5. Webhook + polling detect funding (same as custodial)
6. AI verdict → ARBITER (server) calls release() or dispute()
```

The ARBITER role remains with the server for AI-driven resolution. This is the trust model: clients trust the platform's AI to adjudicate fairly.

### Migration Strategy
1. Ship custodial flow first (this plan)
2. Add Web3Auth wallet connection UI to profile
3. Add `paymentMode` toggle for new gigs
4. Existing gigs remain custodial, new gigs can opt into non-custodial
5. Eventually deprecate custodial mode

## Verification

1. **Local testing:**
   - Use MoonPay sandbox mode
   - Trigger test webhook via curl with mock payload
   - Verify DB updates correctly

2. **Integration testing:**
   - Complete MoonPay sandbox purchase
   - Verify webhook arrives and is validated
   - Verify contract receives ETH (on testnet)
   - Verify Request.ethAmount is set

3. **Reconciliation testing:**
   - Manually fund contract (bypass MoonPay)
   - Run `/api/cron/reconcile-escrow`
   - Verify DB catches up to chain state

4. **E2E flow:**
   - Client accepts gig → contract deployed
   - Client clicks Pay → MoonPay widget
   - Complete sandbox payment
   - Webhook fires → DB updated
   - Freelancer submits → AI review
   - Client accepts → release() called
   - Verify freelancer wallet receives ETH

---

## Amendments & Fixes

> Review conducted 2026-03-19. This section addresses issues identified in the original plan.

### Critical Fix 1: MoonPay Sends Raw ETH, Not `deposit()`

**Problem:** MoonPay sends a raw ETH transfer to the target address. The DeadDrop contract requires calling `deposit()` to transition from `Unfunded` → `Funded`. A raw transfer won't work.

**Solution:** Route through server wallet, then call `deposit()`.

**Updated Architecture:**
```
Client clicks Pay → MoonPay widget opens → User pays USD
                                               ↓
                                    MoonPay sends ETH to SERVER WALLET
                                               ↓
                    ┌──────────────────────────┴───────────────────────────┐
                    ↓                                                      ↓
           Webhook: POST /api/webhooks/moonpay              Polling: /api/cron/reconcile
                    ↓                                                      ↓
           Validate signature                                   Check server wallet balance
                    ↓                                                      ↓
           Server calls deposit() on contract               Server calls deposit() if needed
                    ↓                                                      ↓
           Update Request status → FUNDED                   Reconcile DB ↔ chain
```

**Update `lib/payment.ts`:**
```typescript
/** Where MoonPay should send ETH (always server wallet in custodial mode) */
export function getDepositTarget(gig: GigPaymentInfo): `0x${string}` {
  if (gig.paymentMode === "non_custodial" && gig.clientWallet) {
    return gig.clientWallet as `0x${string}`
  }
  // Custodial: MoonPay sends to server wallet, server calls deposit()
  return getServerWalletAddress()
}
```

---

### Critical Fix 2: Webhook Handler Bugs

**Problems:**
1. No null check on `request`
2. `gig` variable undefined
3. No idempotency handling
4. Status field never updated
5. Should return 200 on all parsed requests

**Fixed webhook handler:**
```typescript
import { timingSafeEqual } from "crypto"

export async function POST(req: NextRequest) {
  // 1. Get raw body for signature verification
  const body = await req.text()
  const signature = req.headers.get("Moonpay-Signature")

  // 2. Verify HMAC signature (timing-safe)
  if (!signature || !verifyMoonPaySignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  // 3. Parse event - wrap in try-catch, always return 200 after this point
  try {
    const event = JSON.parse(body)

    // Ignore non-completion events
    if (event.type !== "transaction_completed") {
      return NextResponse.json({ ok: true })
    }

    const transactionId = event.data.id
    const cryptoAmount = event.data.quoteCurrencyAmount // ETH amount
    const walletAddress = event.data.walletAddress

    // 4. Find request by payment session (stored externalTransactionId)
    const request = await prisma.request.findFirst({
      where: {
        paymentSessionId: event.data.externalTransactionId,
        paymentStatus: { not: "funded" } // Idempotency: skip if already funded
      },
      include: { gig: true }
    })

    if (!request) {
      // Either already processed (idempotent) or unknown session
      console.log(`Webhook: No pending request for session ${event.data.externalTransactionId}`)
      return NextResponse.json({ ok: true })
    }

    // 5. Call deposit() on the contract
    const txHash = await depositToEscrow(
      request.gig.contractAddress as `0x${string}`,
      parseEther(cryptoAmount.toString())
    )

    // 6. Update DB with transaction details
    await prisma.request.update({
      where: { id: request.id },
      data: {
        ethAmount: cryptoAmount.toString(),
        paymentStatus: "funded",
        paymentTxHash: txHash,
        moonpayTransactionId: transactionId
      }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    // Log error but return 200 to prevent retry floods
    console.error("Webhook processing error:", error)
    return NextResponse.json({ ok: true })
  }
}

function verifyMoonPaySignature(body: string, signature: string): boolean {
  const secret = process.env.MOONPAY_WEBHOOK_SECRET!
  const expected = createHmac("sha256", secret).update(body).digest()
  const actual = Buffer.from(signature, "base64")

  if (expected.length !== actual.length) return false
  return timingSafeEqual(expected, actual)
}
```

---

### Critical Fix 3: Schema Changes

**Add payment tracking fields to `prisma/schema.prisma`:**
```prisma
model Request {
  // ... existing fields

  // Payment tracking
  paymentStatus       String?   // "pending" | "funded" | "failed"
  paymentSessionId    String?   @unique  // MoonPay externalTransactionId for correlation
  moonpayTransactionId String?  // MoonPay's transaction ID
  paymentTxHash       String?   // On-chain deposit tx hash
}

model Gig {
  // ... existing fields
  paymentMode     String   @default("custodial")
  clientWallet    String?
}
```

**Migration:** `npx prisma migrate dev --name add_payment_tracking`

---

### Fix 4: Reconciliation Improvements

**Problems:**
1. No error isolation per request
2. No concurrency protection
3. Sequential blockchain calls

**Fixed reconciliation:**
```typescript
export async function GET(req: NextRequest) {
  // 1. Verify cron secret (timing-safe)
  const authHeader = req.headers.get("authorization")
  const expected = `Bearer ${process.env.CRON_SECRET}`
  if (!authHeader || !timingSafeCompare(authHeader, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 2. Find pending payments (use SELECT FOR UPDATE SKIP LOCKED pattern)
  const pendingRequests = await prisma.$queryRaw<Request[]>`
    SELECT r.*, g."contractAddress"
    FROM "Request" r
    JOIN "Gig" g ON r."gigId" = g.id
    WHERE r."paymentStatus" = 'pending'
      AND g."contractAddress" IS NOT NULL
    FOR UPDATE SKIP LOCKED
    LIMIT 50
  `

  const results = { reconciled: 0, failed: 0 }

  // 3. Process each with error isolation
  for (const request of pendingRequests) {
    try {
      const state = await getEscrowState(request.contractAddress as `0x${string}`)

      // State enum: 0 = Unfunded, 1 = Funded, 2 = Released, 3 = Disputed
      if (state >= 1) {
        const amount = await getDepositedAmount(request.contractAddress as `0x${string}`)
        await prisma.request.update({
          where: { id: request.id },
          data: {
            ethAmount: formatEther(amount),
            paymentStatus: "funded"
          }
        })
        results.reconciled++
      }
    } catch (error) {
      console.error(`Reconciliation failed for request ${request.id}:`, error)
      results.failed++
      // Continue processing other requests
    }
  }

  return NextResponse.json(results)
}

function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
```

---

### Fix 5: Pay Page Polling Target

**Problem:** Plan says poll `/api/gigs/[id]` but `ethAmount` is on `Request`.

**Fix:** Poll `/api/requests/[id]` or create dedicated endpoint:

**New file:** `app/api/requests/[id]/payment-status/route.ts`
```typescript
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const request = await prisma.request.findUnique({
    where: { id: params.id },
    select: { paymentStatus: true, ethAmount: true }
  })

  if (!request) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(request)
}
```

**Update pay page polling:**
```typescript
// Poll payment status with timeout
const pollPaymentStatus = async (requestId: string, maxAttempts = 60) => {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`/api/requests/${requestId}/payment-status`)
    const data = await res.json()

    if (data.paymentStatus === "funded") {
      return { success: true, ethAmount: data.ethAmount }
    }
    if (data.paymentStatus === "failed") {
      return { success: false, error: "Payment failed" }
    }

    await new Promise(r => setTimeout(r, 3000)) // 3s interval
  }
  return { success: false, error: "Timeout waiting for payment confirmation" }
}
```

---

### Fix 6: Exchange Rate / Slippage Handling

**Problem:** USD amount may convert to different ETH than expected due to market rates.

**Solution:** Store both expected and actual amounts, validate within tolerance.

**Schema addition:**
```prisma
model Request {
  // ... existing
  expectedEthAmount  String?  // What we quoted
  ethAmount          String?  // What we received (may differ due to slippage)
}
```

**Validation in webhook:**
```typescript
const expectedEth = parseFloat(request.expectedEthAmount || "0")
const actualEth = parseFloat(cryptoAmount)
const slippagePct = Math.abs(expectedEth - actualEth) / expectedEth * 100

if (slippagePct > 5) { // 5% tolerance
  console.warn(`High slippage on request ${request.id}: expected ${expectedEth}, got ${actualEth}`)
  // Could flag for manual review or auto-refund
}
```

---

### Fix 7: Missing Error Flows

**Add to webhook handler - handle failures:**
```typescript
// Handle failed/cancelled transactions
if (event.type === "transaction_failed" || event.type === "transaction_cancelled") {
  const request = await prisma.request.findFirst({
    where: { paymentSessionId: event.data.externalTransactionId }
  })

  if (request) {
    await prisma.request.update({
      where: { id: request.id },
      data: {
        paymentStatus: "failed",
        paymentFailureReason: event.data.failureReason || "cancelled"
      }
    })
  }
  return NextResponse.json({ ok: true })
}
```

---

### Updated File Summary

| File | Action | Purpose |
|------|--------|---------|
| `app/gig/[id]/pay/page.tsx` | Modify | MoonPay widget + status polling |
| `app/api/gigs/[id]/payment-session/route.ts` | Create | Generate signed widget URL, store session ID |
| `app/api/webhooks/moonpay/route.ts` | Create | Handle payment events, call `deposit()` |
| `app/api/cron/reconcile-escrow/route.ts` | Create | Polling safety net with error isolation |
| `app/api/requests/[id]/payment-status/route.ts` | Create | Payment status polling endpoint |
| `lib/escrow.ts` | Modify | Add `depositToEscrow()`, state readers |
| `lib/moonpay.ts` | Create | Signature verification (timing-safe) |
| `lib/payment.ts` | Create | Mode-aware abstractions (send to server wallet) |
| `prisma/schema.prisma` | Modify | Add payment tracking fields |
| `vercel.json` | Create/Modify | Cron schedule |

---

### Open Questions

1. **Refund flow:** If MoonPay transaction completes but `deposit()` fails, how do we handle? Manual refund via MoonPay dashboard?

2. **Partial payments:** If slippage is too high, do we reject and refund, or proceed with reduced amount?

3. **Contract not deployed:** What if client clicks Pay before freelancer accepts (no contract yet)? Should payment session endpoint check this?
