# APeer — QA Setup & Testing Checklist
**Increment 1: Base UI & Wallet Connection**
**Owner:** QA / Docs | **Last Updated:** 2026-05-05

---

## 1. Environment Setup Verification

Run through this checklist on every new machine before any testing.

### Prerequisites
- [ ] Bun 1.1+ installed (`bun --version`)
- [ ] Git installed (`git --version`)
- [ ] Blockfrost preprod API key obtained from [blockfrost.io](https://blockfrost.io)
- [ ] At least one Cardano testnet wallet installed in browser:
  - [ ] Eternl (preferred)
  - [ ] Nami
  - [ ] Lace
  - [ ] Flint

### Repo Setup
- [ ] Cloned repo: `git clone https://github.com/YOUR_ORG/apeer.git`
- [ ] Ran bootstrap: `bash scripts/bootstrap.sh`
- [ ] `server/.env` exists (not `.env.example`)
- [ ] `BLOCKFROST_PROJECT_ID` in `.env` is set to a real preprod key (not placeholder)
- [ ] `bun install` completed with no errors

---

## 2. Backend Smoke Tests

Start the API server: `bun run dev:server`

### Health Endpoint
```bash
curl http://localhost:3000/api/health
```
- [ ] Returns HTTP 200
- [ ] `status` field is `"ok"`
- [ ] `services.blockfrost.ok` is `true`
- [ ] `services.blockfrost.latestBlock` is a positive integer
- [ ] `services.blockfrost.network` is `"preprod"`

**If `blockfrost.ok` is `false`:**
- Check `server/.env` — key must start with `preprod`
- Verify key is active at [blockfrost.io](https://blockfrost.io/dashboard)
- Log issue: `[BF-001] Blockfrost connectivity failure`

### Wallet Balance Endpoint
```bash
# Use any valid preprod address — get one from your testnet wallet
curl http://localhost:3000/api/wallet/addr_test1EXAMPLE
```
- [ ] Returns HTTP 200 or a meaningful error (not a 500 stack trace)
- [ ] Response contains `success`, `data.balance.lovelace`, `data.balance.ada`
- [ ] Address with no history returns a `note` field instead of error

### Papers Endpoint (stub check)
```bash
curl http://localhost:3000/api/papers
```
- [ ] Returns HTTP 200 with empty `data: []`
- [ ] Contains `note` explaining it's not yet implemented

---

## 3. Frontend Smoke Tests

Start the client: `bun run dev:client`

### Basic Render
- [ ] `http://localhost:5173` loads without white screen
- [ ] No console errors in browser DevTools
- [ ] Page title shows "APeer — Decentralized Academic Publishing"

### Proxy Check
- [ ] `http://localhost:5173/api/health` returns same response as direct API call
  (confirms Vite proxy to `localhost:3000` works)

---

## 4. Wallet Connection Tests (Step 3 — after Frontend Dev wires Mesh.js)

Test on each browser: **Chrome**, **Firefox**, **Brave**, **Edge**

### Wallet: Eternl
- [ ] Connect button visible and clickable
- [ ] Eternl extension prompts for permission
- [ ] After approval: wallet address displayed (truncated `addr_test1...`)
- [ ] ADA balance matches amount shown in Eternl
- [ ] Disconnect button works; UI resets to unconnected state

### Wallet: Nami
- [ ] Same flow as Eternl above

### Wallet: Lace
- [ ] Same flow as Eternl above

### Edge Cases
- [ ] No wallet installed → UI shows install prompt, not a crash
- [ ] User cancels wallet permission → UI gracefully handles rejection
- [ ] Wallet locked → appropriate error message shown

---

## 5. Cross-Browser Matrix

| Test | Chrome | Firefox | Brave | Edge |
|---|---|---|---|---|
| Page loads | | | | |
| API proxy works | | | | |
| Eternl connects | | | | |
| Nami connects | | | | |
| Balance displayed | | | | |

Fill in: ✅ Pass | ❌ Fail | ⚠️ Partial | — N/A

---

## 6. Issue Log Template

When logging a bug, include:

```
ID:         [e.g. INC1-007]
Severity:   Critical / High / Medium / Low
Component:  Frontend / Backend / Wallet / Infra
Browser:    Chrome 125 / Firefox 127 / etc.
Summary:    One-line description
Steps:
  1.
  2.
  3.
Expected:   What should have happened
Actual:     What actually happened
Screenshot: (attach if UI bug)
```

---

## 7. Known Limitations (Increment 1)

These are not bugs — they are expected gaps to be addressed in later increments:

- `GET /api/papers` always returns empty array (Increment 2)
- `GET /api/papers/:cid` returns 501 (Increment 2)
- peerA balance always shows `0` — token not yet deployed (Increment 3)
- No authentication / wallet-gated routes (Increment 2+)
- Mobile layout may be unpolished — responsive pass is in Increment 1 Step 4

---

*Update this document as each Increment 1 step completes.*

---

# Increment 2 — Paper Submission & IPFS Anchoring

**Owner:** QA / Docs | **Last Updated:** 2026-05-08

---

## Prerequisites

- [ ] `server/.env` contains a real `PINATA_JWT`
- [ ] `server/.env` contains a valid `BLOCKFROST_PROJECT_ID` (starts with `preprod`)
- [ ] Server running: `bun run dev:server`
- [ ] Client running: `bun run dev:client`
- [ ] Cardano testnet wallet installed in browser with some preprod ADA

---

## 1. Auth / Nonce Endpoint

```bash
curl "http://localhost:3000/api/auth/nonce?address=addr_test1qp3..."
```
- [ ] Returns HTTP 200 with `{ success: true, data: { nonce, expiresAt } }`
- [ ] `expiresAt` is ~5 minutes in the future
- [ ] Missing `address` param → 400
- [ ] Invalid address format (not `addr…`/`stake…`) → 400
- [ ] Rate limit: 11th request within 1 minute from same IP → 429

---

## 2. Paper Submission — Backend Smoke Tests

### POST /api/papers (submit)
- [ ] Upload a PDF ≤ 50 MB with valid auth fields → 200, `{ cid, pinned: true, sha256, metadataForTx }`
- [ ] CID appears in Pinata dashboard (Files tab)
- [ ] `metadataForTx.metadata['721']` contains the correct paper title and IPFS CID
- [ ] Wrong-address signature (mismatched nonce/address) → 401
- [ ] Oversized PDF (> 50 MB) → 400
- [ ] Missing `file` field → 400
- [ ] Non-PDF file → 400
- [ ] Reusing an already-consumed nonce → 401
- [ ] Pinata 5xx simulated (disable JWT temporarily) → error after 3 retries, not a silent fail

### POST /api/papers/:cid/confirm
- [ ] Valid txHash from a preprod transaction → 200, `confirmationStatus: 'pending_confirmation'`
- [ ] Non-submitter wallet trying to confirm → 403
- [ ] Paper already in `pending_confirmation` → 409
- [ ] Unknown CID → 404

---

## 3. Paper Index & Detail

### GET /api/papers
- [ ] Returns `{ success: true, data: { papers, total, page, limit } }`
- [ ] Empty array initially (no confirmed papers yet)
- [ ] After a paper is confirmed (≥ 3 blocks), it appears in the list
- [ ] `?tag=Cardano` filters correctly
- [ ] `?sort=views` returns most-viewed first
- [ ] `?q=keyword` searches title and abstract

### GET /api/papers/:cid
- [ ] Returns paper data with `reviews: []`
- [ ] `views` counter increments on each request
- [ ] Unknown CID → 404

---

## 4. On-Chain Confirmation Flow

- [ ] After `POST /api/papers/:cid/confirm`, the server begins polling Blockfrost every 10 s
- [ ] After ≥ 3 blocks (usually ~1 min on preprod), `confirmation_status` flips to `'confirmed'`
- [ ] Paper appears in `GET /api/papers` only after `confirmation_status = 'confirmed'`
- [ ] Server restart re-hydrates in-progress confirmation jobs

---

## 5. Frontend — SubmitPage

Start client: `bun run dev:client` → navigate to `/submit`

### Wallet gate
- [ ] No wallet connected → amber warning banner shown; submit button disabled

### Step 1 — Upload
- [ ] Clicking the drop zone opens a file picker (PDF only)
- [ ] Dragging a PDF file onto the drop zone works
- [ ] Non-PDF file → error message shown
- [ ] PDF > 50 MB → error message shown
- [ ] Valid PDF → advances to Step 2

### Step 2 — Metadata
- [ ] Title and abstract are required; Continue button disabled if either is empty
- [ ] Keyword chip input: Enter or comma adds a tag; Backspace removes last tag
- [ ] Review Mode toggle switches between Open and Double-Blind
- [ ] Authors list shows connected wallet address by default

### Step 3 — Submit
- [ ] Summary shows file name, title, and review mode
- [ ] "Submit to Cardano" button disabled when no wallet or no file
- [ ] Click Submit → two wallet prompts appear in sequence (signature, then tx)
- [ ] Progress messages update throughout the flow
- [ ] Wallet overlay appears during both signing steps
- [ ] On success: shows real CID and txHash (not hardcoded placeholders)
- [ ] On error: inline error message shown (no crash)

---

## 6. Unit Tests

```bash
bun test --cwd server
```

- [ ] `nonces.test.ts`: all 4 cases pass (happy path, expired, reused, wrong address)
- [ ] `auth.test.ts`: all 3 rejection cases pass without throwing
- [ ] `papers.test.ts`: all round-trip, filter, paginate, search cases pass

---

## 7. Known Limitations (Increment 2)

- `reviews: []` always returned — review routes come in Increment 3
- `citations`, `rewardPool` always 0 — Increment 3+
- `PEERA_POLICY_ID` is a placeholder — no actual NFT minted until Increment 3
- Tx confirmation polling uses an in-process Map — will be replaced with a proper queue in Increment 3
- PDF body is buffered in memory up to 50 MB — streaming upload for production is deferred
