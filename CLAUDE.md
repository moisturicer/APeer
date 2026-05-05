# CLAUDE.md — APeer Project Instructions

This file is read by Claude at the start of every AI-assisted session on this project.
It tells Claude exactly how to behave, what the stack is, and what is off-limits.
All team members should use this file when starting an AI session on APeer.

---

## What APeer Is

APeer is a **decentralized academic publishing platform on Cardano**. Researchers publish papers immutably to IPFS, earn and stake **peerA** tokens through peer review, and build on-chain reputations no institution can revoke. Disputes, grants, and governance are executed automatically via smart contracts. Every paper is freely readable by anyone — no wallet required to read.

---

## Repo Structure

```
apeer/
├── client/               # React + TypeScript frontend (Vite)
│   └── src/
│       ├── components/   # Shared UI components
│       ├── pages/        # Route-level pages
│       ├── hooks/        # Custom React hooks
│       ├── lib/          # API client helpers, utilities
│       └── types/        # Shared TypeScript types
├── server/               # Bun + Hono backend API
│   └── src/
│       ├── routes/       # API route handlers
│       ├── middleware/   # Auth, rate-limiting (future)
│       └── lib/          # Blockfrost wrapper, utilities
├── contracts/            # Aiken smart contracts (Increment 3+)
├── docs/                 # QA checklists, extended docs
├── scripts/              # bootstrap.sh and dev tooling
└── CLAUDE.md             # This file
```

---

## Confirmed Tech Stack

Only use these. Do not introduce alternatives without team discussion.

| Layer | Technology | Notes |
|---|---|---|
| Blockchain | Cardano | Preprod testnet for dev, Mainnet for launch |
| Smart Contracts | Aiken | Compiles to Plutus; do not write raw Plutus |
| Governance | CIP-1694 | Native Cardano on-chain governance standard |
| Token | peerA | Cardano native token — not an ERC-20 |
| Storage | IPFS (Kubo / web3.storage) | Content-addressed, immutable |
| On-chain Anchoring | CIP-25 / CIP-68 metadata | Timestamps IPFS CID on-chain |
| Frontend | React 18 + TypeScript + Vite | No Next.js, no Remix |
| Wallet | CIP-30 via Mesh.js | Supports Eternl, Nami, Lace, Flint |
| Indexer | Blockfrost (primary) | Ogmios + Kupo as fallback |
| Backend | Bun + Hono | Minimal API; not Express, not Fastify |
| Package Manager | Bun | Not npm, not yarn — always `bun` |

---

## Terminology — Use Exactly as Written

These terms must be consistent across all code, comments, docs, and UI copy.
Claude should correct any drift from these definitions.

| Term | Correct Usage |
|---|---|
| **peerA** | Always lowercase `p`, capital `A`. Never "PeerA", "PEERA", or "the token" |
| **Staking** | Locking peerA into a smart contract. Not Cardano's ADA block-reward staking |
| **Slashing** | Automatic confiscation of staked peerA for bad-faith behavior |
| **IPFS CID** | The immutable content hash of a paper stored on IPFS |
| **On-chain Anchoring** | Writing an IPFS CID into a Cardano transaction as proof of existence |
| **Reputation Score** | Wallet-linked, on-chain metric — not a centralized score |
| **Dispute** | A formal challenge to a paper, initiated by staking peerA |
| **Blind Review** | Review where reviewer identity is hidden from the author |
| **DAO Treasury** | Smart-contract-held peerA pool, governed by community vote |
| **Milestone Release** | Grant disbursement in tranches, enforced by smart contract |

---

## What Is Explicitly Out of Scope for v1

If a task would require any of these, flag it and stop — do not build it.

- Paid access tiers, paywalls, or subscriptions
- Institutional accounts or SSO (authentication is wallet-only)
- Email notifications or editorial dashboards (review flow is on-chain only)
- PDF rendering or in-browser annotation (reading links out to IPFS)
- Multi-chain support (Cardano only — no Ethereum, Solana, or L2 bridges)
- AI-assisted review scoring (all judgments are human + community vote)
- DOI registration or legacy journal integration
- Native mobile apps (iOS / Android) — responsive web only

---

## Increment Roadmap

Understand which increment is active before writing any code.
Do not implement features from a future increment unless explicitly asked.

| # | Increment | Focus |
|---|---|---|
| 1 | Base UI & Wallet Connection | React scaffold, CIP-30 wallet connect, Blockfrost API, base design |
| 2 | Paper Submission & IPFS | Upload flow, IPFS pinning, on-chain CID anchoring |
| 3 | Peer Review & peerA Staking | Review assignment, staking logic, Aiken contracts |
| 4 | Disputes & DAO Governance | Dispute flow, community jury, CIP-1694 governance |
| 5 | Reputation & Discovery | Reputation scores, paper discovery, search |

**Current increment: 1**

---

## Development Commands

```bash
# First-time setup
bash scripts/bootstrap.sh

# Start everything
bun run dev

# Separately
bun run dev:client    # React → http://localhost:5173
bun run dev:server    # API  → http://localhost:3000

# Verify backend + Blockfrost
curl http://localhost:3000/api/health
```

---

## Environment Variables

Only `server/.env` holds secrets. Never commit it.
Copy from `server/.env.example` and fill in:

```
BLOCKFROST_PROJECT_ID=preprod<your_key>   # from blockfrost.io, preprod project
PORT=3000
NODE_ENV=development
```

Blockfrost keys must start with `preprod` during development.

---

## API Endpoints (Increment 1)

| Method | Path | Status |
|---|---|---|
| GET | `/api/health` | Live |
| GET | `/api/wallet/:address` | Live |
| GET | `/api/papers` | Stubbed (Increment 2) |
| GET | `/api/papers/:cid` | Stubbed (Increment 2) |

---

## Coding Conventions

### TypeScript
- Strict mode is on — no `any`, no `// @ts-ignore` without a comment explaining why
- All shared types live in `client/src/types/index.ts` or `server/src/types/` — do not define ad-hoc types inline
- Use named exports for components; default exports for pages and route modules

### React
- Hooks go in `client/src/hooks/` — one hook per file, named `use<Thing>.ts`
- No class components
- No inline styles — use CSS modules or CSS variables from `index.css`
- Keep components under ~150 lines; extract if longer

### Hono (backend)
- Each route group gets its own file in `server/src/routes/`
- All responses follow `{ success: boolean, data?: T, error?: string }`
- Log Blockfrost errors with context; never swallow them silently

### Aiken (contracts — Increment 3+)
- One validator per file
- All slash parameters must be DAO-configurable — no hardcoded values
- Every validator needs property-based tests before it touches Preprod

### Git
- Branch prefix: `feat/`, `fix/`, `chore/`, `docs/`
- Commit messages: imperative mood — "Add wallet hook" not "Added wallet hook"
- No direct commits to `main`

---

## Claude's Behavior on This Project

### Priority: Balance speed with consistency
Claude should help the team move fast while keeping the codebase consistent with the brief.
- If a pragmatic shortcut is safe and reversible, suggest it — but name the trade-off explicitly
- If a shortcut would violate the confirmed tech stack, go out of scope, or create a hard-to-undo pattern, push back and explain why
- When in doubt: note the concern, offer both the fast path and the correct path, and let the team decide

### Always
- Use the exact terminology from the glossary above — flag and correct any drift
- Respect the current increment boundary — if a feature belongs to a later increment, say so and offer to note it for later
- Keep Cardano-specific reasoning accurate: eUTxO model, native tokens, CIP standards
- Write TypeScript with strict mode assumptions throughout

### Before changing an existing file
- State which file you are about to modify and summarise what will change
- Wait for confirmation before making the edit
- Exception: if the user says "just do it" or "go ahead" — proceed directly

### Before adding a new dependency
- Name the package, explain why it is needed, and flag any known conflicts with the existing stack (especially Bun compatibility and native binary deps)
- Wait for confirmation before adding it to any `package.json`
- Exception: if the user explicitly names the package and says to add it — proceed directly

### Never
- Suggest Ethereum/Solana patterns or libraries — this is Cardano
- Propose paywalls, SSO, or any out-of-scope v1 feature
- Write raw Plutus — use Aiken
- Use `npm` or `yarn` — always `bun`
- Introduce a new framework (no Next.js, no Express, no Prisma) without explicit team approval

---

## Key Technical Risks to Keep in Mind

1. **Slashing logic correctness** — smart contract bugs here can drain the treasury or harm honest reviewers. Always push for property-based tests and audits before mainnet.
2. **IPFS link rot** — IPFS does not guarantee permanence. Every paper submission flow must include pinning service integration; the on-chain CID is the recovery anchor.
3. **Cold start / review participation** — staked review requires peerA. Genesis reviewer allocation and observer review tier are the planned mitigations; don't design flows that assume a liquid token market at launch.

---

*Keep this file in sync with `APeer_Master_Brief_v1_0.md`. When the brief version bumps, update CLAUDE.md to match.*