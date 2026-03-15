# Giggle — Claude Code Guidelines

Giggle is a trustless freelancer payment platform. The AI layer evaluates deliverables against agreed scope and drives escrow release/dispute on a smart contract. Understand the full stack before touching any layer.

---

## Project Structure

```
giggle/
├── app/              # Next.js 16 frontend (App Router)
├── lib/              # Shared utilities, Prisma client, auth helpers
├── prisma/           # Schema (PostgreSQL), migrations, seed
├── backend/          # Python FastAPI — AI agent pipeline
│   └── agents/       # 4 agents: scope_parser, deliverable_analyzer, verdict_agent, mediator
└── deaddrop/
    ├── contracts/    # Solidity escrow contract (Foundry)
    └── web/          # Separate Next.js app for the deaddrop flow
```

---

## Frontend (Next.js)

- **Framework:** Next.js 16, App Router, React 19, TypeScript
- **Styling:** Tailwind CSS v4 only. No CSS modules, no inline styles, no styled-components.
- **Components:** shadcn/ui components from `components/ui/`. Do not install additional UI libraries.
- **Forms:** react-hook-form + zod. Do not use uncontrolled form state or fetch inside form handlers directly.
- **Data fetching:** Server Components for reads where possible. Client components only when interactivity requires it. Do not add SWR or React Query to the main app.
- **Auth:** JWT via `jose`. Sessions stored in HTTP-only cookies. Do not use NextAuth or any auth library.
- **API routes:** All backend calls go through `app/api/` route handlers. Never call the FastAPI backend directly from client components — proxy through Next.js API routes.
- **Icons:** lucide-react only.
- **No new dependencies** without a clear reason. Check `package.json` before suggesting an install.

---

## Backend (FastAPI / AI Agents)

- **Python version:** 3.9.6 (system). All files must include `from __future__ import annotations` as the first line to support `X | Y` and `list[X]` type syntax.
- **Framework:** Python FastAPI + uvicorn. Entry point: `backend/main.py`.
- **No agent frameworks.** No LangChain, LangGraph, CrewAI, AutoGen, or any orchestration library. Each agent is a single `async def` function that calls the Anthropic API directly.
- **AI model:** `claude-sonnet-4-20250514` only. Do not change the model without explicit instruction.
- **Temperature:** Always `0` for all agent calls. Evaluations must be deterministic.
- **Structured output:** Every agent returns a validated Pydantic model. The shared `call_agent()` helper in `agents/__init__.py` handles JSON parsing, markdown-fence stripping, and one retry. Use it for every agent — do not write raw API calls in individual agent files.
- **Word counting:** Always compute word counts in Python (`len(text.split())`), inject as a fact into the prompt. Never ask the LLM to count words.
- **Agent pipeline:** Sequential — scope_parser → deliverable_analyzer → verdict_agent → (optional) mediator. Do not parallelize agents.
- **Models:** All Pydantic schemas live in `backend/models.py`. Do not define schemas inline in agent files.
- **CORS:** FastAPI allows `http://localhost:3000` only.
- **Error handling:** Agents must catch exceptions and raise `HTTPException` with a meaningful detail string. Never let a raw Python exception surface through the API.

---

## Database (PostgreSQL + Prisma)

- **Database:** PostgreSQL via Docker (`docker-compose.yml` at repo root). Do not use SQLite.
- **ORM:** Prisma v7 with native PostgreSQL driver. No adapter (removed `@prisma/adapter-libsql`). The client is at `lib/generated/prisma/`.
- **Schema changes:** Always modify `prisma/schema.prisma` and create a migration with `prisma migrate dev`. Do not use `prisma db push` except in a fresh dev environment.
- **Client:** Import from `lib/db.ts` — it exports a singleton `prisma` instance. Do not instantiate `PrismaClient` anywhere else.
- **Seed:** `prisma/seed.ts` — run with `npm run db:seed`. Contains 3 users, 12 gigs, 8 requests. Keep seed data realistic.
- **No raw SQL** unless Prisma cannot express the query. If raw SQL is necessary, use `prisma.$queryRaw` with tagged template literals (not string interpolation — SQL injection risk).

---

## Blockchain (Solidity / Foundry)

- **Contract:** `deaddrop/contracts/src/DeadDrop.sol` — a minimal escrow with `deposit`, `release`, and `dispute` functions. States: `Unfunded → Funded → Released | Disputed`.
- **Compiler:** Solidity `^0.8.28`. Do not downgrade.
- **Toolchain:** Foundry only. Do not introduce Hardhat or Truffle.
- **Testing:** All contract changes require Foundry tests in `deaddrop/contracts/test/`. Tests must cover the happy path, permission errors (`OnlyClient`, `OnlyParticipant`), and invalid state transitions.
- **No upgradeable proxies.** The contract is intentionally minimal and immutable.
- **Custom errors only.** No `require` with string messages — use the existing custom errors or add new ones following the same pattern.
- **Do not add payable fallbacks or receive functions** unless explicitly asked.
- **Deploy script:** `deaddrop/contracts/script/Deploy.s.sol`. Update it if constructor args change.
- **No on-chain AI.** The AI verdict is computed off-chain; the contract trusts the client to call `release()` or `dispute()` based on the AI result. Do not add oracle patterns unless explicitly scoped.

---

## AI Model Integration

- **SDK:** `anthropic` Python SDK (`anthropic.AsyncAnthropic`). No OpenAI SDK in the backend.
- **System prompts:** Always passed via the `system=` parameter, never prepended to the user message.
- **Token budget:** `MAX_TOKENS = 4096`. Do not increase without profiling — the mediator already sends the most context.
- **Truncation:** If a deliverable exceeds 3000 words in the mediator, truncate with a note. Do not silently truncate anywhere else.
- **Retries:** One automatic retry on JSON parse failure (built into `call_agent()`). Do not add more retries — if it fails twice, surface the error.
- **No streaming** in the current pipeline. Agents return complete responses.
- **Model config** lives in `backend/config.py`. Do not hardcode model strings or token limits in agent files.
