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
