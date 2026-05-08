// ── Domain enums ──────────────────────────────────────────────────────────────

export type PaperStatus = 'Reviewed' | 'Under Review' | 'Awaiting Review'
export type ConfirmationStatus =
  | 'pending_anchor'
  | 'pending_confirmation'
  | 'confirmed'
  | 'confirmation_timeout'
export type ReviewMode = 'Open' | 'Blind'

// ── DB row shapes ─────────────────────────────────────────────────────────────
// authors and tags are stored as JSON strings in SQLite

export interface PaperRow {
  cid: string
  title: string
  abstract: string
  authors: string[]        // wallet addresses (parsed from JSON in DB)
  tags: string[]           // tag strings (parsed from JSON in DB)
  review_mode: ReviewMode
  status: PaperStatus
  confirmation_status: ConfirmationStatus
  tx_hash: string | null
  anchored_at: number | null
  submitted_at: number     // Unix ms
  views: number
  sha256: string
}

export interface ReviewRow {
  id: string
  paper_cid: string
  reviewer_address: string
  text: string
  reward_earned: number
  helpful_votes: number
  is_slashed: number       // 0 | 1
  created_at: number       // Unix ms
}

export interface NonceRow {
  address: string
  nonce: string
  expires_at: number       // Unix ms
  used: number             // 0 | 1
}

// ── API envelope ──────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  error: string
}

// ── CIP-25 on-chain metadata ──────────────────────────────────────────────────

// Cardano metadata strings > 64 bytes are represented as string[]
type MetaStr = string | string[]

export interface Cip25AssetMetadata {
  name: MetaStr
  description: MetaStr
  authors: MetaStr[]
  tags: MetaStr[]
  review_mode: ReviewMode
  ipfs_cid: MetaStr
  version: string
}

export interface Cip25Metadata {
  '721': {
    [policyId: string]: {
      [assetName: string]: Cip25AssetMetadata
    }
  }
}

// ── Request body shapes ───────────────────────────────────────────────────────

export interface SubmitPaperBody {
  title: string
  abstract: string
  authors: string[]
  tags: string[]
  reviewMode: ReviewMode
  walletAddress: string
  nonce: string
  signature: string
  key: string
}

export interface ConfirmPaperBody {
  txHash: string
  walletAddress: string
  nonce: string
  signature: string
  key: string
}

// ── Hono app context ──────────────────────────────────────────────────────────

export type HonoAppEnv = {
  Variables: {
    walletAddress: string
    rawBody: Record<string, string | File>
  }
}
