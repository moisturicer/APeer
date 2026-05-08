# APeer — Backend Software Requirements Specification
**Version:** 1.1 | **Date:** 2026-05-08 | **Audience:** Backend developer

---

## 1. Purpose & Scope

### What the backend owns

The APeer backend is a thin API bridge. Its responsibilities are:

- Proxying and transforming Blockfrost queries so the frontend never holds a Blockfrost project key
- Receiving paper submissions, uploading files to IPFS, and pinning them via Pinata
- Returning the IPFS CID to the frontend so the frontend can build and sign the on-chain anchoring transaction locally
- Maintaining an off-chain index of papers and reviews that would be too expensive to reconstruct from chain queries on every request
- Verifying CIP-30 wallet signatures on write endpoints so only the address owner can submit or review

### What the backend does NOT own

| Concern | Owner |
|---|---|
| Building or signing transactions | Frontend (Mesh.js + CIP-30 wallet) |
| Submitting transactions to Cardano | Frontend submits directly, or Blockfrost `/tx/submit` |
| Smart contract logic (staking, slashing) | Aiken validators |
| Consensus and finality | Cardano protocol |
| IPFS content delivery / retrieval | IPFS network / gateway |
| Wallet key management | User's CIP-30 wallet |
| peerA token minting policy | Aiken minting validator |

The backend never holds private keys and never submits transactions on behalf of users.

---

## 2. API Endpoints

All responses use the envelope already established in `server/src/routes/`:

```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: string }
```

HTTP status codes carry semantic meaning: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Server Error.

---

### 2.1 Health

#### `GET /api/health`

**Status:** Implemented.

**Purpose:** Confirm the API is alive and Blockfrost is reachable.

**Auth:** None.

**Response `200`:**
```typescript
{
  success: true,
  data: {
    status: 'ok',
    timestamp: string,          // ISO 8601
    version: string,            // package.json version
    network: 'cardano-preprod',
    services: {
      blockfrost: {
        ok: boolean,
        network: string,
        latestBlock?: number,
        error?: string
      }
    }
  }
}
```

**Notes:** Calls `blockfrost.blocksLatest()`. If Blockfrost is unreachable, `services.blockfrost.ok` is `false` and the overall status is still `200` — the API itself is up.

---

### 2.2 Wallet

#### `GET /api/wallet/:address`

**Status:** Implemented.

**Purpose:** Return ADA balance, peerA balance, and stake address for a given Cardano address.

**Auth:** None. Read-only public endpoint.

**Path params:**
| Param | Type | Validation |
|---|---|---|
| `address` | `string` | Must begin with `addr` (base/enterprise) or `stake` |

**Response `200`:**
```typescript
{
  success: true,
  data: {
    address: string,
    balance: {
      lovelace: string,   // raw integer string, e.g. "5000000"
      ada: string,        // lovelace / 1_000_000, 2 decimal places
      peerA: string       // quantity of peerA native token; "0" until policy ID is deployed
    },
    stakeAddress: string | null,
    network: 'preprod',
    note?: string         // e.g. "Address has no transaction history"
  }
}
```

**Response `400`:** Invalid address format.

**Response `404`:** Address not found on chain (new address, no UTxOs).

**Notes:**
- peerA balance lookup requires the deployed policy ID. Use env var `PEERA_POLICY_ID`. In dev, a placeholder policy ID is set in `.env.example` for testing; it will never match any real token but allows the lookup path to be exercised. **This placeholder must be replaced with the real policy ID before mainnet deployment.**
- Address with no history returns a zeroed balance object with `note`, not a 404, matching current behaviour.

---

### 2.3 Papers

#### `GET /api/papers`

**Status:** Stubbed — returns `[]`.

**Purpose:** Return a paginated, filterable list of published papers.

**Auth:** None.

**Query params:**
| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | `number` | `1` | 1-indexed |
| `limit` | `number` | `20` | Max `100` |
| `tag` | `string` | — | Filter by tag slug |
| `author` | `string` | — | Filter by Cardano address |
| `status` | `'Reviewed' \| 'Under Review' \| 'Awaiting Review'` | — | Filter by paper status |
| `sort` | `'latest' \| 'most_cited' \| 'highest_reward'` | `'latest'` | Matches DiscoverPage sort options |
| `q` | `string` | — | Full-text search on title + abstract |

**Response `200`:**
```typescript
{
  success: true,
  data: {
    papers: Paper[],
    total: number,
    page: number,
    limit: number
  }
}
```

Where `Paper` matches the type in `client/src/types.ts`:
```typescript
{
  id: string,               // IPFS CID (canonical identifier)
  title: string,
  abstract: string,
  authors: Author[],
  ipfsHash: string,         // same as id
  date: string,             // ISO 8601, on-chain anchor tx timestamp
  tags: string[],
  status: 'Reviewed' | 'Under Review' | 'Awaiting Review',
  reviewCount: number,
  views: number,            // incremented server-side on each GET /api/papers/:cid call
  citations: number,        // count of papers referencing this CID
  rewardPool: number        // peerA staked in the paper's review reward pool
}
```

**Notes:** `views` is incremented server-side on each `GET /api/papers/:cid` call. `citations` requires off-chain indexing (see §5).

---

#### `GET /api/papers/:cid`

**Status:** Stubbed — returns `501`.

**Purpose:** Return full metadata for a single paper by IPFS CID.

**Auth:** None.

**Path params:**
| Param | Type | Notes |
|---|---|---|
| `cid` | `string` | Valid IPFS CIDv1 or CIDv0 |

**Response `200`:**
```typescript
{
  success: true,
  data: Paper  // full Paper object including reviews array
}
```

**Notes:**
- Increment `views` counter in the off-chain index on each call.
- The `id` field of a paper is its IPFS CID. The frontend uses `/papers/:paperId` as its route, so `:cid` and `:paperId` are the same value.

---

#### `POST /api/papers`

**Status:** Not implemented.

**Purpose:** Accept a paper file from the frontend, pin it to IPFS, return the CID so the frontend can anchor it on-chain.

**Auth:** Wallet signature required (see §6).

**Request (multipart/form-data):**
| Field | Type | Required | Notes |
|---|---|---|---|
| `file` | `File` (PDF) | Yes | Max size: `[ASSUMPTION: 50 MB]` |
| `title` | `string` | Yes | |
| `abstract` | `string` | Yes | |
| `tags` | `string` (JSON array) | Yes | Parsed server-side |
| `authors` | `string` (JSON array of addresses) | Yes | Must include submitter's address |
| `reviewMode` | `'open' \| 'blind'` | Yes | From SubmitPage step 2 |
| `walletAddress` | `string` | Yes | Submitting author's Cardano address |
| `signature` | `string` | Yes | CIP-30 signature over the nonce (see §6) |
| `nonce` | `string` | Yes | Nonce retrieved from `/api/auth/nonce` |

**Response `201`:**
```typescript
{
  success: true,
  data: {
    cid: string,            // IPFS CIDv1 of the uploaded PDF
    pinned: boolean,        // true if pinning service confirmed
    metadataForTx: {        // pre-built CIP-25 metadata for frontend to attach to tx
      "721": {
        [policyId: string]: {
          [assetName: string]: {
            name: string,
            description: string,
            ipfs: string,   // "ipfs://<cid>"
            authors: string[],
            tags: string[],
            reviewMode: string
          }
        }
      }
    }
  }
}
```

**Notes:**
- The backend does **not** submit the transaction. It returns `metadataForTx` so the frontend (Mesh.js) can attach it to the minting transaction and sign with the user's wallet.
- After the frontend submits the tx, it calls `POST /api/papers/:cid/confirm` (see below) with the tx hash.
- On IPFS upload failure, return `500` — do not return a partial CID.

---

#### `POST /api/papers/:cid/confirm`

**Status:** Not implemented.

**Purpose:** Record the on-chain tx hash after the frontend successfully submits the anchoring transaction.

**Auth:** Wallet signature required.

**Request body (`application/json`):**
```typescript
{
  txHash: string,       // Cardano transaction hash
  walletAddress: string,
  signature: string,
  nonce: string
}
```

**Response `200`:**
```typescript
{
  success: true,
  data: {
    cid: string,
    txHash: string,
    status: 'pending_confirmation'  // transitions to 'Awaiting Review' once tx confirmed
  }
}
```

**Notes:** The backend should start polling for tx confirmation (see §4.3). Status transitions to `'Awaiting Review'` once `confirmation_depth >= 3` blocks.

---

### 2.4 Reviews

> Increment 3. Define now; implement then.

#### `GET /api/papers/:cid/reviews`

**Auth:** None.

**Purpose:** Return all reviews for a paper.

**Response `200`:**
```typescript
{
  success: true,
  data: Review[]
}
```

Where `Review` matches `client/src/types.ts`:
```typescript
{
  id: string,
  paperId: string,            // IPFS CID
  reviewerAddress: string,
  text: string,               // [ASSUMPTION] plaintext or Markdown
  rewardEarned: number,       // peerA earned for this review
  helpfulVotes: number,
  isSlashed: boolean
}
```

**Notes:** `isSlashed` is sourced from the staking contract state, indexed off-chain.

---

#### `POST /api/papers/:cid/reviews`

**Auth:** Wallet signature required.

**Purpose:** Submit a review text after the reviewer has staked peerA on-chain.

**Request body:**
```typescript
{
  reviewerAddress: string,
  text: string,
  stakesTxHash: string,     // tx hash proving peerA was staked
  signature: string,
  nonce: string
}
```

**Response `201`:**
```typescript
{
  success: true,
  data: { reviewId: string }
}
```

**Notes:** Backend must verify `stakesTxHash` is confirmed on-chain before accepting the review text. `[ASSUMPTION]` Reviewer must not have already submitted a review for this paper.

---

#### `POST /api/reviews/:reviewId/vote`

**Auth:** Wallet signature required.

**Purpose:** Record a "helpful" vote on a review.

**Request body:**
```typescript
{
  voterAddress: string,
  vote: 'helpful' | 'unhelpful',
  signature: string,
  nonce: string
}
```

**Response `200`:**
```typescript
{
  success: true,
  data: { helpfulVotes: number }
}
```

**Notes:** `[ASSUMPTION]` One vote per wallet address per review; enforce server-side.

---

### 2.5 Authentication

#### `GET /api/auth/nonce`

**Auth:** None.

**Purpose:** Issue a one-time nonce for a wallet address to sign. Required before any wallet-authenticated write.

**Query params:**
| Param | Type |
|---|---|
| `address` | `string` |

**Response `200`:**
```typescript
{
  success: true,
  data: {
    nonce: string,      // random UUID or hex string
    expiresAt: string   // ISO 8601, 5 minutes from issuance
  }
}
```

**Notes:** Store nonce server-side keyed by address. Invalidate on use or expiry.

---

## 3. IPFS Integration

### 3.1 Upload flow

1. Frontend POSTs a PDF to `POST /api/papers` as `multipart/form-data`.
2. Backend streams the file to Pinata via the Pinata API (`PINATA_JWT` env var).
3. Pinning service returns a CIDv1.
4. Backend confirms the pin is queued/active before responding.
5. Backend returns the CID to the frontend in `201` response.

### 3.2 Pinning strategy

- **Provider:** Pinata (`PINATA_JWT` env var). Use the Pinata REST API (`/pinning/pinFileToIPFS`).
- **Retry policy:** 2 retries with 2-second backoff on transient errors (5xx from Pinata). Hard fail on 4xx (bad payload).
- Do not return a CID to the frontend unless the pin is confirmed. A CID that is not pinned will disappear.

### 3.3 File validation

Before uploading to IPFS:
- Verify `Content-Type` is `application/pdf` or `application/octet-stream`.
- Verify file size ≤ `MAX_PAPER_SIZE_MB` (env var, default 50 MB).
- Compute SHA-256 of the file server-side and return it alongside the CID for the frontend to log.

### 3.4 Retrieval

The backend does **not** proxy IPFS content. Paper links go directly to an IPFS gateway. The frontend constructs `https://ipfs.io/ipfs/<cid>` (or a configurable `IPFS_GATEWAY_URL` env var) client-side. The backend only stores and returns the CID.

---

## 4. Cardano / Blockfrost Integration

### 4.1 SDK configuration

```typescript
import { BlockFrostAPI } from '@blockfrost/blockfrost-js'

const blockfrost = new BlockFrostAPI({
  projectId: process.env.BLOCKFROST_PROJECT_ID,  // must start with "preprod"
  network: 'preprod'
})
```

All Blockfrost calls are wrapped in `server/src/lib/blockfrost.ts`. No route handler calls Blockfrost directly.

### 4.2 Queries required

| Purpose | Blockfrost method | Returns |
|---|---|---|
| Health check | `blocksLatest()` | Latest block number |
| Address balance (ADA + peerA) | `addresses(address)` | `amount[]`, `stake_address` |
| Confirm paper anchor tx | `txs(txHash)` | Block height, slot |
| Confirm stake tx | `txs(txHash)` | Block height, slot |
| Address UTxOs (Increment 3+) | `addressesUtxos(address)` | UTxO list for contract state |
| Asset metadata (peerA policy) | `assetsById(unit)` | Token metadata |

### 4.3 Transaction confirmation polling

For any flow where the backend must wait for tx confirmation (paper anchoring, staking):

- Poll `blockfrost.txs(txHash)` every **10 seconds**.
- Consider confirmed at `>= 3` block depth: `latestBlock - txBlock >= 3`.
- Timeout after **20 minutes** (120 polls). Mark the indexed record as `'confirmation_timeout'` and surface this in the paper/review status.
- `[ASSUMPTION]` Use a lightweight in-process job queue (e.g., a `Map` of pending polls with `setInterval`) for Increment 2. Replace with a proper queue (BullMQ or similar, Bun-compatible) in Increment 3 when staking confirmation is added.

### 4.4 Caching

Blockfrost has rate limits (5 req/s on free tier, 500 req/s on paid). Cache the following:

| Resource | TTL | Strategy |
|---|---|---|
| `addresses(address)` | 30 seconds | In-memory LRU, keyed by address |
| `blocksLatest()` | 20 seconds | Single shared value |
| `txs(txHash)` confirmed | Indefinite | Once confirmed, cache forever |
| `txs(txHash)` pending | Do not cache | Must re-poll |

Use an in-memory LRU cache (hand-rolled `Map` with TTL — no external cache dependency for Increments 1–3; revisit for scale).

### 4.5 Error handling

Blockfrost errors must be logged with full context (address/txHash, error code, timestamp) and never swallowed silently. Map Blockfrost HTTP codes to API responses:

| Blockfrost error | API response |
|---|---|
| 404 Not Found | `404` with `"Address or resource not found on chain"` |
| 402 / 429 Rate limit | `503` with `"Blockchain indexer temporarily unavailable"` |
| 5xx | `502` with `"Blockchain indexer error"` |
| Network timeout | `504` with `"Blockchain indexer timeout"` |

---

## 5. Off-chain Indexing

The backend must maintain a local data store for state that cannot be efficiently reconstructed from Blockfrost on every request. The paper list, review texts, and view counts all fall into this category.

Use SQLite (via Bun's native `bun:sqlite`) for Increments 2–3. No ORM — raw SQL. Migrate to Postgres if concurrent write load demands it.

### 5.1 Papers

```sql
CREATE TABLE papers (
  cid          TEXT PRIMARY KEY,         -- IPFS CIDv1
  title        TEXT NOT NULL,
  abstract     TEXT NOT NULL,
  authors      TEXT NOT NULL,            -- JSON array of addresses
  tags         TEXT NOT NULL,            -- JSON array of strings
  review_mode  TEXT NOT NULL,            -- 'open' | 'blind'
  status       TEXT NOT NULL DEFAULT 'Awaiting Review',
  anchor_tx    TEXT,                     -- Cardano tx hash (null until confirmed)
  anchored_at  TEXT,                     -- ISO 8601 timestamp from tx
  views        INTEGER NOT NULL DEFAULT 0,
  citations    INTEGER NOT NULL DEFAULT 0,
  reward_pool  REAL NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL             -- ISO 8601, record insertion time
);
```

### 5.2 Reviews

```sql
CREATE TABLE reviews (
  id                  TEXT PRIMARY KEY,  -- UUID
  paper_cid           TEXT NOT NULL REFERENCES papers(cid),
  reviewer_address    TEXT NOT NULL,
  text                TEXT NOT NULL,
  stake_tx            TEXT NOT NULL,     -- tx hash proving peerA was staked
  reward_earned       REAL NOT NULL DEFAULT 0,
  helpful_votes       INTEGER NOT NULL DEFAULT 0,
  is_slashed          INTEGER NOT NULL DEFAULT 0,  -- boolean
  created_at          TEXT NOT NULL
);

CREATE UNIQUE INDEX reviews_paper_reviewer
  ON reviews(paper_cid, reviewer_address);  -- one review per paper per reviewer
```

### 5.3 Nonces (auth)

```sql
CREATE TABLE auth_nonces (
  address    TEXT NOT NULL,
  nonce      TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (address, nonce)
);
```

---

## 6. Authentication & Authorization

### 6.1 Approach: stateless nonce + CIP-30 signature

The backend never issues session cookies or JWTs. Authentication is per-request via a signed nonce:

1. Client calls `GET /api/auth/nonce?address=<addr>` and receives a nonce string.
2. Client passes the nonce to the CIP-30 wallet's `signData(address, nonce)` method.
3. Client includes `{ walletAddress, nonce, signature }` in every write request body.
4. Backend verifies the signature using the Cardano address and nonce.
5. Nonce is marked used immediately after first verification. Replay attacks are blocked.

### 6.2 Signature verification

Use `@meshsdk/core`'s `verifySignature` (already a project dependency) or a standalone Cardano crypto library. The signing payload must match exactly what the wallet signed — typically the nonce as a hex-encoded UTF-8 string.

Verification logic lives in `server/src/lib/auth.ts`. A middleware in `server/src/middleware/auth.ts` wraps all wallet-authenticated routes.

### 6.3 Endpoint access matrix

| Endpoint | Auth |
|---|---|
| `GET /api/health` | Public |
| `GET /api/wallet/:address` | Public |
| `GET /api/papers` | Public |
| `GET /api/papers/:cid` | Public |
| `GET /api/papers/:cid/reviews` | Public |
| `GET /api/auth/nonce` | Public |
| `POST /api/papers` | Wallet signature |
| `POST /api/papers/:cid/confirm` | Wallet signature, must match original submitter |
| `POST /api/papers/:cid/reviews` | Wallet signature |
| `POST /api/reviews/:id/vote` | Wallet signature |

---

## 7. Non-Functional Requirements

### 7.1 Rate limits

Implement in `server/src/middleware/rateLimit.ts` using an in-memory token bucket.

| Endpoint group | Limit |
|---|---|
| All `GET` endpoints | 60 req/min per IP |
| `POST /api/papers` (file upload) | 5 req/min per wallet address |
| `GET /api/auth/nonce` | 10 req/min per IP |
| All other `POST` endpoints | 20 req/min per wallet address |

Rate limit exceeded: `429 Too Many Requests` with `{ success: false, error: "Rate limit exceeded" }`.

### 7.2 Response time targets

| Endpoint | P95 target |
|---|---|
| `GET /api/health` | < 300 ms |
| `GET /api/wallet/:address` (cache hit) | < 100 ms |
| `GET /api/wallet/:address` (cache miss) | < 1500 ms |
| `GET /api/papers` | < 200 ms |
| `GET /api/papers/:cid` | < 150 ms |
| `POST /api/papers` (IPFS upload) | < 30 s |

### 7.3 Error response format

All error responses use the existing envelope:

```typescript
{
  success: false,
  error: string    // human-readable, safe to display in UI
}
```

Never include stack traces or internal Blockfrost error details in error responses returned to the client. Log them server-side with full context.

### 7.4 Environment variables

| Variable | Required | Notes |
|---|---|---|
| `BLOCKFROST_PROJECT_ID` | Yes | Must begin with `preprod` in dev |
| `PORT` | No | Default `3000` |
| `NODE_ENV` | No | `development` \| `production` |
| `PINATA_JWT` | Increment 2 | Pinata API JWT for IPFS pinning |
| `IPFS_PROVIDER` | Increment 2 | `'pinata'` (only supported value) |
| `IPFS_GATEWAY_URL` | No | Default `https://ipfs.io/ipfs` |
| `MAX_PAPER_SIZE_MB` | No | Default `50` |
| `PEERA_POLICY_ID` | Increment 3 | Cardano native token policy ID for peerA |
| `DATABASE_PATH` | Increment 2 | Path to SQLite file; default `./data/apeer.db` |

Document all of these in `server/.env.example`. Never commit actual values.

### 7.5 CORS

Current config allows `http://localhost:5173` (Vite dev server). Add `ALLOWED_ORIGIN` env var for production deployment — do not hardcode the production domain.

---

## 8. Out of Scope for the Backend

The following must not be implemented in the backend layer regardless of how tempting it appears:

| Item | Why it belongs elsewhere |
|---|---|
| Transaction building (e.g. constructing CBOR tx bodies) | Frontend responsibility via Mesh.js |
| Transaction signing | User's CIP-30 wallet |
| Transaction submission to Cardano | Frontend submits directly, or optionally via Blockfrost `/tx/submit` endpoint called from the client |
| Smart contract logic: slashing conditions, staking rules | Aiken validators |
| peerA token minting policy | Aiken minting validator |
| IPFS content serving / gateway | IPFS network; gateway URL is client-side |
| PDF rendering or annotation | Out of scope for v1 entirely |
| Email or push notifications | Out of scope for v1 entirely |
| Institutional accounts / SSO | Out of scope for v1 entirely |
| Any Ethereum, Solana, or EVM logic | Cardano only |
| In-browser wallet key management | User's wallet extension |
| Dispute system (filing, jury voting, slash-on-dispute) | Post-v1 |
| DAO Governance and Treasury | Post-v1 |
| Reputation Score aggregation | Post-v1 |

---

## Confirmed Decisions

All design decisions for Increment 2 are resolved as of 2026-05-08.

| # | Decision | Resolution |
|---|---|---|
| 1 | Pinning provider strategy | Pinata only |
| 2 | Off-chain data store | SQLite via `bun:sqlite`; no ORM; raw SQL |
| 3 | `views` counter | Incremented server-side on each `GET /api/papers/:cid` |
| 4 | Nonce expiry window | 5 minutes |
| 5 | Max PDF upload size | 50 MB |
| 6 | peerA policy ID (not yet deployed) | Placeholder policy ID in `.env.example` for dev testing; **must be replaced with real policy ID before mainnet** |