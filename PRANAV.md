## Changes made so far

- Added a new `deaddrop/` workspace for the project.
- Set up a `pnpm` workspace and root scripts for running the frontend (`dev`, `build`, `lint`).
- Added shared environment templates and ignore rules for local env files, build output, caches, and contract artifacts.

## Smart contract work

- Initialized a Foundry project under `deaddrop/contracts/`.
- Added `forge-std` as a git submodule dependency.
- Created `DeadDrop.sol`, an escrow-style contract with:
  - immutable `CLIENT` and `FREELANCER` addresses
  - deposit, release, and dispute flows
  - custom errors and events
  - escrow states: `Unfunded`, `Funded`, `Released`, `Disputed`
- Added a Foundry deploy script at `deaddrop/contracts/script/Deploy.s.sol`.
- Added Foundry tests covering deposit, release permissions, payout, dispute handling, and double-release protection.
- Added `foundry.toml` configured to read the RPC endpoint from `NEXT_PUBLIC_RPC_URL`.

## Frontend work

- Added a Next.js app under `deaddrop/web/`.
- Installed and configured the core dependencies:
  - `next`
  - `react` / `react-dom`
  - `wagmi`
  - `viem`
  - `openai`
  - `@tanstack/react-query`
- Added a basic landing page that:
  - shows the current environment preview
  - explains the setup steps
  - describes the app as a Next.js + wagmi + viem + OpenAI workspace
- Added base app metadata and global styling files.

## Docs and setup

- Added `deaddrop/README.md` describing the workspace structure, install steps, environment variables, and deployment flow.
- Added `.env.example` files for both the workspace root and contracts/frontend setup.

## Current state in git

- The `deaddrop/` directory is mostly new and currently untracked.
- `.gitmodules` and `deaddrop/contracts/lib/forge-std` have been added for the Foundry submodule.
- There are also some generated/local files present in the working tree, including `.next/`, Foundry cache output, `.DS_Store`, and swap files.
