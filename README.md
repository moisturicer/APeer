# APeer

**Decentralized Academic Publishing on Cardano**

APeer removes institutional gatekeepers by letting researchers publish papers immutably to IPFS, earn and stake **peerA** tokens through peer review, and build on-chain reputations no institution can revoke.

---

## Repository Structure

```
apeer/
├── client/                  # React + TypeScript frontend (Vite)
│   └── src/
│       ├── components/      # Shared UI components
│       ├── pages/           # Route-level page components
│       ├── hooks/           # Custom React hooks (wallet, Blockfrost)
│       ├── lib/             # Utilities and API client helpers
│       └── types/           # Shared TypeScript type definitions
│
├── server/                  # Node.js / Bun backend (Hono)
│   └── src/
│       ├── routes/          # API route handlers
│       │   ├── health.ts    # GET /api/health
│       │   ├── wallet.ts    # GET /api/wallet/:address
│       │   └── papers.ts    # GET /api/papers (stubbed)
│       ├── middleware/      # Auth, rate-limiting (future)
│       └── lib/
│           └── blockfrost.ts  # Blockfrost SDK wrapper
│
├── contracts/               # Aiken smart contracts (Increment 3+)
├── docs/                    # Extended documentation
├── scripts/
│   └── bootstrap.sh         # One-time local setup script
│
├── .gitignore
└── package.json             # Bun workspace root
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Cardano (Preprod testnet → Mainnet) |
| Smart Contracts | Aiken |
| Token | peerA (Cardano native token) |
| Storage | IPFS via Pinata |
| Frontend | React 18 + TypeScript + Vite |
| Wallet | CIP-30 via Mesh.js (Eternl, Nami, Lace) |
| Backend | Bun + Hono |
| Indexer | Blockfrost |
| Package Manager | Bun (workspaces) |

---

## Prerequisites

| Tool | Min Version | Install |
|---|---|---|
| [Bun](https://bun.sh) | 1.1+ | `curl -fsSL https://bun.sh/install \| bash` |
| [Git](https://git-scm.com) | Any recent | OS package manager |
| Blockfrost API key | — | [blockfrost.io](https://blockfrost.io) → create **Cardano preprod** project |

---

## Quick Start

### 1. Clone and bootstrap

```bash
git clone https://github.com/YOUR_ORG/apeer.git
cd apeer
bash scripts/bootstrap.sh
```

The bootstrap script will:
- Verify Bun is installed
- Run `bun install` across all workspaces
- Copy `server/.env.example` → `server/.env`

### 2. Add your Blockfrost key

Open `server/.env` and replace the placeholder:

```env
BLOCKFROST_PROJECT_ID=preprodYOUR_KEY_HERE
```

> Get a free key at [blockfrost.io](https://blockfrost.io).  
> Create a **Cardano preprod** project — NOT mainnet.

### 3. Start development servers

```bash
# Both servers together (recommended)
bun run dev

# Or separately:
bun run dev:server   # API → http://localhost:3000
bun run dev:client   # UI  → http://localhost:5173
```

### 4. Verify the setup

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "services": {
    "blockfrost": { "ok": true, "network": "preprod", "latestBlock": 12345678 }
  }
}
```

If `blockfrost.ok` is `false`, check your `.env` key.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Server + Blockfrost connectivity check |
| `GET` | `/api/wallet/:address` | ADA balance for a Cardano address |
| `GET` | `/api/papers` | Paper index (stubbed — Increment 2) |
| `GET` | `/api/papers/:cid` | Paper by IPFS CID (stubbed — Increment 2) |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `BLOCKFROST_PROJECT_ID` | ✅ Yes | Blockfrost preprod project ID |
| `PORT` | No (default: 3000) | API server port |
| `NODE_ENV` | No (default: development) | Runtime environment |
| `PINATA_JWT` | No (Increment 2) | Pinata JWT for IPFS pinning |

See `server/.env.example` for the full template.

---

## Increment Roadmap

| # | Increment | Status |
|---|---|---|
| 1 | Base UI & Wallet Connection | 🔄 In Progress |
| 2 | Paper Submission & IPFS Storage | ⏳ Planned |
| 3 | Peer Review & peerA Staking | ⏳ Planned |
| 4 | Disputes & DAO Governance | ⏳ Planned |
| 5 | Reputation & Discovery | ⏳ Planned |

---

## Glossary

| Term | Definition |
|---|---|
| **peerA** | Platform native token (lowercase `p`, capital `A`). Used for staking, rewards, slashing, and governance. |
| **IPFS CID** | Content Identifier — immutable hash of a paper stored on IPFS, anchored on-chain. |
| **On-chain Anchoring** | Recording an IPFS CID in a Cardano transaction as tamper-proof proof of existence. |
| **Slashing** | Automatic confiscation of staked peerA from bad-faith reviewers or disputants. |
| **DAO Treasury** | Smart-contract-held peerA pool governed by community vote. |

---

## Contributing

1. Branch from `main` — use `feat/`, `fix/`, or `chore/` prefixes
2. Follow the [Increment roadmap](#increment-roadmap) — don't build out-of-scope features
3. Keep commits atomic and descriptive
4. QA tests all PRs against the [testing checklist](docs/qa-checklist.md) before merge

---

*For the full project brief, see [APeer_Master_Brief_v1_0.md](./APeer_Master_Brief_v1_0.md).*
