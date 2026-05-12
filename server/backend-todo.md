# Backend TODO List

This file captures the remaining backend work for the APeer backend, aligned to the current SRS and repo structure.

## Setup

- [x] Verify `server/.env.example` includes all required env vars: `BLOCKFROST_PROJECT_ID`, `PORT`, `NODE_ENV`, `PINATA_JWT`, `IPFS_PROVIDER`, `IPFS_GATEWAY_URL`, `MAX_PAPER_SIZE_MB`, `DATABASE_PATH`, `PEERA_POLICY_ID`, `ALLOWED_ORIGIN`
- [x] Confirm `server/src/lib/env.ts` reads required values correctly and warns/fails in production for missing vars
- [x] Ensure `server/src/index.ts` loads middleware, routes, and error handling consistently

## Authentication & Wallet Signing

- [x] Implement CIP-30 wallet signature verification in `server/src/lib/auth.ts`
- [x] Add nonce generation and storage in `server/src/lib/nonces.ts`
- [x] Expose `GET /api/auth/nonce` and protect write endpoints with wallet auth middleware in `server/src/routes/auth.ts`
- [x] Verify `POST /api/papers/:cid/confirm` requires a wallet signature and validates address ownership

## Paper Submission Flow

- [x] Implement `POST /api/papers` in `server/src/routes/papers.ts`
- [x] Validate incoming paper upload metadata and enforce file size limit via `MAX_PAPER_SIZE_MB`
- [x] Upload files to IPFS and pin using `server/src/lib/pinata.ts`
- [x] Compute SHA-256 of uploaded PDF in `server/src/lib/sha256.ts`
- [x] Store paper data in DB with status `pending_anchor`
- [x] Return `cid`, `pinned`, `sha256`, and `metadataForTx` to the frontend

## Metadata & CIP-25

- [x] Implement `server/src/lib/cip25.ts` to build paper metadata as CIP-25 payload
- [x] Use `config.peeraPolicyId` for `policyId` and derive `assetName` safely from CID
- [x] Ensure strings greater than 64 bytes are chunked per Cardano metadata rules
- [x] Confirm `metadataForTx.metadata['721']` matches the backend SRS shape

## Paper Confirmation & Indexing

- [x] Implement `POST /api/papers/:cid/confirm` in `server/src/routes/papers.ts`
- [x] Validate transaction hash and wallet ownership before updating paper state
- [x] Mark paper confirmation status and persist chain anchor data
- [x] Support `GET /api/papers` and `GET /api/papers/:cid` with the correct paper model

## Wallet / Balance Endpoint

- [x] Implement `GET /api/wallet/:address` in `server/src/routes/wallet.ts`
- [x] Use Blockfrost to return ADA balance, peerA balance, and stake address
- [x] Validate address format for `addr` or `stake`

## Database & Models

- [x] Define shared backend types in `server/src/types/index.ts`
- [x] Create DB access helpers in `server/src/lib/db.ts`
- [ ] Add paper row fields for mint lifecycle: `mint_eligible_at`, `mint_amount`, `mint_status`, `mint_tx_hash`
- [x] Ensure DB persistence works with `DATABASE_PATH` and file-based SQLite storage

## Error handling & logging

- [x] Standardize API responses as `{ success: boolean, data?: T, error?: string }`
- [x] Log Blockfrost and Pinata errors with context in `server/src/lib/blockfrost.ts` and `server/src/lib/pinata.ts`
- [x] Avoid swallowing server errors silently

## Increment 3: Mint Eligibility & Rewards

- [ ] Extend `POST /api/papers/:cid/confirm` response to include `eligibleForMint`, `mintAmount`, `mintReason`
- [ ] Add mint eligibility decision logic at paper confirmation time
- [ ] Define deterministic rules for eligibility: confirmation depth (>=3 blocks), submitter ownership, not already rewarded
- [ ] Add mint lifecycle persistence: `mint_status` ('eligible' | 'minted' | 'failed'), `mint_amount`, `mint_tx_hash`, `mint_eligible_at`
- [ ] Enforce idempotency: prevent duplicate mint eligibility and duplicate mint confirmations
- [ ] Add `POST /api/papers/:cid/mint/confirm` endpoint to record mint result from frontend
- [ ] Add `GET /api/papers/:cid/mint-status` endpoint for frontend polling
- [ ] Add backend rule checks before eligibility: paper confirmed (>=3 blocks), submitter ownership, not already rewarded
- [ ] Return sanitized, user-safe errors for mint-eligibility failures
- [ ] Add tests for eligible/ineligible paths, replay protection, duplicate mint protection
- [ ] Update server/.env.example for policy-related vars (placeholder-safe only)

## Testing

- [x] Add unit tests for backend helpers in `server/src/lib/__tests__/*` (auth, nonces, papers tests exist)
- [ ] Add tests for mint eligibility/ineligible paths, replay protection, duplicate mint protection
- [ ] Verify endpoint behavior against the SRS requirements

## Increment 3 / Future Backend Work

- [ ] Prepare backend support for peerA staking metadata and review records
- [ ] Add review management endpoints once smart contract logic is ready
- [ ] Keep `PEERA_POLICY_ID` placeholder clearly marked until token policy is deployed
