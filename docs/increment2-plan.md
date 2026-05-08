# Increment 2 — Implementation Plan

**Date:** 2026-05-08
**Scope source:** `BackendSRS.md` v1.1 + `CLAUDE.md`
**Increment goal:** Paper submission end-to-end (frontend form → backend pin to IPFS → CID returned → frontend builds/signs CIP-25 anchor tx → backend records tx hash and polls confirmation) plus the auth/nonce primitives, off-chain index, and supporting middleware that everything in Increment 3 will also depend on.

---

## Dependency decisions — locked 2026-05-08

1. **CIP-30 signature verification:** `@meshsdk/core` `checkSignature` (already a project dep — no new package).
2. **Pinata access:** raw `fetch` against `https://api.pinata.cloud/pinning/pinFileToIPFS` with `PINATA_JWT`. No SDK.
3. **Multipart parsing:** Hono's built-in `c.req.parseBody()`. PDFs up to 50 MB buffered in memory for Increment 2; revisit streaming for production.
4. **UUIDs / nonces:** `crypto.randomUUID()` (Web Crypto, built into Bun).
5. **Tx confirmation polling:** in-process `Map` + `setInterval` per SRS §4.3; replace with a real queue in Increment 3.

No new dependencies added in this increment.

---

## File-by-file plan, in implementation order

Files are grouped into phases. Within each phase, order matters (later files import earlier ones). Phases 1–6 are backend; Phase 7 is frontend; Phase 8 is verification.

### Phase 1 — Foundation: env, types, DB

1. **`server/.env.example`** *(create)* — Template documenting every var from SRS §7.4 (`BLOCKFROST_PROJECT_ID`, `PORT`, `NODE_ENV`, `PINATA_JWT`, `IPFS_PROVIDER`, `IPFS_GATEWAY_URL`, `MAX_PAPER_SIZE_MB`, `DATABASE_PATH`, `PEERA_POLICY_ID`, `ALLOWED_ORIGIN`). Include the placeholder `PEERA_POLICY_ID` warning verbatim from CLAUDE.md.
2. [SKIP. THIS IS ALREADY DONE] **`server/.env`** *(modify)* — Append the Increment-2 vars (`PINATA_JWT=` empty, `IPFS_PROVIDER=pinata`, `IPFS_GATEWAY_URL=https://ipfs.io/ipfs`, `MAX_PAPER_SIZE_MB=50`, `DATABASE_PATH=./data/apeer.db`). User fills in `PINATA_JWT`.
3. **`.gitignore`** *(modify)* — Ensure `server/.env`, `server/data/`, and `*.db` / `*.db-journal` are ignored.
4. **`server/src/lib/env.ts`** *(create)* — Single source for typed env access (`config.pinataJwt`, `config.maxPaperSizeMb`, etc.); throws at startup if a required var is missing in `production`, warns in `development`.
5. **`server/src/types/index.ts`** *(create)* — Shared backend types: `PaperRow`, `ReviewRow`, `NonceRow`, `ApiSuccess<T>`, `ApiError`, `PaperStatus`, `ReviewMode`, `Cip25Metadata`, `SubmitPaperBody`, `ConfirmPaperBody`. Mirrors `client/src/types.ts` shapes where they cross the wire.
6. **`server/src/lib/db.ts`** *(create)* — Wraps `bun:sqlite`; opens DB at `config.databasePath`, runs `CREATE TABLE IF NOT EXISTS` for `papers`, `reviews`, `auth_nonces` per SRS §5; sets `PRAGMA journal_mode=WAL`; exports prepared-statement helpers and a `migrate()` called once at boot. Idempotent.

### Phase 2 — Auth & nonce

7. **`server/src/lib/nonces.ts`** *(create)* — `issueNonce(address)` inserts a row with `expiresAt = now + 5min`; `consumeNonce(address, nonce)` checks not-expired & not-used, marks used in a single transaction. Periodically purges expired rows (cheap `DELETE` on each issue).
8. **`server/src/lib/auth.ts`** *(create)* — `verifyCip30Signature({ address, nonce, signature, key }): Promise<boolean>`. Uses Mesh.js `checkSignature` (decision A above). Constant-time comparison; logs failures with address + reason.
9. **`server/src/routes/auth.ts`** *(create)* — `GET /api/auth/nonce?address=…`; validates address format (`addr…` or `stake…`); returns `{ nonce, expiresAt }`. Subject to its own rate limit (10/min/IP, see Phase 5).
10. **`server/src/middleware/auth.ts`** *(create)* — `walletAuth()` middleware: extracts `walletAddress`/`nonce`/`signature`/`key` from JSON body or multipart fields; calls `consumeNonce` then `verifyCip30Signature`; on success attaches `c.set('walletAddress', addr)`; on failure 401. Used by every wallet-authenticated route.

### Phase 3 — IPFS

11. **`server/src/lib/sha256.ts`** *(create — tiny, ~10 lines)* — `sha256Hex(buffer)` via Web Crypto. Used to log file hashes alongside CIDs.
12. **`server/src/lib/pinata.ts`** *(create)* — `pinFileToIPFS({ filename, buffer, metadata }): Promise<{ cid, pinned }>`. POSTs `multipart/form-data` to `https://api.pinata.cloud/pinning/pinFileToIPFS` with `Authorization: Bearer ${PINATA_JWT}`. Implements SRS §3.2 retry policy (2 retries, 2 s backoff, only on 5xx; hard-fail on 4xx). Returns CIDv1.

### Phase 4 — Papers data + write paths

13. **`server/src/lib/papers.ts`** *(create)* — DB access layer: `insertPaper(row)`, `setAnchorTx(cid, txHash, anchoredAt)`, `setPaperStatus(cid, status)`, `getPaperByCid(cid)`, `incrementViews(cid)`, `listPapers({ page, limit, tag, author, status, sort, q })`. All raw prepared SQL (no ORM, per CLAUDE.md/SRS).
14. **`server/src/lib/cip25.ts`** *(create)* — `buildPaperMetadata({ cid, title, abstract, authors, tags, reviewMode })` returns the CIP-25 `{ "721": { [policyId]: { [assetName]: {...} } } }` envelope shaped per SRS §2.3 `metadataForTx`. `policyId` = `config.peeraPolicyId`. `assetName` derived from CID (UTF-8, asset name length-clamped to 32 bytes per Cardano rules).
15. **`server/src/lib/txConfirmation.ts`** *(create)* — In-process polling job manager. `track(txHash, { onConfirm, onTimeout })` registers a 10 s `setInterval` per tx; checks `blockfrost.txs(txHash)` and `blocksLatest()`; resolves at depth ≥ 3, times out at 120 polls (20 min). Stores active jobs in a `Map` keyed by `txHash`. On boot, re-hydrates jobs for any DB rows in `pending_confirmation` status.
16. **`server/src/routes/papers.ts`** *(replace stub)* — Four handlers:
    - `GET /` — calls `listPapers`, returns `{ papers, total, page, limit }` shaped per SRS §2.3.
    - `GET /:cid` — calls `getPaperByCid`, calls `incrementViews`, returns `Paper` (with empty `reviews: []` for now — Increment 3 fills it).
    - `POST /` (`walletAuth`) — parses multipart, validates `Content-Type`/size, computes SHA-256, calls `pinFileToIPFS`, inserts paper row with `status='pending_anchor'`, returns `{ cid, pinned, sha256, metadataForTx }` (SRS §2.3 + the `sha256` from §3.3).
    - `POST /:cid/confirm` (`walletAuth`) — verifies signer matches original submitter address (re-check against `papers.authors[0]`), updates row with `txHash` + `status='pending_confirmation'`, calls `txConfirmation.track(...)` whose `onConfirm` flips status to `'Awaiting Review'` and writes `anchored_at`. Returns SRS §2.3 confirm response.

### Phase 5 — Cross-cutting middleware

17. **`server/src/lib/cache.ts`** *(create)* — Generic TTL `Map` cache (`get`, `setWithTtl`, `getOrCompute`). 50 lines.
18. **`server/src/lib/blockfrost.ts`** *(modify)* — Add cached wrappers (`getAddress`, `getBlocksLatest`, `getTx`) per SRS §4.4 TTLs. Add error mapping helper that converts Blockfrost HTTP codes to the SRS §4.5 API responses (404 / 503 / 502 / 504). Existing `checkBlockfrostHealth` stays as-is.
19. **`server/src/routes/wallet.ts`** *(modify, small)* — Switch to the cached `getAddress` wrapper from `lib/blockfrost.ts`; surface mapped errors. No behaviour change to the response shape.
20. **`server/src/middleware/rateLimit.ts`** *(create)* — In-memory token-bucket factory with named buckets per SRS §7.1 (GET-60/min/IP, POST-papers-5/min/wallet, nonce-10/min/IP, other-POST-20/min/wallet). Returns `429` per SRS §7.1.
21. **`server/src/index.ts`** *(modify)* — Wire new routes (`/api/auth`), wire rate-limit buckets, run `db.migrate()` at boot, kick off `txConfirmation.rehydrate()`, read `ALLOWED_ORIGIN` env for CORS in non-dev.

### Phase 6 — Frontend types + API client

22. **`client/src/types.ts`** *(modify)* — Add `NonceResponse`, `SubmitPaperResponse` (`cid`, `pinned`, `sha256`, `metadataForTx`), `MetadataForTx`, `ConfirmPaperResponse`. Add `'pending_anchor' | 'pending_confirmation' | 'confirmation_timeout'` to `Paper.status` (or keep separate as `Paper.confirmationStatus` — see open call-out at end).
23. **`client/src/lib/api.ts`** *(modify)* — Replace existing `submitPaper` (currently JSON, not multipart) with:
    - `getNonce(address)` → `GET /auth/nonce`
    - `submitPaper(formData: FormData)` → `POST /papers` (multipart; no JSON content-type)
    - `confirmPaper(cid, body)` → `POST /papers/:cid/confirm`
    - `getPaper(cid)` → `GET /papers/:cid`
    - Update `papers(...)` to handle the new envelope `{ papers, total, page, limit }`.
24. **`client/src/lib/cip30.ts`** *(create)* — Thin wrapper around Mesh.js `BrowserWallet.signData(address, payload)`; returns `{ signature, key }` ready to attach to API bodies. Centralised so every signing call has identical payload encoding (UTF-8 nonce → hex).
25. **`client/src/lib/mintAnchorTx.ts`** *(create)* — Builds and submits the CIP-25 anchoring tx using Mesh.js: takes `metadataForTx` from the backend, mints a 1-of-1 NFT under the user's policy (placeholder per CLAUDE.md until real `PEERA_POLICY_ID`), attaches metadata, signs, submits, returns `txHash`. Isolated so SubmitPage stays UI-only.
26. **`client/src/hooks/useSubmitPaper.ts`** *(create)* — State machine hook: `idle → pinning → awaitingMetadataSign → uploading → awaitingTxSign → broadcasting → confirming → done | error`. Orchestrates: `getNonce` → `signData` → `submitPaper(FormData)` → `mintAnchorTx` → `confirmPaper`. Exposes `{ state, progress, error, cid, txHash, submit(form) }`.

### Phase 7 — Frontend UI

27. **`client/src/pages/SubmitPage.tsx`** *(modify)* — Replace mocked timers and hardcoded values:
    - Step 1: real `<input type="file" accept="application/pdf">` with drop handler; client-side validate `≤ MAX_PAPER_SIZE_MB`.
    - Step 2: title / abstract / tags / authors are real controlled inputs in component state. Tags become a chip input (existing UI shape). Default `authors = [connectedAddress]`, editable.
    - Step 3: replaces fake "Submit to Cardano" with `useSubmitPaper().submit(...)`. Status text reflects the hook's state machine. On `done`, shows real `cid` and `txHash`. Surfaces `error` inline rather than the success modal.
    - Remove the fake `setInterval` upload progress and the hardcoded `d5f8…e2a9` / `QmXoyp…5n2K`.
    - Block submit if no wallet connected (existing `useWallet` hook).
28. **`client/src/hooks/usePapers.ts`** *(modify, small)* — Adapt to new list envelope `{ papers, total, page, limit }`. Keep call signature stable for `DiscoverPage`.

### Phase 8 — Verification

29. **`server/src/lib/__tests__/nonces.test.ts`** *(create)* — `bun test`: issue → consume happy path; reject expired; reject reused; reject mismatched address.
30. **`server/src/lib/__tests__/auth.test.ts`** *(create)* — Verify a known-good CIP-30 signature fixture (Mesh.js round-trip in the test); reject tampered signature; reject wrong address.
31. **`server/src/lib/__tests__/papers.test.ts`** *(create)* — `listPapers` filter / sort / pagination round-trips against an in-memory DB.
32. **`docs/qa-checklist.md`** *(modify)* — Append an "Increment 2" section: nonce issue, sign, upload PDF (≤ 50 MB), CID returned + pinned in Pinata UI, tx anchored on Preprod, status flips to `Awaiting Review` after 3 blocks, paper visible in `GET /papers` and `GET /papers/:cid`, view counter increments, wrong-address signature rejected, oversized PDF rejected, Pinata 5xx triggers retry.

---

## Resolved design decisions — locked 2026-05-08

- **`Paper.status` shape:** split. Public `status` stays `Reviewed | Under Review | Awaiting Review` per the existing client type. New internal column `confirmation_status` (`pending_anchor | pending_confirmation | confirmed | confirmation_timeout`) drives Discover visibility. Both fields surfaced in API responses; frontend can choose to hide papers where `confirmation_status !== 'confirmed'`.
- **Confirm-endpoint authz:** signer must equal `authors[0]` (the original submitter). Stricter check; co-authors cannot confirm on behalf of the primary author.

---

## Out of scope for Increment 2 (deferred per CLAUDE.md)

- Reviews routes (`/api/papers/:cid/reviews`, `/api/reviews/:id/vote`) — Increment 3.
- Aiken contracts, peerA staking, slashing — Increment 3.
- Citations counter (`citations` stays at 0; needs cross-paper reference parsing — Increment 3+).
- Real `PEERA_POLICY_ID` — placeholder only until token deploy.
- Production CORS allowlist beyond reading `ALLOWED_ORIGIN` env.
