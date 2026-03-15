# Lockstep Setup

## Prerequisites

- Node.js 18+, npm
- Python 3.9.6
- Docker & Docker Compose
- Foundry (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)

---

## 1. Environment

Create `.env.local` in the repo root:

```
DATABASE_URL=postgresql://lockstep:lockstep@localhost:5432/lockstep
ANTHROPIC_API_KEY=sk-ant-...
ETH_RPC_URL=http://localhost:8545
ETH_CHAIN=anvil
DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

> `DEPLOYER_PRIVATE_KEY` above is Anvil's default account #0 — safe for local dev only.

---

## 2. Infrastructure (Postgres + Anvil + Backend)

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on `localhost:5432`
- **Anvil** (local EVM) on `localhost:8545`
- **FastAPI backend** on `localhost:8000`

---

## 3. Frontend

```bash
npm install
npx prisma migrate deploy   # apply migrations
npm run db:seed             # seed users, gigs, requests
npm run dev                 # starts Next.js on localhost:3000
```

---

## 4. Seed accounts

All accounts use password `12345678`.

| Name | Email | Role |
|------|-------|------|
| Alex Chen | alex@giggle.dev | client |
| Maya Brooks | maya@giggle.dev | client |
| Riley Gomez | riley@giggle.dev | client |
| Jordan Kim | jordan@giggle.dev | freelancer |
| Sam Patel | sam@giggle.dev | freelancer |
| Taylor Nguyen | taylor@giggle.dev | freelancer |
| Casey Rivera | casey@giggle.dev | freelancer |
| Client Account | client@giggle.dev | client |
| Freelancer Account | freelancer@giggle.dev | freelancer |

---

## 5. Reset database

```bash
npm run db:reset   # drops, re-migrates, and re-seeds
```

---

## Services at a glance

| Service | URL |
|---------|-----|
| Next.js frontend | http://localhost:3000 |
| FastAPI backend | http://localhost:8000 |
| Anvil RPC | http://localhost:8545 |
| PostgreSQL | localhost:5432 |
